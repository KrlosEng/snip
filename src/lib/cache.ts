import "server-only";
import { get, run } from "./db";
import { sha256 } from "./ids";

/**
 * Caché de slugs para que la redirección no toque la base de datos.
 * Usa Upstash Redis (REST) si hay credenciales; si no, un mapa en memoria.
 */

export type CachedLink = {
  id: string;
  url: string;
  active: boolean;
  expiresAt: number | null;
  startsAt?: number | null;
  maxClicks?: number | null;
  /** Tiene contraseña (el hash nunca se guarda en caché). */
  protected?: boolean;
};

const TTL_SECONDS = 300;
const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;
const useRedis = Boolean(url && token);

const g = globalThis as unknown as { __snipCache?: Map<string, { v: CachedLink | null; exp: number }> };
const mem = (g.__snipCache ??= new Map());

async function redis(cmd: (string | number)[]): Promise<unknown> {
  const res = await fetch(url!, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Redis ${res.status}`);
  return ((await res.json()) as { result: unknown }).result;
}

/** undefined = no está en caché; null = sabemos que no existe. */
export async function cacheGet(slug: string): Promise<CachedLink | null | undefined> {
  if (useRedis) {
    try {
      const raw = (await redis(["GET", `slug:${slug}`])) as string | null;
      if (raw === null) return undefined;
      return JSON.parse(raw) as CachedLink | null;
    } catch {
      return undefined;
    }
  }
  const hit = mem.get(slug);
  if (!hit) return undefined;
  if (hit.exp < Date.now()) {
    mem.delete(slug);
    return undefined;
  }
  return hit.v;
}

export async function cacheSet(slug: string, value: CachedLink | null): Promise<void> {
  const ttl = value ? TTL_SECONDS : 30;
  if (useRedis) {
    try {
      await redis(["SET", `slug:${slug}`, JSON.stringify(value), "EX", ttl]);
    } catch {
      /* la caché nunca debe romper la redirección */
    }
    return;
  }
  if (mem.size > 5000) mem.clear();
  mem.set(slug, { v: value, exp: Date.now() + ttl * 1000 });
}

export async function cacheDelete(...slugs: string[]): Promise<void> {
  if (useRedis) {
    try {
      await redis(["DEL", ...slugs.map((s) => `slug:${s}`)]);
    } catch {
      /* noop */
    }
    return;
  }
  for (const s of slugs) mem.delete(s);
}

export const cacheBackend = useRedis ? "redis" : "memory";

/* ---------- Límite de uso (ventana fija) ---------- */
/*
 * En Vercel hay muchas instancias que se reinician, así que un contador en
 * memoria casi no frena a nadie. Sin Redis, el contador vive en la base de
 * datos, compartida por todas. La clave se guarda como hash: nunca la IP.
 */

export async function rateLimit(key: string, limit: number, windowSec = 3600): Promise<{ ok: boolean; remaining: number; resetIn: number }> {
  if (useRedis) {
    try {
      const k = `rl:${key}`;
      const n = Number(await redis(["INCR", k]));
      if (n === 1) await redis(["EXPIRE", k, windowSec]);
      const ttl = Number(await redis(["TTL", k]));
      return { ok: n <= limit, remaining: Math.max(0, limit - n), resetIn: ttl };
    } catch {
      return { ok: true, remaining: limit, resetIn: windowSec };
    }
  }
  try {
    const now = Date.now();
    const cutoff = now - windowSec * 1000;
    // Un solo INSERT … ON CONFLICT atómico: suma 1, o reinicia si la ventana ya pasó.
    const row = await get<{ count: number; window_start: number }>(
      `INSERT INTO rate_limits (key, window_start, count) VALUES (?, ?, 1)
       ON CONFLICT (key) DO UPDATE SET
         count = CASE WHEN rate_limits.window_start < ? THEN 1 ELSE rate_limits.count + 1 END,
         window_start = CASE WHEN rate_limits.window_start < ? THEN ? ELSE rate_limits.window_start END
       RETURNING count, window_start`,
      sha256(key), now, cutoff, cutoff, now,
    );
    if (Math.random() < 0.02) void run("DELETE FROM rate_limits WHERE window_start < ?", now - 2 * 86_400_000).catch(() => {});
    const n = Number(row?.count ?? 1);
    const resetIn = Math.max(1, Math.ceil((Number(row?.window_start ?? now) + windowSec * 1000 - now) / 1000));
    return { ok: n <= limit, remaining: Math.max(0, limit - n), resetIn };
  } catch (e) {
    // Si la base falla, se deja pasar (mejor que bloquear a todos), pero queda registrado.
    console.error("rateLimit: no se pudo consultar el límite", e);
    return { ok: true, remaining: limit, resetIn: windowSec };
  }
}

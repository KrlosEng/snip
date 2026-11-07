import "server-only";

/**
 * Caché de slugs para que la redirección no toque la base de datos.
 * Usa Upstash Redis (REST) si hay credenciales; si no, un mapa en memoria.
 */

export type CachedLink = {
  id: string;
  url: string;
  active: boolean;
  expiresAt: number | null;
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

/* ---------- Límite de uso (ventana fija por hora) ---------- */

const rl = ((globalThis as unknown as { __snipRl?: Map<string, { n: number; reset: number }> }).__snipRl ??= new Map());
(globalThis as unknown as { __snipRl?: typeof rl }).__snipRl = rl;

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
  const now = Date.now();
  const cur = rl.get(key);
  if (!cur || cur.reset < now) {
    rl.set(key, { n: 1, reset: now + windowSec * 1000 });
    return { ok: true, remaining: limit - 1, resetIn: windowSec };
  }
  cur.n++;
  return { ok: cur.n <= limit, remaining: Math.max(0, limit - cur.n), resetIn: Math.ceil((cur.reset - now) / 1000) };
}

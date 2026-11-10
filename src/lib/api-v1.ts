import "server-only";
import { NextResponse } from "next/server";
import { userForKey } from "./api-keys";
import { rateLimit } from "./cache";
import type { UserRow } from "./db";
import type { LinkDTO } from "./links";

/**
 * Utilidades de la API pública (v1): autenticación con clave, límite de uso
 * por clave y un formato de respuesta estable { data } / { error }.
 */

export const V1_LIMIT = 120; // peticiones por minuto y por clave

export function v1error(status: number, code: string, message: string, field?: string, headers?: HeadersInit) {
  return NextResponse.json({ error: { code, message, ...(field ? { field } : {}) } }, { status, headers });
}

export function v1json(data: unknown, status = 200, headers?: HeadersInit) {
  return NextResponse.json({ data }, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

export type V1Ctx = { user: UserRow; keyId: string; headers: Record<string, string> };

/** Valida "Authorization: Bearer snip_…" y aplica el límite de uso. Devuelve el contexto o la respuesta de error. */
export async function v1Auth(req: Request): Promise<V1Ctx | NextResponse> {
  const auth = req.headers.get("authorization") ?? "";
  const m = auth.match(/^Bearer\s+(\S+)$/i);
  if (!m) return v1error(401, "missing_key", "Falta la clave. Envía el encabezado Authorization: Bearer <tu clave>.", undefined, { "WWW-Authenticate": "Bearer" });
  const found = await userForKey(m[1]);
  if (!found) return v1error(401, "invalid_key", "La clave no es válida o fue revocada.", undefined, { "WWW-Authenticate": "Bearer" });
  const limit = await rateLimit(`api:${found.keyId}`, V1_LIMIT, 60);
  const headers = {
    "X-RateLimit-Limit": String(V1_LIMIT),
    "X-RateLimit-Remaining": String(limit.remaining),
    "X-RateLimit-Reset": String(limit.resetIn),
  };
  if (!limit.ok) {
    return v1error(429, "rate_limited", `Llegaste al límite de ${V1_LIMIT} peticiones por minuto. Espera ${limit.resetIn} s.`, undefined, {
      ...headers,
      "Retry-After": String(limit.resetIn),
    });
  }
  return { user: found.user, keyId: found.keyId, headers };
}

const iso = (ms: number | null) => (ms ? new Date(ms).toISOString() : null);

/** Forma pública y estable de un enlace (fechas en ISO 8601, sin datos internos). */
export function linkOut(l: LinkDTO, origin: string) {
  return {
    id: l.id,
    slug: l.slug,
    short_url: `${origin}/${l.slug}`,
    url: l.url,
    title: l.title,
    status: l.status,
    is_active: l.isActive,
    clicks: l.clicks,
    folder: l.folder,
    tags: l.tags,
    password_protected: l.protected,
    starts_at: iso(l.startsAt),
    expires_at: iso(l.expiresAt),
    max_clicks: l.maxClicks,
    notify_at: l.notifyAt,
    created_at: iso(l.createdAt),
    updated_at: iso(l.updatedAt),
  };
}

/**
 * La API recibe nombres en snake_case (estándar en APIs REST); internamente
 * el formulario usa camelCase. Esto traduce la entrada pública al formato interno.
 */
export function fromPublicInput(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object" || Array.isArray(body)) return {};
  const b = body as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  if ("url" in b) out.url = b.url;
  if ("alias" in b) out.alias = b.alias;
  if ("slug" in b && !("alias" in b)) out.alias = b.slug;
  if ("title" in b) out.title = b.title;
  if ("folder" in b) out.folder = b.folder;
  if ("tags" in b) out.tags = b.tags;
  if ("is_active" in b) out.isActive = b.is_active;
  if ("expires_at" in b) out.expiresAt = b.expires_at;
  const access: Record<string, unknown> = {};
  if ("password" in b) access.password = b.password;
  if ("starts_at" in b) access.startsAt = b.starts_at;
  if ("max_clicks" in b) access.maxClicks = b.max_clicks;
  if ("notify_at" in b) access.notifyAt = b.notify_at;
  if (Object.keys(access).length) out.access = access;
  return out;
}

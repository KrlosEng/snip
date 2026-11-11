import "server-only";
import { all, get, run, type UserRow } from "./db";
import { randomToken, sha256, uuid } from "./ids";
import { planOf, PLANS } from "./plans";

/**
 * Claves de la API pública. La clave completa se muestra una sola vez al
 * crearla; en la base solo queda su hash (sha256) y un prefijo para que la
 * persona la reconozca en la lista.
 */

/** Máximo absoluto (plan Pro); el de cada persona depende de su plan. */
export const MAX_KEYS = 5;
const PREFIX = "snip_";

export type ApiKeyDTO = { id: string; name: string; prefix: string; createdAt: number; lastUsedAt: number | null };

export function looksLikeKey(v: string): boolean {
  return v.startsWith(PREFIX) && v.length >= 30 && v.length <= 80 && /^[A-Za-z0-9_-]+$/.test(v);
}

export async function listKeys(userId: string): Promise<ApiKeyDTO[]> {
  const rows = await all<{ id: string; name: string; prefix: string; created_at: number; last_used_at: number | null }>(
    "SELECT id, name, prefix, created_at, last_used_at FROM api_keys WHERE user_id = ? AND revoked_at IS NULL ORDER BY created_at DESC",
    userId,
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    prefix: r.prefix,
    createdAt: Number(r.created_at),
    lastUsedAt: r.last_used_at == null ? null : Number(r.last_used_at),
  }));
}

export type CreateKeyResult = { ok: true; key: string; item: ApiKeyDTO } | { ok: false; error: string };

export async function createKey(userId: string, nameRaw: string): Promise<CreateKeyResult> {
  const name = nameRaw.trim().replace(/\s+/g, " ").slice(0, 40);
  if (!name) return { ok: false, error: "Ponle un nombre a la clave para reconocerla." };
  const active = Number((await get<{ n: number }>("SELECT CAST(COUNT(*) AS INTEGER) AS n FROM api_keys WHERE user_id = ? AND revoked_at IS NULL", userId))?.n ?? 0);
  const plan = await planOf(userId);
  if (active >= plan.limits.apiKeys) {
    return {
      ok: false,
      error:
        plan.id === "free"
          ? `Tu plan Gratis incluye ${plan.limits.apiKeys} clave activa. Revócala para crear otra, o pásate a Pro para tener hasta ${PLANS.pro.limits.apiKeys}.`
          : `Puedes tener hasta ${plan.limits.apiKeys} claves activas. Revoca una para crear otra.`,
    };
  }
  const key = `${PREFIX}${randomToken(32)}`;
  const item: ApiKeyDTO = { id: uuid(), name, prefix: `${key.slice(0, 9)}…${key.slice(-4)}`, createdAt: Date.now(), lastUsedAt: null };
  await run(
    "INSERT INTO api_keys (id, user_id, name, prefix, key_hash, created_at, last_used_at, revoked_at) VALUES (?, ?, ?, ?, ?, ?, NULL, NULL)",
    item.id, userId, item.name, item.prefix, sha256(key), item.createdAt,
  );
  return { ok: true, key, item };
}

/** Revoca una clave propia. Devuelve false si no existe o ya estaba revocada. */
export async function revokeKey(userId: string, id: string): Promise<boolean> {
  const r = await get<{ id: string }>("UPDATE api_keys SET revoked_at = ? WHERE id = ? AND user_id = ? AND revoked_at IS NULL RETURNING id", Date.now(), id, userId);
  return Boolean(r);
}

/** Busca el usuario dueño de una clave activa y anota su último uso (como mucho cada minuto). */
export async function userForKey(key: string): Promise<{ user: UserRow; keyId: string } | null> {
  if (!looksLikeKey(key)) return null;
  const row = await get<UserRow & { key_id: string; last_used_at: number | null }>(
    `SELECT u.*, k.id AS key_id, k.last_used_at FROM api_keys k JOIN users u ON u.id = k.user_id
     WHERE k.key_hash = ? AND k.revoked_at IS NULL`,
    sha256(key),
  );
  if (!row) return null;
  const now = Date.now();
  if (!row.last_used_at || now - Number(row.last_used_at) > 60_000) {
    await run("UPDATE api_keys SET last_used_at = ? WHERE id = ?", now, row.key_id);
  }
  return { user: row, keyId: row.key_id };
}

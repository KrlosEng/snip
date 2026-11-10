import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Controles de acceso de un enlace: activación programada, vencimiento por
 * fecha o por número de clics, pausa y contraseña. Sin base de datos, para
 * poder probarlo directo.
 */

export type Gate = {
  active: boolean;
  expiresAt: number | null;
  startsAt: number | null;
  maxClicks: number | null;
};

export type Blocked = "scheduled" | "expired" | "limit" | "paused";

/** Motivo por el que el enlace no redirige ahora mismo, o null si puede pasar. */
export function blockedReason(g: Gate, clicks: number, now = Date.now()): Blocked | null {
  if (g.expiresAt && g.expiresAt <= now) return "expired";
  if (g.maxClicks && clicks >= g.maxClicks) return "limit";
  if (g.startsAt && g.startsAt > now) return "scheduled";
  if (!g.active) return "paused";
  return null;
}

/* ---------- Contraseña ---------- */

const SECRET = process.env.UNLOCK_SECRET || process.env.IP_HASH_SALT || "snip-dev-secret";
export const UNLOCK_HOURS = 12;

export const unlockCookie = (linkId: string) => `snip_u_${linkId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 32)}`;

/**
 * Token del desbloqueo: depende del enlace y del hash de su contraseña, así que
 * si el dueño cambia la contraseña, todos los desbloqueos anteriores dejan de valer.
 */
export function unlockToken(linkId: string, passwordHash: string): string {
  return createHmac("sha256", SECRET).update(`${linkId}:${passwordHash}`).digest("base64url");
}

export function isUnlocked(cookieValue: string | undefined, linkId: string, passwordHash: string): boolean {
  if (!cookieValue) return false;
  const a = Buffer.from(cookieValue);
  const b = Buffer.from(unlockToken(linkId, passwordHash));
  return a.length === b.length && timingSafeEqual(a, b);
}

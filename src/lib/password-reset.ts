import "server-only";
import { get, run, type UserRow } from "./db";
import { hashPassword, randomToken, sha256 } from "./ids";
import { resetEmail, sendMail } from "./mailer";
import { rateLimit } from "./cache";
import { DEMO_EMAIL } from "./seed";

/**
 * Recuperación de contraseña con un enlace de un solo uso.
 * - El token es aleatorio (32 bytes) y solo se guarda su hash.
 * - Vence en 30 minutos y se invalida al usarse o al pedir otro.
 * - La respuesta es siempre la misma, exista o no la cuenta (no revela correos).
 * - Al cambiar la contraseña se cierran todas las sesiones abiertas.
 */

export const RESET_TTL_MS = 30 * 60_000;

export async function requestPasswordReset(emailRaw: string, origin: string, ip: string): Promise<void> {
  const email = emailRaw.trim().toLowerCase();
  const byIp = await rateLimit(`reset:ip:${ip}`, 10, 3600);
  const byEmail = await rateLimit(`reset:email:${email}`, 3, 3600);
  if (!byIp.ok || !byEmail.ok) return;
  if (!email || email === DEMO_EMAIL) return;

  const user = await get<Pick<UserRow, "id" | "email">>("SELECT id, email FROM users WHERE email = ?", email);
  if (!user) return;

  await run("DELETE FROM password_resets WHERE user_id = ?", user.id);
  const token = randomToken(32);
  const now = Date.now();
  await run(
    "INSERT INTO password_resets (token_hash, user_id, expires_at, used_at, created_at) VALUES (?, ?, ?, NULL, ?)",
    sha256(token), user.id, now + RESET_TTL_MS, now,
  );
  const link = `${origin}/reset?token=${encodeURIComponent(token)}`;
  const when = new Intl.DateTimeFormat("es-MX", { dateStyle: "long", timeStyle: "short", timeZone: "America/Mexico_City" }).format(new Date());
  await sendMail({ to: user.email, ...resetEmail({ link, when }) });
}

export type ResetResult = { ok: true; userId: string } | { ok: false; error: string };

export async function completePasswordReset(token: string, password: string): Promise<ResetResult> {
  if (password.length < 8) return { ok: false, error: "La contraseña necesita al menos 8 caracteres." };
  if (password.length > 200) return { ok: false, error: "La contraseña es demasiado larga." };
  const expired = { ok: false as const, error: "El enlace venció o ya se usó. Pide uno nuevo." };
  const row = await get<{ user_id: string; expires_at: number; used_at: number | null }>(
    "SELECT user_id, expires_at, used_at FROM password_resets WHERE token_hash = ?",
    sha256(token),
  );
  if (!row || row.used_at !== null || Number(row.expires_at) < Date.now()) return expired;
  // Se marca usado antes de cambiar nada: si dos peticiones llegan a la vez, solo una gana.
  const claimed = await get<{ user_id: string }>(
    "UPDATE password_resets SET used_at = ? WHERE token_hash = ? AND used_at IS NULL RETURNING user_id",
    Date.now(), sha256(token),
  );
  if (!claimed) return expired;

  await run("UPDATE users SET password_hash = ? WHERE id = ?", hashPassword(password), claimed.user_id);
  await run("DELETE FROM sessions WHERE user_id = ?", claimed.user_id);
  await run("DELETE FROM password_resets WHERE user_id = ? AND used_at IS NULL", claimed.user_id);
  return { ok: true, userId: claimed.user_id };
}

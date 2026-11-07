import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { get, run, type UserRow } from "./db";
import { createSession } from "./auth";
import { randomToken, sha256, uuid } from "./ids";
import { codeEmail, mailerConfigured, sendMail } from "./mailer";
import { parseUa } from "./clicks";
import { rateLimit } from "./cache";
import { DEMO_EMAIL } from "./seed";

/**
 * Verificación de dispositivo nuevo: si alguien entra desde un navegador
 * que no está marcado como "de confianza" para esa cuenta, se envía un
 * código de 6 dígitos al correo y la sesión solo se crea al escribirlo.
 */

export const DEVICE_COOKIE = "snip_device";
export const CHALLENGE_COOKIE = "snip_challenge";
export const DELETE_COOKIE = "snip_delete";
const CODE_TTL = 10 * 60_000;
const MAX_ATTEMPTS = 5;

/** En producción solo se exige si hay un servicio de correo configurado (para no dejar a nadie fuera). */
export function verificationEnabled(): boolean {
  return mailerConfigured() || process.env.NODE_ENV !== "production";
}

export function deviceLabel(h: Headers): string {
  const { browser, os } = parseUa(h.get("user-agent") ?? "");
  if (browser === "Otro" && os === "Otro") return "un navegador desconocido";
  return `${browser} en ${os}`;
}

const secure = process.env.NODE_ENV === "production";

export async function isTrustedDevice(userId: string): Promise<boolean> {
  const token = (await cookies()).get(DEVICE_COOKIE)?.value;
  if (!token) return false;
  return Boolean(await get("SELECT 1 AS x FROM trusted_devices WHERE token_hash = ? AND user_id = ?", sha256(token), userId));
}

export async function trustDevice(userId: string, label: string): Promise<void> {
  const jar = await cookies();
  let token = jar.get(DEVICE_COOKIE)?.value;
  if (!token) {
    token = randomToken();
    jar.set(DEVICE_COOKIE, token, { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: 60 * 60 * 24 * 365 });
  }
  const hash = sha256(token);
  if (!(await get("SELECT 1 AS x FROM trusted_devices WHERE token_hash = ? AND user_id = ?", hash, userId))) {
    await run("INSERT INTO trusted_devices (token_hash, user_id, label, created_at) VALUES (?, ?, ?, ?)", hash, userId, label, Date.now());
  }
}

function codeHash(id: string, code: string) {
  return sha256(`${id}:${code}`);
}

export function maskEmail(email: string): string {
  const [u, d] = email.split("@");
  return `${u.slice(0, 2)}${"•".repeat(Math.max(1, Math.min(6, u.length - 2)))}@${d}`;
}

/** Crea un código, lo envía por correo y devuelve el id del reto. */
export async function startChallenge(
  user: Pick<UserRow, "id" | "email">,
  purpose: "login" | "delete",
  device: string,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const limit = await rateLimit(`code:${user.id}`, 6, 900);
  if (!limit.ok) return { ok: false, error: "Pediste muchos códigos. Espera unos minutos e intenta de nuevo." };

  await run("DELETE FROM challenges WHERE user_id = ? AND purpose = ?", user.id, purpose);
  const id = uuid();
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  await run(
    "INSERT INTO challenges (id, user_id, purpose, code_hash, attempts, expires_at, created_at) VALUES (?, ?, ?, ?, 0, ?, ?)",
    id, user.id, purpose, codeHash(id, code), Date.now() + CODE_TTL, Date.now(),
  );
  const when = new Intl.DateTimeFormat("es-MX", { dateStyle: "long", timeStyle: "short", timeZone: "America/Mexico_City" }).format(new Date());
  const sent = await sendMail({ to: user.email, ...codeEmail({ code, purpose, device, when }) });
  if (!sent) return { ok: false, error: "No pudimos enviar el código a tu correo. Intenta de nuevo en un momento." };
  return { ok: true, id };
}

/** Comprueba un código. Devuelve el id de usuario si es correcto. */
export async function checkChallenge(
  id: string | undefined,
  code: string,
  purpose: "login" | "delete",
): Promise<{ ok: true; userId: string } | { ok: false; error: string; expired?: boolean }> {
  if (!id) return { ok: false, error: "El código venció. Vuelve a iniciar sesión.", expired: true };
  const row = await get<{ user_id: string; code_hash: string; attempts: number; expires_at: number; purpose: string }>(
    "SELECT user_id, code_hash, attempts, expires_at, purpose FROM challenges WHERE id = ?",
    id,
  );
  if (!row || row.purpose !== purpose || Number(row.expires_at) < Date.now()) {
    return { ok: false, error: "El código venció. Pide uno nuevo.", expired: true };
  }
  if (Number(row.attempts) >= MAX_ATTEMPTS) {
    await run("DELETE FROM challenges WHERE id = ?", id);
    return { ok: false, error: "Demasiados intentos. Pide un código nuevo.", expired: true };
  }
  const expected = Buffer.from(row.code_hash);
  const actual = Buffer.from(codeHash(id, code.replace(/\D/g, "")));
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
    await run("UPDATE challenges SET attempts = attempts + 1 WHERE id = ?", id);
    const left = MAX_ATTEMPTS - Number(row.attempts) - 1;
    return { ok: false, error: left > 0 ? `Código incorrecto. Te quedan ${left} ${left === 1 ? "intento" : "intentos"}.` : "Código incorrecto." };
  }
  await run("DELETE FROM challenges WHERE id = ?", id);
  return { ok: true, userId: row.user_id };
}

/**
 * Paso final de cualquier inicio de sesión (contraseña u OAuth): si el
 * dispositivo no es de confianza, envía el código; si lo es, crea la sesión.
 */
export async function completeLogin(
  user: Pick<UserRow, "id" | "email">,
  h: Headers,
): Promise<{ verify: false } | { verify: true; email: string } | { error: string }> {
  if (user.email === DEMO_EMAIL || !verificationEnabled() || (await isTrustedDevice(user.id))) {
    await createSession(user.id);
    return { verify: false };
  }
  const ch = await startChallenge(user, "login", deviceLabel(h));
  if (!ch.ok) return { error: ch.error };
  (await cookies()).set(CHALLENGE_COOKIE, ch.id, { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: CODE_TTL / 1000 });
  return { verify: true, email: maskEmail(user.email) };
}

import crypto from "node:crypto";

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/** Slug aleatorio base62 (7 caracteres ≈ 3,5 billones de combinaciones). */
export function randomSlug(length = 7): string {
  const bytes = crypto.randomBytes(length * 2);
  let out = "";
  for (let i = 0; i < bytes.length && out.length < length; i++) {
    // Rechazo de 248..255 para evitar sesgo de módulo.
    if (bytes[i] < 248) out += BASE62[bytes[i] % 62];
  }
  return out.length === length ? out : randomSlug(length);
}

export const uuid = () => crypto.randomUUID();

export function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export function verifyPassword(password: string, stored: string | null): boolean {
  if (!stored) return false;
  const [scheme, saltB64, hashB64] = stored.split("$");
  if (scheme !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64");
  const actual = crypto.scryptSync(password, Buffer.from(saltB64, "base64"), expected.length, {
    N: 16384,
    r: 8,
    p: 1,
  });
  return crypto.timingSafeEqual(expected, actual);
}

/** Hash de IP con sal: cuenta visitantes únicos sin guardar la IP. */
export function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT ?? "snip-dev-salt-cambiar-en-produccion";
  return sha256(`${salt}:${ip}`).slice(0, 32);
}

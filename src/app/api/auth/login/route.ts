import { z } from "zod";
import { get, type UserRow } from "@/lib/db";
import { completeLogin } from "@/lib/verify";
import { verifyPassword } from "@/lib/ids";
import { clientIp, fail, json } from "@/lib/http";
import { rateLimit } from "@/lib/cache";

const schema = z.object({
  email: z.string().trim().toLowerCase().min(1, "Escribe tu correo."),
  password: z.string().min(1, "Escribe tu contraseña."),
});

export async function POST(req: Request) {
  const limit = await rateLimit(`login:${clientIp(req.headers)}`, 20, 900);
  if (!limit.ok) return fail(429, "Demasiados intentos. Espera unos minutos.");
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail(400, parsed.error.issues[0].message, { field: parsed.error.issues[0].path[0] });
  const user = await get<UserRow>("SELECT * FROM users WHERE email = ?", parsed.data.email);
  if (!user || !verifyPassword(parsed.data.password, user.password_hash)) {
    return fail(401, user && !user.password_hash ? "Esta cuenta no tiene contraseña: entra con Google, Apple o GitHub." : "Correo o contraseña incorrectos.");
  }
  const result = await completeLogin(user, req.headers);
  if ("error" in result) return fail(503, result.error);
  return json({ ok: true, ...result });
}

import { z } from "zod";
import { get, run } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { deviceLabel, trustDevice } from "@/lib/verify";
import { hashPassword, uuid } from "@/lib/ids";
import { clientIp, fail, json } from "@/lib/http";
import { rateLimit } from "@/lib/cache";

const schema = z.object({
  name: z.string().trim().min(1, "Escribe tu nombre.").max(80),
  email: z.string().trim().toLowerCase().email("Ese correo no parece válido."),
  password: z.string().min(8, "La contraseña necesita al menos 8 caracteres.").max(200),
  timezone: z.string().optional(),
});

export async function POST(req: Request) {
  const limit = await rateLimit(`register:${clientIp(req.headers)}`, 10);
  if (!limit.ok) return fail(429, "Demasiados intentos. Espera unos minutos.");
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail(400, parsed.error.issues[0].message, { field: parsed.error.issues[0].path[0] });
  const { name, email, password } = parsed.data;
  let tz = parsed.data.timezone || "America/Mexico_City";
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
  } catch {
    tz = "America/Mexico_City";
  }
  if (await get("SELECT 1 AS x FROM users WHERE email = ?", email)) {
    return fail(409, "Ya hay una cuenta con ese correo. Inicia sesión.", { field: "email" });
  }
  const id = uuid();
  await run("INSERT INTO users (id, email, name, password_hash, timezone, created_at) VALUES (?, ?, ?, ?, ?, ?)", id, email, name, hashPassword(password), tz, Date.now());
  await trustDevice(id, deviceLabel(req.headers));
  await createSession(id);
  return json({ ok: true }, 201);
}

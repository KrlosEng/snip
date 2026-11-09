import { z } from "zod";
import { cookies } from "next/headers";
import { get, run } from "@/lib/db";
import { verifyPassword } from "@/lib/ids";
import { rateLimit } from "@/lib/cache";
import { DELETE_COOKIE, checkChallenge, verificationEnabled } from "@/lib/verify";
import { destroySession } from "@/lib/auth";
import { apiUser, demoReadOnly, fail, json } from "@/lib/http";
import { DEMO_EMAIL } from "@/lib/seed";

const schema = z.object({
  name: z.string().trim().min(1, "Escribe tu nombre.").max(80).optional(),
  timezone: z.string().optional(),
});

export async function GET() {
  const user = await apiUser();
  if (user instanceof Response) return user;
  return json({ user });
}

export async function PATCH(req: Request) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const blocked = demoReadOnly(user);
  if (blocked) return blocked;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail(400, parsed.error.issues[0].message, { field: parsed.error.issues[0].path[0] });
  const { name, timezone } = parsed.data;
  if (timezone) {
    try {
      new Intl.DateTimeFormat("en", { timeZone: timezone });
    } catch {
      return fail(400, "Zona horaria no reconocida.", { field: "timezone" });
    }
  }
  await run("UPDATE users SET name = COALESCE(?, name), timezone = COALESCE(?, timezone) WHERE id = ?", name ?? null, timezone ?? null, user.id);
  return json({ ok: true });
}

const deleteSchema = z.object({ password: z.string().optional(), code: z.string().optional(), confirmEmail: z.string().optional() });

export async function DELETE(req: Request) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  if (user.email === DEMO_EMAIL) return fail(403, "La cuenta demo no se puede borrar. Crea tu propia cuenta para probarlo.");
  const limit = await rateLimit(`delete:${user.id}`, 8, 900);
  if (!limit.ok) return fail(429, "Demasiados intentos. Espera unos minutos.");
  const body = deleteSchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return fail(400, "Solicitud no válida.");
  const { password, code, confirmEmail } = body.data;

  if (user.hasPassword) {
    const row = await get<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = ?", user.id);
    if (!password) return fail(400, "Escribe tu contraseña para confirmar.", { field: "password" });
    if (!verifyPassword(password, row?.password_hash ?? null)) return fail(401, "La contraseña no es correcta.", { field: "password" });
  } else if (verificationEnabled()) {
    const jar = await cookies();
    if (!code) return fail(400, "Escribe el código que te enviamos por correo.", { field: "code" });
    const res = await checkChallenge(jar.get(DELETE_COOKIE)?.value, code, "delete");
    if (!res.ok || res.userId !== user.id) return fail(400, res.ok ? "Código no válido." : res.error, { field: "code" });
    jar.delete(DELETE_COOKIE);
  } else if ((confirmEmail ?? "").trim().toLowerCase() !== user.email) {
    return fail(400, "Escribe tu correo exactamente para confirmar.", { field: "confirmEmail" });
  }

  await destroySession();
  await run("DELETE FROM users WHERE id = ?", user.id);
  return json({ ok: true });
}

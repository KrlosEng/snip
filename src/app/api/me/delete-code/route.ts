import { cookies } from "next/headers";
import { apiUser, fail, json } from "@/lib/http";
import { DELETE_COOKIE, deviceLabel, maskEmail, startChallenge } from "@/lib/verify";



/** Envía un código al correo para confirmar el borrado (cuentas sin contraseña). */
export async function POST(req: Request) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const ch = await startChallenge(user, "delete", deviceLabel(req.headers));
  if (!ch.ok) return fail(429, ch.error);
  (await cookies()).set(DELETE_COOKIE, ch.id, { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 600 });
  return json({ ok: true, email: maskEmail(user.email) });
}

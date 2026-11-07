import { cookies } from "next/headers";
import { get, type UserRow } from "@/lib/db";
import { fail, json } from "@/lib/http";
import { CHALLENGE_COOKIE, deviceLabel, startChallenge } from "@/lib/verify";

export async function POST(req: Request) {
  const jar = await cookies();
  const id = jar.get(CHALLENGE_COOKIE)?.value;
  const row = id
    ? await get<Pick<UserRow, "id" | "email">>("SELECT u.id, u.email FROM challenges c JOIN users u ON u.id = c.user_id WHERE c.id = ? AND c.purpose = 'login'", id)
    : undefined;
  if (!row) return fail(400, "El código venció. Vuelve a iniciar sesión.", { expired: true });
  const ch = await startChallenge(row, "login", deviceLabel(req.headers));
  if (!ch.ok) return fail(429, ch.error);
  jar.set(CHALLENGE_COOKIE, ch.id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 600 });
  return json({ ok: true });
}

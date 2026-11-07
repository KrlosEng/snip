import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { all, get, run, type UserRow } from "./db";
import { randomToken, sha256 } from "./ids";

export const SESSION_COOKIE = "snip_session";
const SESSION_DAYS = 30;

export type PublicUser = Pick<UserRow, "id" | "email" | "name" | "timezone" | "created_at"> & {
  hasPassword: boolean;
};

function toPublic(u: UserRow): PublicUser {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    timezone: u.timezone,
    created_at: Number(u.created_at),
    hasPassword: Boolean(u.password_hash),
  };
}

export async function createSession(userId: string): Promise<void> {
  const token = randomToken();
  const expires = Date.now() + SESSION_DAYS * 86_400_000;
  await run("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)", sha256(token), userId, expires);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expires),
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await run("DELETE FROM sessions WHERE id = ?", sha256(token));
  jar.delete(SESSION_COOKIE);
}

export async function getUser(): Promise<PublicUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const row = await get<UserRow>(
    `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.id = ? AND s.expires_at > ?`,
    sha256(token),
    Date.now(),
  );
  return row ? toPublic(row) : null;
}

/** Para páginas: manda a /login si no hay sesión. */
export async function requireUser(): Promise<PublicUser> {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}


export async function linkedProviders(userId: string): Promise<string[]> {
  return (await all<{ provider: string }>("SELECT provider FROM accounts WHERE user_id = ? ORDER BY provider", userId)).map((r) => r.provider);
}

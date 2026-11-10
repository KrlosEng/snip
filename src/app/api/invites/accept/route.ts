import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUser, clientIp, demoReadOnly, fail } from "@/lib/http";
import { rateLimit } from "@/lib/cache";
import { acceptInvite, WS_COOKIE } from "@/lib/workspaces";

/** Acepta una invitación con la cuenta abierta y entra al equipo. */
export async function POST(req: Request) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const blocked = demoReadOnly(user);
  if (blocked) return blocked;
  const limit = await rateLimit(`invite-accept:${clientIp(req.headers)}`, 20, 900);
  if (!limit.ok) return fail(429, "Demasiados intentos. Espera unos minutos.");
  const parsed = z.object({ token: z.string().min(20).max(200) }).safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail(400, "La invitación no es válida.");
  const r = await acceptInvite(parsed.data.token, user);
  if (!r.ok) return fail(r.status ?? 400, r.error);
  const res = NextResponse.json({ ok: true, workspaceId: r.value.workspaceId });
  res.cookies.set(WS_COOKIE, r.value.workspaceId, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 365 * 86_400, secure: process.env.NODE_ENV === "production" });
  return res;
}

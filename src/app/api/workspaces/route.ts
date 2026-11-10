import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUser, demoReadOnly, fail, json } from "@/lib/http";
import { rateLimit } from "@/lib/cache";
import { createWorkspace, listMyWorkspaces, roleIn, WS_COOKIE } from "@/lib/workspaces";

const COOKIE = { httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: 365 * 86_400, secure: process.env.NODE_ENV === "production" };

export async function GET() {
  const user = await apiUser();
  if (user instanceof Response) return user;
  return json({ items: await listMyWorkspaces(user.id) });
}

/** Crea un equipo y lo deja como espacio activo. */
export async function POST(req: Request) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const blocked = demoReadOnly(user);
  if (blocked) return blocked;
  const limit = await rateLimit(`ws-create:${user.id}`, 10, 3600);
  if (!limit.ok) return fail(429, "Creaste muchos equipos en poco tiempo. Intenta en un rato.");
  const parsed = z.object({ name: z.string().max(80) }).safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail(400, "Ponle un nombre al equipo.", { field: "name" });
  const r = await createWorkspace(user.id, parsed.data.name);
  if (!r.ok) return fail(r.status ?? 400, r.error, { field: "name" });
  const res = NextResponse.json({ item: r.value }, { status: 201 });
  res.cookies.set(WS_COOKIE, r.value.id, COOKIE);
  return res;
}

/** Cambia el espacio activo: { id: null } = personal. */
export async function PUT(req: Request) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const parsed = z.object({ id: z.union([z.string().max(64), z.null()]) }).safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail(400, "Espacio no válido.");
  const id = parsed.data.id;
  if (id && !(await roleIn(user.id, id))) return fail(403, "No eres parte de ese equipo.");
  const res = NextResponse.json({ ok: true });
  if (id) res.cookies.set(WS_COOKIE, id, COOKIE);
  else res.cookies.delete(WS_COOKIE);
  return res;
}

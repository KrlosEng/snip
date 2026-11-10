import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { apiUser, demoReadOnly, fail, getOrigin, json } from "@/lib/http";
import { rateLimit } from "@/lib/cache";
import {
  cancelInvite,
  changeRole,
  deleteWorkspace,
  inviteMember,
  removeMember,
  renameWorkspace,
  roleIn,
  teamDetail,
  WS_COOKIE,
} from "@/lib/workspaces";

const role = z.enum(["editor", "viewer"]);
const action = z.discriminatedUnion("action", [
  z.object({ action: z.literal("rename"), name: z.string().max(80) }),
  z.object({ action: z.literal("invite"), email: z.string().max(200), role }),
  z.object({ action: z.literal("cancel-invite"), inviteId: z.string().max(64) }),
  z.object({ action: z.literal("role"), userId: z.string().max(64), role }),
  z.object({ action: z.literal("remove"), userId: z.string().max(64) }),
]);

/** Miembros e invitaciones pendientes (cualquier miembro puede verlos). */
export async function GET(_req: Request, ctx: RouteContext<"/api/workspaces/[id]">) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const id = (await ctx.params).id;
  if (!(await roleIn(user.id, id))) return fail(404, "No encontramos ese equipo.");
  return json(await teamDetail(id));
}

export async function PATCH(req: Request, ctx: RouteContext<"/api/workspaces/[id]">) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const blocked = demoReadOnly(user);
  if (blocked) return blocked;
  const id = (await ctx.params).id;
  const parsed = action.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail(400, "Petición no válida.");
  const a = parsed.data;
  let r: { ok: boolean; error?: string; status?: number; value?: unknown };
  switch (a.action) {
    case "rename":
      r = await renameWorkspace(id, user.id, a.name);
      break;
    case "invite": {
      const limit = await rateLimit(`invite:${user.id}`, 30, 3600);
      if (!limit.ok) return fail(429, "Enviaste muchas invitaciones en poco tiempo. Intenta en un rato.");
      r = await inviteMember(id, user.id, a.email, a.role, await getOrigin());
      break;
    }
    case "cancel-invite":
      r = await cancelInvite(id, user.id, a.inviteId);
      break;
    case "role":
      r = await changeRole(id, user.id, a.userId, a.role);
      break;
    case "remove":
      r = await removeMember(id, user.id, a.userId);
      break;
  }
  if (!r.ok) return fail(r.status ?? 400, r.error ?? "No se pudo completar.", a.action === "invite" ? { field: "email" } : undefined);
  // Si alguien se sale del equipo activo, vuelve a su espacio personal.
  if (a.action === "remove" && a.userId === user.id && (await cookies()).get(WS_COOKIE)?.value === id) {
    const res = NextResponse.json({ ok: true, value: r.value ?? null });
    res.cookies.delete(WS_COOKIE);
    return res;
  }
  return json({ ok: true, value: r.value ?? null });
}

/** Borra el equipo (solo el dueño). Los enlaces pasan a su espacio personal. */
export async function DELETE(_req: Request, ctx: RouteContext<"/api/workspaces/[id]">) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const blocked = demoReadOnly(user);
  if (blocked) return blocked;
  const id = (await ctx.params).id;
  const r = await deleteWorkspace(id, user.id);
  if (!r.ok) return fail(r.status ?? 400, r.error);
  const res = NextResponse.json({ ok: true });
  if ((await cookies()).get(WS_COOKIE)?.value === id) res.cookies.delete(WS_COOKIE);
  return res;
}

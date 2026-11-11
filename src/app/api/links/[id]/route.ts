import { apiUser, demoReadOnly, fail, json, ownHosts, READ_ONLY_ROLE } from "@/lib/http";
import { deleteLink, getOwnLink, linkDTO } from "@/lib/links";
import { updateFromInput } from "@/lib/link-create";
import { canEdit, linkRole } from "@/lib/workspaces";

export async function GET(_req: Request, ctx: RouteContext<"/api/links/[id]">) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const link = await getOwnLink(user.id, (await ctx.params).id);
  return link ? json({ link: await linkDTO(link) }) : fail(404, "No encontramos ese enlace.");
}

export async function PATCH(req: Request, ctx: RouteContext<"/api/links/[id]">) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const blocked = demoReadOnly(user);
  if (blocked) return blocked;
  const link = await getOwnLink(user.id, (await ctx.params).id);
  if (!link) return fail(404, "No encontramos ese enlace.");
  if (!canEdit(await linkRole(user.id, link))) return fail(403, READ_ONLY_ROLE);
  const r = await updateFromInput(link, await req.json().catch(() => ({})), await ownHosts(), user.id);
  if (!r.ok) return fail(r.status, r.error, r.field ? { field: r.field } : undefined);
  return json({ link: await linkDTO(r.value) });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/links/[id]">) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const blocked = demoReadOnly(user);
  if (blocked) return blocked;
  const link = await getOwnLink(user.id, (await ctx.params).id);
  if (!link) return fail(404, "No encontramos ese enlace.");
  if (!canEdit(await linkRole(user.id, link))) return fail(403, READ_ONLY_ROLE);
  await deleteLink(link);
  return json({ ok: true });
}

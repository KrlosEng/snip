import { apiUser, demoReadOnly, fail, json, ownHosts } from "@/lib/http";
import { deleteLink, getOwnLink, slugExists, toDTO, updateLink } from "@/lib/links";
import { checkDestination, parseExpiry, updateLinkSchema } from "@/lib/validation";

export async function GET(_req: Request, ctx: RouteContext<"/api/links/[id]">) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const link = await getOwnLink(user.id, (await ctx.params).id);
  return link ? json({ link: toDTO(link) }) : fail(404, "No encontramos ese enlace.");
}

export async function PATCH(req: Request, ctx: RouteContext<"/api/links/[id]">) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const blocked = demoReadOnly(user);
  if (blocked) return blocked;
  const link = await getOwnLink(user.id, (await ctx.params).id);
  if (!link) return fail(404, "No encontramos ese enlace.");

  const parsed = updateLinkSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail(400, issue.message, { field: issue.path[0] });
  }
  const p = parsed.data;
  const patch: Parameters<typeof updateLink>[1] = {};
  if (p.url !== undefined) {
    const dest = checkDestination(p.url, await ownHosts());
    if (!dest.ok) return fail(400, dest.error, { field: "url" });
    patch.url = dest.url;
  }
  if (p.alias !== undefined && p.alias !== link.slug) {
    if (await slugExists(p.alias)) return fail(409, "Ese alias ya está ocupado. Prueba otra variante.", { field: "alias" });
    patch.slug = p.alias;
  }
  if (p.expiresAt !== undefined) {
    if (p.expiresAt === null || p.expiresAt === "") {
      patch.expiresAt = null;
    } else {
      const exp = parseExpiry(p.expiresAt);
      if (!exp.ok) return fail(400, exp.error, { field: "expiresAt" });
      patch.expiresAt = exp.at;
    }
  }
  if (p.isActive !== undefined) patch.isActive = p.isActive;
  if (p.title !== undefined) patch.title = p.title?.trim() || null;
  return json({ link: toDTO(await updateLink(link, patch)) });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/links/[id]">) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const blocked = demoReadOnly(user);
  if (blocked) return blocked;
  const link = await getOwnLink(user.id, (await ctx.params).id);
  if (!link) return fail(404, "No encontramos ese enlace.");
  await deleteLink(link);
  return json({ ok: true });
}

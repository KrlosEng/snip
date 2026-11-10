import { apiUser, demoReadOnly, fail, json } from "@/lib/http";
import { revokeKey } from "@/lib/api-keys";

/** Revoca una clave: deja de funcionar al instante. */
export async function DELETE(_req: Request, ctx: RouteContext<"/api/me/keys/[id]">) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const blocked = demoReadOnly(user);
  if (blocked) return blocked;
  const ok = await revokeKey(user.id, (await ctx.params).id);
  return ok ? json({ ok: true }) : fail(404, "No encontramos esa clave.");
}

import type { NextRequest } from "next/server";
import { getOrigin, ownHosts } from "@/lib/http";
import { deleteLink, getOwnLink, linkDTO } from "@/lib/links";
import { updateFromInput } from "@/lib/link-create";
import { fromPublicInput, linkOut, v1Auth, v1error, v1json } from "@/lib/api-v1";
import { DEMO_EMAIL } from "@/lib/seed";

const notFound = (h: Record<string, string>) => v1error(404, "not_found", "No encontramos ese enlace en tu cuenta.", undefined, h);

/** GET /api/v1/links/:id */
export async function GET(req: NextRequest, rc: RouteContext<"/api/v1/links/[id]">) {
  const ctx = await v1Auth(req);
  if (ctx instanceof Response) return ctx;
  const link = await getOwnLink(ctx.user.id, (await rc.params).id);
  if (!link) return notFound(ctx.headers);
  return v1json(linkOut(await linkDTO(link), await getOrigin()), 200, ctx.headers);
}

/** PATCH /api/v1/links/:id — cambia solo los campos enviados. */
export async function PATCH(req: NextRequest, rc: RouteContext<"/api/v1/links/[id]">) {
  const ctx = await v1Auth(req);
  if (ctx instanceof Response) return ctx;
  if (ctx.user.email === DEMO_EMAIL) return v1error(403, "read_only", "La cuenta demo es de solo lectura.", undefined, ctx.headers);
  const link = await getOwnLink(ctx.user.id, (await rc.params).id);
  if (!link) return notFound(ctx.headers);
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return v1error(400, "invalid_json", "El cuerpo debe ser JSON.", undefined, ctx.headers);
  const r = await updateFromInput(link, fromPublicInput(body), await ownHosts());
  if (!r.ok) return v1error(r.status, r.status === 409 ? "conflict" : "invalid_request", r.error, r.field, ctx.headers);
  return v1json(linkOut(await linkDTO(r.value), await getOrigin()), 200, ctx.headers);
}

/** DELETE /api/v1/links/:id — borra el enlace y sus clics. */
export async function DELETE(req: NextRequest, rc: RouteContext<"/api/v1/links/[id]">) {
  const ctx = await v1Auth(req);
  if (ctx instanceof Response) return ctx;
  if (ctx.user.email === DEMO_EMAIL) return v1error(403, "read_only", "La cuenta demo es de solo lectura.", undefined, ctx.headers);
  const link = await getOwnLink(ctx.user.id, (await rc.params).id);
  if (!link) return notFound(ctx.headers);
  await deleteLink(link);
  return new Response(null, { status: 204, headers: ctx.headers });
}

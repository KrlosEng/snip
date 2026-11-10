import { after, type NextRequest } from "next/server";
import { get, type LinkRow } from "@/lib/db";
import { clientIp, getOrigin, ownHosts } from "@/lib/http";
import { fetchTitle, linkDTO, listLinks, updateLink } from "@/lib/links";
import { createFromInput } from "@/lib/link-create";
import { fromPublicInput, linkOut, v1Auth, v1error, v1json } from "@/lib/api-v1";
import { DEMO_EMAIL } from "@/lib/seed";

/** GET /api/v1/links — lista paginada con búsqueda y filtros. */
export async function GET(req: NextRequest) {
  const ctx = await v1Auth(req);
  if (ctx instanceof Response) return ctx;
  const sp = req.nextUrl.searchParams;
  const sort = sp.get("sort");
  const status = sp.get("status");
  const pageSize = Math.min(100, Math.max(1, Number(sp.get("per_page")) || 25));
  const res = await listLinks(ctx.user.id, {
    q: sp.get("q") ?? undefined,
    sort: sort === "clicks" || sort === "oldest" ? sort : "recent",
    status: status === "active" || status === "paused" || status === "expired" ? status : "all",
    page: Math.max(1, Number(sp.get("page")) || 1),
    pageSize,
    folder: sp.get("folder"),
    tag: sp.get("tag"),
  });
  const origin = await getOrigin();
  return v1json(
    { items: res.items.map((l) => linkOut(l, origin)), page: res.page, per_page: res.pageSize, total: res.total, pages: res.pages },
    200,
    ctx.headers,
  );
}

/** POST /api/v1/links — crea un enlace con las mismas reglas que la app. */
export async function POST(req: NextRequest) {
  const ctx = await v1Auth(req);
  if (ctx instanceof Response) return ctx;
  if (ctx.user.email === DEMO_EMAIL) return v1error(403, "read_only", "La cuenta demo es de solo lectura.", undefined, ctx.headers);
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return v1error(400, "invalid_json", "El cuerpo debe ser JSON, por ejemplo {\"url\": \"https://…\"}.", undefined, ctx.headers);
  const r = await createFromInput({ id: ctx.user.id }, fromPublicInput(body), clientIp(req.headers), await ownHosts());
  if (!r.ok) return v1error(r.status, r.status === 429 ? "rate_limited" : r.status === 409 ? "conflict" : "invalid_request", r.error, r.field, ctx.headers);
  const link = r.value;
  if (!link.title) {
    after(async () => {
      const title = await fetchTitle(link.destination_url);
      const fresh = title ? await get<LinkRow>("SELECT * FROM links WHERE id = ?", link.id) : null;
      if (fresh && !fresh.title) await updateLink(fresh, { title });
    });
  }
  return v1json(linkOut(await linkDTO(link), await getOrigin()), 201, ctx.headers);
}

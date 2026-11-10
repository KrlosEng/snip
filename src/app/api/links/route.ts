import { after, type NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { apiUser, clientIp, demoReadOnly, fail, json, ownHosts, READ_ONLY_ROLE, scopeOf } from "@/lib/http";
import { canEdit } from "@/lib/workspaces";
import { fetchTitle, linkDTO, listLinks, updateLink } from "@/lib/links";
import { createFromInput } from "@/lib/link-create";
import { get, type LinkRow } from "@/lib/db";

export async function GET(req: NextRequest) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const sp = req.nextUrl.searchParams;
  const sort = sp.get("sort");
  const status = sp.get("status");
  return json(
    await listLinks(await scopeOf(user.id), {
      q: sp.get("q") ?? undefined,
      sort: sort === "clicks" || sort === "oldest" ? sort : "recent",
      status: status === "active" || status === "paused" || status === "expired" ? status : "all",
      page: Number(sp.get("page")) || 1,
      folder: sp.get("folder"),
      tag: sp.get("tag"),
    }),
  );
}

export async function POST(req: Request) {
  const user = await getUser();
  const blocked = demoReadOnly(user);
  if (blocked) return blocked;
  const scope = user ? await scopeOf(user.id) : null;
  if (scope && !canEdit(scope.role)) return fail(403, READ_ONLY_ROLE);
  const created = await createFromInput(user, await req.json().catch(() => ({})), clientIp(req.headers), await ownHosts(), scope?.workspaceId ?? null);
  if (!created.ok) return fail(created.status, created.error, created.field ? { field: created.field } : undefined);
  const link = created.value;

  after(async () => {
    const title = await fetchTitle(link.destination_url);
    if (title) {
      const fresh = await get<LinkRow>("SELECT * FROM links WHERE id = ?", link.id);
      if (fresh && !fresh.title) await updateLink(fresh, { title });
    }
  });

  return json({ link: await linkDTO(link), anonymous: !user }, 201);
}

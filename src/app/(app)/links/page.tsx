import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { listFacets, listLinks } from "@/lib/links";
import { getOrigin, scopeOf } from "@/lib/http";
import { canEdit } from "@/lib/workspaces";
import { DEMO_EMAIL } from "@/lib/seed";
import { LinksView } from "./view";

export const metadata: Metadata = { title: "Mis enlaces" };

export default async function LinksPage({ searchParams }: PageProps<"/links">) {
  const user = await requireUser();
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const q = one(sp.q);
  const sortRaw = one(sp.sort);
  const statusRaw = one(sp.status);
  const sort = sortRaw === "clicks" || sortRaw === "oldest" ? sortRaw : "recent";
  const status = statusRaw === "active" || statusRaw === "paused" || statusRaw === "expired" ? statusRaw : "all";
  // "folder" ausente = todas; "folder=" (vacío) = sin carpeta.
  const folder = sp.folder === undefined ? null : one(sp.folder);
  const tag = one(sp.tag) || null;
  const page = Math.max(1, Number(one(sp.page)) || 1);
  const scope = await scopeOf(user.id);
  const [data, facets] = await Promise.all([listLinks(scope, { q, sort, status, page, folder, tag }), listFacets(scope)]);
  const filtered = Boolean(q) || status !== "all" || folder !== null || Boolean(tag);
  const hasAny = data.total > 0 || filtered ? true : (await listLinks(scope, { pageSize: 1 })).total > 0;
  return (
    <LinksView
      data={data}
      q={q}
      sort={sort}
      status={status}
      folder={folder}
      tag={tag}
      facets={facets}
      origin={await getOrigin()}
      hasAny={hasAny}
      readOnly={user.email === DEMO_EMAIL || !canEdit(scope.role)}
    />
  );
}

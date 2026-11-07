import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { listLinks } from "@/lib/links";
import { getOrigin } from "@/lib/http";
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
  const page = Math.max(1, Number(one(sp.page)) || 1);
  const data = await listLinks(user.id, { q, sort, status, page });
  const hasAny = data.total > 0 || Boolean(q) || status !== "all" ? true : (await listLinks(user.id, { pageSize: 1 })).total > 0;
  return <LinksView data={data} q={q} sort={sort} status={status} origin={await getOrigin()} hasAny={hasAny} />;
}

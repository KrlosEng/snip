import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getOwnLink, linkDTO } from "@/lib/links";
import { linkStats, readFilter, recentClicks, RANGES, type Range } from "@/lib/clicks";
import { getOrigin } from "@/lib/http";
import { DEMO_EMAIL } from "@/lib/seed";
import { planOf } from "@/lib/plans";
import { canEdit, linkRole } from "@/lib/workspaces";
import { DetailView } from "./view";

export const metadata: Metadata = { title: "Detalle del enlace" };

export default async function LinkDetailPage({ params, searchParams }: PageProps<"/links/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const link = await getOwnLink(user.id, id);
  if (!link) notFound();
  const sp = await searchParams;
  const r = sp.range;
  const plan = await planOf(user.id);
  let range: Range = typeof r === "string" && r in RANGES ? (r as Range) : "30d";
  if (RANGES[range] > plan.limits.statsDays) range = "30d";
  const filter = readFilter((k) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  });
  return (
    <DetailView
      link={await linkDTO(link)}
      stats={await linkStats(link.id, range, user.timezone, filter)}
      clicks={await recentClicks(link.id, 1)}
      origin={await getOrigin()}
      timezone={user.timezone}
      maxDays={plan.limits.statsDays}
      readOnly={user.email === DEMO_EMAIL || !canEdit(await linkRole(user.id, link))}
    />
  );
}

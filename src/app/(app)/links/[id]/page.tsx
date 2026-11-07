import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getOwnLink, toDTO } from "@/lib/links";
import { linkStats, recentClicks, RANGES, type Range } from "@/lib/clicks";
import { getOrigin } from "@/lib/http";
import { DetailView } from "./view";

export const metadata: Metadata = { title: "Detalle del enlace" };

export default async function LinkDetailPage({ params, searchParams }: PageProps<"/links/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const link = await getOwnLink(user.id, id);
  if (!link) notFound();
  const r = (await searchParams).range;
  const range: Range = typeof r === "string" && r in RANGES ? (r as Range) : "30d";
  return (
    <DetailView
      link={toDTO(link)}
      stats={await linkStats(link.id, range, user.timezone)}
      clicks={await recentClicks(link.id, 1)}
      origin={await getOrigin()}
      timezone={user.timezone}
    />
  );
}

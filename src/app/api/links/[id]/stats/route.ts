import type { NextRequest } from "next/server";
import { apiUser, fail, json } from "@/lib/http";
import { getOwnLink } from "@/lib/links";
import { linkStats, readFilter, RANGES, type Range } from "@/lib/clicks";
import { planOf } from "@/lib/plans";

export async function GET(req: NextRequest, ctx: RouteContext<"/api/links/[id]/stats">) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const link = await getOwnLink(user.id, (await ctx.params).id);
  if (!link) return fail(404, "No encontramos ese enlace.");
  const r = req.nextUrl.searchParams.get("range") ?? "30d";
  let range: Range = r in RANGES ? (r as Range) : "30d";
  if (RANGES[range] > (await planOf(user.id)).limits.statsDays) range = "30d";
  const filter = readFilter((k) => req.nextUrl.searchParams.get(k));
  return json(await linkStats(link.id, range, user.timezone, filter));
}

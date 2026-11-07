import type { NextRequest } from "next/server";
import { apiUser, fail, json } from "@/lib/http";
import { getOwnLink } from "@/lib/links";
import { linkStats, RANGES, type Range } from "@/lib/clicks";

export async function GET(req: NextRequest, ctx: RouteContext<"/api/links/[id]/stats">) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const link = await getOwnLink(user.id, (await ctx.params).id);
  if (!link) return fail(404, "No encontramos ese enlace.");
  const r = req.nextUrl.searchParams.get("range") ?? "30d";
  const range: Range = r in RANGES ? (r as Range) : "30d";
  return json(await linkStats(link.id, range, user.timezone));
}

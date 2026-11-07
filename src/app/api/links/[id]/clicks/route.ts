import type { NextRequest } from "next/server";
import { apiUser, fail, json } from "@/lib/http";
import { getOwnLink } from "@/lib/links";
import { recentClicks } from "@/lib/clicks";

export async function GET(req: NextRequest, ctx: RouteContext<"/api/links/[id]/clicks">) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const link = await getOwnLink(user.id, (await ctx.params).id);
  if (!link) return fail(404, "No encontramos ese enlace.");
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page")) || 1);
  return json(await recentClicks(link.id, page));
}

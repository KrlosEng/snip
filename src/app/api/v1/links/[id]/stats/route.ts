import type { NextRequest } from "next/server";
import { getOwnLink } from "@/lib/links";
import { linkStats, RANGES, readFilter, type Range } from "@/lib/clicks";
import { v1Auth, v1error, v1json } from "@/lib/api-v1";
import { planOf } from "@/lib/plans";

/** GET /api/v1/links/:id/stats?range=7d|30d|90d&country=MX — estadísticas sin bots. */
export async function GET(req: NextRequest, rc: RouteContext<"/api/v1/links/[id]/stats">) {
  const ctx = await v1Auth(req);
  if (ctx instanceof Response) return ctx;
  const link = await getOwnLink(ctx.user.id, (await rc.params).id);
  if (!link) return v1error(404, "not_found", "No encontramos ese enlace en tu cuenta.", undefined, ctx.headers);
  const sp = req.nextUrl.searchParams;
  const r = sp.get("range") ?? "30d";
  let range: Range = r in RANGES ? (r as Range) : "30d";
  if (RANGES[range] > (await planOf(ctx.user.id)).limits.statsDays) range = "30d";
  const s = await linkStats(link.id, range, ctx.user.timezone, readFilter((k) => sp.get(k)));
  return v1json(
    {
      range: s.range,
      timezone: ctx.user.timezone,
      filter: s.filter,
      clicks: s.total,
      clicks_previous: s.previous,
      unique_visitors: s.unique,
      unique_visitors_previous: s.previousUnique,
      bots_excluded: s.bots,
      series: s.series.map((p) => ({ date: p.date, clicks: p.clicks, previous: p.previous })),
      countries: s.countries,
      devices: s.devices,
      browsers: s.browsers,
      operating_systems: s.os,
      referrers: s.referrers,
      hours: s.hours,
      weekdays: s.weekdays,
    },
    200,
    ctx.headers,
  );
}

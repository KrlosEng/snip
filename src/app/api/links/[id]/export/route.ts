import { apiUser, fail } from "@/lib/http";
import { getOwnLink } from "@/lib/links";
import { all, type ClickRow } from "@/lib/db";
import { csvCell as esc } from "@/lib/csv";

export async function GET(_req: Request, ctx: RouteContext<"/api/links/[id]/export">) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const link = await getOwnLink(user.id, (await ctx.params).id);
  if (!link) return fail(404, "No encontramos ese enlace.");
  const rows = await all<ClickRow>("SELECT * FROM clicks WHERE link_id = ? AND is_bot = 0 ORDER BY clicked_at DESC", link.id);
  const lines = ["fecha_utc,pais,ciudad,dispositivo,navegador,sistema,referido"];
  for (const r of rows) {
    lines.push([new Date(Number(r.clicked_at)).toISOString(), r.country, r.city, r.device, r.browser, r.os, r.referrer].map(esc).join(","));
  }
  return new Response("﻿" + lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="snip-${link.slug}-clics.csv"`,
    },
  });
}

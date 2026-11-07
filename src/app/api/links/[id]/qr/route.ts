import type { NextRequest } from "next/server";
import QRCode from "qrcode";
import { apiUser, fail, getOrigin } from "@/lib/http";
import { getOwnLink } from "@/lib/links";

export async function GET(req: NextRequest, ctx: RouteContext<"/api/links/[id]/qr">) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const link = await getOwnLink(user.id, (await ctx.params).id);
  if (!link) return fail(404, "No encontramos ese enlace.");
  const target = `${await getOrigin()}/${link.slug}`;
  const format = req.nextUrl.searchParams.get("format") === "png" ? "png" : "svg";
  const opts = { margin: 2, errorCorrectionLevel: "M" as const, color: { dark: "#1b2130ff", light: "#ffffffff" } };
  const disposition = `attachment; filename="snip-${link.slug}.${format}"`;
  if (format === "png") {
    const buf = await QRCode.toBuffer(target, { ...opts, width: 1024 });
    return new Response(new Uint8Array(buf), { headers: { "Content-Type": "image/png", "Content-Disposition": disposition } });
  }
  const svg = await QRCode.toString(target, { ...opts, type: "svg" });
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Content-Disposition": disposition } });
}

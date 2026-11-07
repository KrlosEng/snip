import { after, NextResponse, type NextRequest } from "next/server";
import { cacheGet, cacheSet, type CachedLink } from "@/lib/cache";
import { get, type LinkRow } from "@/lib/db";
import { recordClick } from "@/lib/clicks";
import { clientIp } from "@/lib/http";
import { ALIAS_RE } from "@/lib/validation";
import { unavailablePage } from "./unavailable";

/**
 * Redirección: primero caché (Redis o memoria), luego base de datos.
 * Responde 302 de inmediato y registra el clic después con after().
 * Se usa 302 y no 301 para que el navegador no guarde la redirección
 * y cada visita pase por Snip (y se cuente).
 */
export async function GET(req: NextRequest, ctx: RouteContext<"/[slug]">) {
  const { slug } = await ctx.params;
  const origin = req.nextUrl.origin;

  if (!/^[a-zA-Z0-9-]{1,32}$/.test(slug)) {
    return html(unavailablePage({ origin, slug, status: 404, reason: "missing" }), 404);
  }

  let link: CachedLink | null | undefined = await cacheGet(slug);
  if (link === undefined) {
    const row = await get<Pick<LinkRow, "id" | "destination_url" | "is_active" | "expires_at">>(
      "SELECT id, destination_url, is_active, expires_at FROM links WHERE slug = ?",
      slug,
    );
    link = row
      ? { id: row.id, url: row.destination_url, active: Boolean(Number(row.is_active)), expiresAt: row.expires_at === null ? null : Number(row.expires_at) }
      : null;
    await cacheSet(slug, link);
  }

  if (!link) {
    return html(unavailablePage({ origin, slug, status: 404, reason: ALIAS_RE.test(slug) ? "missing" : "invalid" }), 404);
  }
  if (link.expiresAt && link.expiresAt <= Date.now()) {
    return html(unavailablePage({ origin, slug, status: 410, reason: "expired", expiresAt: link.expiresAt }), 410);
  }
  if (!link.active) {
    return html(unavailablePage({ origin, slug, status: 410, reason: "paused" }), 410);
  }

  const headers = new Headers(req.headers);
  const ip = clientIp(req.headers);
  const linkId = link.id;
  after(async () => {
    try {
      await recordClick(linkId, headers, ip);
    } catch (e) {
      console.error("No se pudo registrar el clic", e);
    }
  });

  return NextResponse.redirect(link.url, {
    status: 302,
    headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" },
  });
}

function html(body: string, status: number) {
  return new NextResponse(body, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  });
}

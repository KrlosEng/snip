import { after, NextResponse, type NextRequest } from "next/server";
import { cacheGet, cacheSet, rateLimit, type CachedLink } from "@/lib/cache";
import { get, type LinkRow } from "@/lib/db";
import { recordClick } from "@/lib/clicks";
import { clientIp } from "@/lib/http";
import { verifyPassword } from "@/lib/ids";
import { ALIAS_RE } from "@/lib/validation";
import { blockedReason, isUnlocked, unlockCookie, unlockToken, UNLOCK_HOURS } from "@/lib/access";
import { unavailablePage } from "./unavailable";

/**
 * Redirección: primero caché (Redis o memoria), luego base de datos.
 * Responde 302 de inmediato y registra el clic después con after().
 * Se usa 302 y no 301 para que el navegador no guarde la redirección
 * y cada visita pase por Snip (y se cuente).
 *
 * Antes de redirigir revisa los controles de acceso: activación programada,
 * vencimiento (por fecha o por número de clics), pausa y contraseña.
 */

type Row = Pick<LinkRow, "id" | "destination_url" | "is_active" | "expires_at" | "starts_at" | "max_clicks" | "password_hash">;

const n = (v: unknown) => (v === null || v === undefined ? null : Number(v));

async function loadLink(slug: string): Promise<CachedLink | null> {
  let link: CachedLink | null | undefined = await cacheGet(slug);
  if (link === undefined) {
    const row = await get<Row>("SELECT id, destination_url, is_active, expires_at, starts_at, max_clicks, password_hash FROM links WHERE slug = ?", slug);
    link = row
      ? {
          id: row.id,
          url: row.destination_url,
          active: Boolean(Number(row.is_active)),
          expiresAt: n(row.expires_at),
          startsAt: n(row.starts_at),
          maxClicks: n(row.max_clicks),
          protected: Boolean(row.password_hash),
        }
      : null;
    await cacheSet(slug, link);
  }
  return link;
}

/** Clics reales en este momento (solo se consulta si el enlace tiene límite). */
async function liveClicks(id: string): Promise<number> {
  return Number((await get<{ click_count: number }>("SELECT click_count FROM links WHERE id = ?", id))?.click_count ?? 0);
}

async function passwordHash(id: string): Promise<string | null> {
  return (await get<{ password_hash: string | null }>("SELECT password_hash FROM links WHERE id = ?", id))?.password_hash ?? null;
}

export async function GET(req: NextRequest, ctx: RouteContext<"/[slug]">) {
  const { slug } = await ctx.params;
  const origin = req.nextUrl.origin;

  if (!/^[a-zA-Z0-9-]{1,32}$/.test(slug)) {
    return html(unavailablePage({ origin, slug, status: 404, reason: "missing" }), 404);
  }

  const link = await loadLink(slug);
  if (!link) {
    return html(unavailablePage({ origin, slug, status: 404, reason: ALIAS_RE.test(slug) ? "missing" : "invalid" }), 404);
  }

  const blocked = blockedReason(
    { active: link.active, expiresAt: link.expiresAt, startsAt: link.startsAt ?? null, maxClicks: link.maxClicks ?? null },
    link.maxClicks ? await liveClicks(link.id) : 0,
  );
  if (blocked === "expired") return html(unavailablePage({ origin, slug, status: 410, reason: "expired", expiresAt: link.expiresAt ?? undefined }), 410);
  if (blocked === "limit") return html(unavailablePage({ origin, slug, status: 410, reason: "limit" }), 410);
  if (blocked === "scheduled") return html(unavailablePage({ origin, slug, status: 403, reason: "scheduled", startsAt: link.startsAt ?? undefined }), 403);
  if (blocked === "paused") return html(unavailablePage({ origin, slug, status: 410, reason: "paused" }), 410);

  if (link.protected) {
    const hash = await passwordHash(link.id);
    if (hash && !isUnlocked(req.cookies.get(unlockCookie(link.id))?.value, link.id, hash)) {
      return html(unavailablePage({ origin, slug, status: 401, reason: "locked" }), 401);
    }
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
    headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex", "Referrer-Policy": link.protected ? "no-referrer" : "strict-origin-when-cross-origin" },
  });
}

/** Formulario de contraseña: si es correcta, deja una cookie firmada por 12 h y vuelve al enlace. */
export async function POST(req: NextRequest, ctx: RouteContext<"/[slug]">) {
  const { slug } = await ctx.params;
  const origin = req.nextUrl.origin;
  const back = new URL(`/${slug}`, origin);
  if (!/^[a-zA-Z0-9-]{1,32}$/.test(slug)) return NextResponse.redirect(back, 303);

  const link = await loadLink(slug);
  const hash = link?.protected ? await passwordHash(link.id) : null;
  if (!link || !hash) return NextResponse.redirect(back, 303);

  const limit = await rateLimit(`unlock:${clientIp(req.headers)}:${link.id}`, 10, 900);
  if (!limit.ok) {
    const mins = Math.ceil(limit.resetIn / 60);
    return html(unavailablePage({ origin, slug, status: 429, reason: "locked", error: `Demasiados intentos. Espera ${mins} min y vuelve a probar.` }), 429);
  }

  const form = await req.formData().catch(() => null);
  const password = String(form?.get("password") ?? "").slice(0, 200);
  if (!password || !verifyPassword(password, hash)) {
    return html(unavailablePage({ origin, slug, status: 401, reason: "locked", error: "Esa contraseña no es correcta." }), 401);
  }

  const res = NextResponse.redirect(back, 303);
  res.cookies.set(unlockCookie(link.id), unlockToken(link.id, hash), {
    httpOnly: true,
    secure: req.nextUrl.protocol === "https:",
    sameSite: "lax",
    path: `/${slug}`,
    maxAge: UNLOCK_HOURS * 3600,
  });
  return res;
}

function html(body: string, status: number) {
  return new NextResponse(body, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  });
}

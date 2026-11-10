import { after, type NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { rateLimit } from "@/lib/cache";
import { apiUser, clientIp, demoReadOnly, fail, json, ownHosts } from "@/lib/http";
import { createLink, fetchTitle, isUnsafe, linkDTO, listLinks, slugExists, updateLink } from "@/lib/links";
import { get, type LinkRow } from "@/lib/db";
import { checkDestination, createLinkSchema, parseAccess, parseExpiry } from "@/lib/validation";
import type { AccessPatch } from "@/lib/links";

const ANON_DAYS = 7;

export async function GET(req: NextRequest) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const sp = req.nextUrl.searchParams;
  const sort = sp.get("sort");
  const status = sp.get("status");
  return json(
    await listLinks(user.id, {
      q: sp.get("q") ?? undefined,
      sort: sort === "clicks" || sort === "oldest" ? sort : "recent",
      status: status === "active" || status === "paused" || status === "expired" ? status : "all",
      page: Number(sp.get("page")) || 1,
      folder: sp.get("folder"),
      tag: sp.get("tag"),
    }),
  );
}

export async function POST(req: Request) {
  const user = await getUser();
  const blocked = demoReadOnly(user);
  if (blocked) return blocked;
  const ip = clientIp(req.headers);
  const limit = user ? await rateLimit(`links:u:${user.id}`, 100) : await rateLimit(`links:ip:${ip}`, 10);
  if (!limit.ok) {
    const mins = Math.ceil(limit.resetIn / 60);
    return fail(
      429,
      user
        ? `Llegaste al límite de 100 enlaces por hora. Intenta de nuevo en ${mins} min.`
        : `Llegaste al límite de 10 enlaces por hora sin cuenta. Crea una cuenta gratis o espera ${mins} min.`,
    );
  }

  const parsed = createLinkSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail(400, issue.message, { field: issue.path[0] });
  }
  const dest = checkDestination(parsed.data.url, await ownHosts());
  if (!dest.ok) return fail(400, dest.error, { field: "url" });

  const alias = parsed.data.alias || null;
  if (alias && !user) return fail(401, "Crea una cuenta gratis para elegir tu propio alias.", { field: "alias" });
  if (alias && (await slugExists(alias))) return fail(409, `Ese alias ya está ocupado. Prueba otra variante.`, { field: "alias" });

  let expiresAt: number | null;
  if (user) {
    const exp = parseExpiry(parsed.data.expiresAt);
    if (!exp.ok) return fail(400, exp.error, { field: "expiresAt" });
    expiresAt = exp.at;
  } else {
    expiresAt = Date.now() + ANON_DAYS * 86_400_000;
  }

  let access: AccessPatch | undefined;
  if (user && parsed.data.access) {
    const a = parseAccess(parsed.data.access, expiresAt);
    if (!a.ok) return fail(400, a.error, { field: a.field });
    access = a.patch;
  }

  if (await isUnsafe(dest.url)) return fail(422, "Google marcó ese sitio como peligroso. No podemos acortarlo.", { field: "url" });

  let link: LinkRow;
  try {
    link = await createLink({
      userId: user?.id ?? null,
      url: dest.url,
      slug: alias,
      expiresAt,
      title: user ? parsed.data.title : null,
      folder: parsed.data.folder,
      tags: parsed.data.tags,
      access,
    });
  } catch {
    return fail(409, "Ese alias acaba de ser ocupado. Prueba otro.", { field: "alias" });
  }

  after(async () => {
    const title = await fetchTitle(dest.url);
    if (title) {
      const fresh = await get<LinkRow>("SELECT * FROM links WHERE id = ?", link.id);
      if (fresh && !fresh.title) await updateLink(fresh, { title });
    }
  });

  return json({ link: await linkDTO(link), anonymous: !user }, 201);
}

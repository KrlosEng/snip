import "server-only";
import { all, get, run, type LinkRow } from "./db";
import { randomSlug, uuid } from "./ids";
import { cacheDelete } from "./cache";

export type LinkStatus = "active" | "paused" | "expired";

export type LinkDTO = {
  id: string;
  slug: string;
  url: string;
  title: string | null;
  isActive: boolean;
  status: LinkStatus;
  expiresAt: number | null;
  clicks: number;
  createdAt: number;
  updatedAt: number;
};

export function statusOf(l: Pick<LinkRow, "is_active" | "expires_at">): LinkStatus {
  if (l.expires_at && l.expires_at <= Date.now()) return "expired";
  return l.is_active ? "active" : "paused";
}

/** Postgres puede devolver números como texto; normalizamos aquí. */
export function normalize(l: LinkRow): LinkRow {
  return {
    ...l,
    is_active: Number(l.is_active),
    expires_at: l.expires_at === null ? null : Number(l.expires_at),
    click_count: Number(l.click_count),
    created_at: Number(l.created_at),
    updated_at: Number(l.updated_at),
  };
}

export function toDTO(raw: LinkRow): LinkDTO {
  const l = normalize(raw);
  return {
    id: l.id,
    slug: l.slug,
    url: l.destination_url,
    title: l.title,
    isActive: Boolean(l.is_active),
    status: statusOf(l),
    expiresAt: l.expires_at,
    clicks: l.click_count,
    createdAt: l.created_at,
    updatedAt: l.updated_at,
  };
}

export async function slugExists(slug: string): Promise<boolean> {
  return Boolean(await get("SELECT 1 AS x FROM links WHERE slug = ?", slug));
}

export async function uniqueRandomSlug(): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const s = randomSlug();
    if (!(await slugExists(s))) return s;
  }
  return randomSlug(9);
}

export async function createLink(input: {
  userId: string | null;
  url: string;
  slug?: string | null;
  expiresAt: number | null;
}): Promise<LinkRow> {
  const now = Date.now();
  const row: LinkRow = {
    id: uuid(),
    user_id: input.userId,
    slug: input.slug || (await uniqueRandomSlug()),
    destination_url: input.url,
    title: null,
    is_active: 1,
    expires_at: input.expiresAt,
    click_count: 0,
    created_at: now,
    updated_at: now,
  };
  await run(
    `INSERT INTO links (id, user_id, slug, destination_url, title, is_active, expires_at, click_count, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    row.id, row.user_id, row.slug, row.destination_url, row.title, row.is_active, row.expires_at, 0, now, now,
  );
  return row;
}

/** Siempre filtra por user_id: nadie ve enlaces ajenos cambiando el id. */
export async function getOwnLink(userId: string, id: string): Promise<LinkRow | null> {
  const row = await get<LinkRow>("SELECT * FROM links WHERE id = ? AND user_id = ?", id, userId);
  return row ? normalize(row) : null;
}

export type ListParams = { q?: string; sort?: "recent" | "clicks" | "oldest"; page?: number; status?: "all" | LinkStatus; pageSize?: number };

export async function listLinks(userId: string, p: ListParams) {
  const pageSize = p.pageSize ?? 10;
  const page = Math.max(1, p.page ?? 1);
  const where: string[] = ["user_id = ?"];
  const args: (string | number)[] = [userId];
  if (p.q?.trim()) {
    where.push("(LOWER(slug) LIKE ? OR LOWER(destination_url) LIKE ? OR LOWER(COALESCE(title,'')) LIKE ?)");
    const like = `%${p.q.trim().toLowerCase().replace(/[%_\\]/g, "")}%`;
    args.push(like, like, like);
  }
  const now = Date.now();
  if (p.status === "active") {
    where.push("is_active = 1 AND (expires_at IS NULL OR expires_at > ?)");
    args.push(now);
  } else if (p.status === "paused") {
    where.push("is_active = 0 AND (expires_at IS NULL OR expires_at > ?)");
    args.push(now);
  } else if (p.status === "expired") {
    where.push("expires_at IS NOT NULL AND expires_at <= ?");
    args.push(now);
  }
  const order = p.sort === "clicks" ? "click_count DESC, created_at DESC" : p.sort === "oldest" ? "created_at ASC" : "created_at DESC";
  const w = where.join(" AND ");
  const total = Number((await get<{ n: number }>(`SELECT CAST(COUNT(*) AS INTEGER) AS n FROM links WHERE ${w}`, ...args))?.n ?? 0);
  const rows = await all<LinkRow>(`SELECT * FROM links WHERE ${w} ORDER BY ${order} LIMIT ? OFFSET ?`, ...args, pageSize, (page - 1) * pageSize);
  return { items: rows.map(toDTO), total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function updateLink(
  link: LinkRow,
  patch: { url?: string; slug?: string; expiresAt?: number | null; isActive?: boolean; title?: string | null },
): Promise<LinkRow> {
  const next: LinkRow = {
    ...link,
    destination_url: patch.url ?? link.destination_url,
    slug: patch.slug ?? link.slug,
    expires_at: patch.expiresAt !== undefined ? patch.expiresAt : link.expires_at,
    is_active: patch.isActive !== undefined ? (patch.isActive ? 1 : 0) : link.is_active,
    title: patch.title !== undefined ? patch.title : link.title,
    updated_at: Date.now(),
  };
  await run(
    `UPDATE links SET destination_url = ?, slug = ?, expires_at = ?, is_active = ?, title = ?, updated_at = ? WHERE id = ?`,
    next.destination_url, next.slug, next.expires_at, next.is_active, next.title, next.updated_at, link.id,
  );
  await cacheDelete(link.slug, next.slug);
  return next;
}

export async function deleteLink(link: LinkRow): Promise<void> {
  await run("DELETE FROM links WHERE id = ?", link.id);
  await cacheDelete(link.slug);
}

export async function recentLinks(userId: string, n = 5): Promise<LinkDTO[]> {
  return (await all<LinkRow>("SELECT * FROM links WHERE user_id = ? ORDER BY created_at DESC LIMIT ?", userId, n)).map(toDTO);
}

/** Toma el <title> del destino (en segundo plano, con límite de tiempo). */
export async function fetchTitle(url: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3000);
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: { "User-Agent": "SnipBot/1.0 (+title preview)", Accept: "text/html" },
    });
    clearTimeout(t);
    if (!res.ok || !(res.headers.get("content-type") ?? "").includes("text/html")) return null;
    const reader = res.body?.getReader();
    if (!reader) return null;
    let html = "";
    while (html.length < 60_000) {
      const { value, done } = await reader.read();
      if (done) break;
      html += new TextDecoder().decode(value);
      if (/<\/title>/i.test(html)) break;
    }
    void reader.cancel();
    const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (!m) return null;
    const title = m[1]
      .replace(/\s+/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&#39;|&apos;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .trim();
    return title ? title.slice(0, 200) : null;
  } catch {
    return null;
  }
}

/** Google Safe Browsing (solo si hay clave configurada). */
export async function isUnsafe(url: string): Promise<boolean> {
  const key = process.env.GOOGLE_SAFE_BROWSING_KEY;
  if (!key) return false;
  try {
    const res = await fetch(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client: { clientId: "snip", clientVersion: "1.0" },
        threatInfo: {
          threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
          platformTypes: ["ANY_PLATFORM"],
          threatEntryTypes: ["URL"],
          threatEntries: [{ url }],
        },
      }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { matches?: unknown[] };
    return Boolean(data.matches?.length);
  } catch {
    return false;
  }
}

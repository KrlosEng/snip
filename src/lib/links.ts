import "server-only";
import { all, get, run, type LinkRow } from "./db";
import { hashPassword, randomSlug, uuid } from "./ids";
import { cacheDelete } from "./cache";
import { safeFetch } from "./net-guard";
import { blockedReason } from "./access";
import { personalScope, scopeSql, type Scope } from "./workspaces";

export type LinkStatus = "active" | "paused" | "expired" | "scheduled";

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
  folder: string | null;
  tags: string[];
  /** Pide contraseña (el hash nunca sale del servidor). */
  protected: boolean;
  startsAt: number | null;
  maxClicks: number | null;
  notifyAt: number | null;
};

export function statusOf(l: Pick<LinkRow, "is_active" | "expires_at" | "starts_at" | "max_clicks" | "click_count">): LinkStatus {
  const r = blockedReason(
    { active: Boolean(Number(l.is_active)), expiresAt: l.expires_at ?? null, startsAt: l.starts_at ?? null, maxClicks: l.max_clicks ?? null },
    Number(l.click_count ?? 0),
  );
  if (r === "expired" || r === "limit") return "expired";
  if (r === "scheduled") return "scheduled";
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
    folder: l.folder ?? null,
    starts_at: l.starts_at == null ? null : Number(l.starts_at),
    max_clicks: l.max_clicks == null ? null : Number(l.max_clicks),
    notify_at: l.notify_at == null ? null : Number(l.notify_at),
  };
}

export function toDTO(raw: LinkRow, tags: string[] = []): LinkDTO {
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
    folder: l.folder ?? null,
    tags,
    protected: Boolean(l.password_hash),
    startsAt: l.starts_at ?? null,
    maxClicks: l.max_clicks ?? null,
    notifyAt: l.notify_at ?? null,
  };
}

/* ---------- Controles de acceso ---------- */

/**
 * Cambios de acceso. undefined = no tocar; null = quitar.
 * password llega en claro y se guarda solo como hash.
 */
export type AccessPatch = {
  password?: string | null;
  startsAt?: number | null;
  maxClicks?: number | null;
  notifyAt?: number | null;
};

type AccessCols = Pick<LinkRow, "password_hash" | "starts_at" | "max_clicks" | "notify_at" | "notified_at">;

export function accessColumns(p: AccessPatch, cur: Partial<AccessCols>): AccessCols {
  const notifyAt = p.notifyAt !== undefined ? p.notifyAt : (cur.notify_at ?? null);
  return {
    password_hash: p.password === undefined ? (cur.password_hash ?? null) : p.password ? hashPassword(p.password) : null,
    starts_at: p.startsAt !== undefined ? p.startsAt : (cur.starts_at ?? null),
    max_clicks: p.maxClicks !== undefined ? p.maxClicks : (cur.max_clicks ?? null),
    notify_at: notifyAt,
    // Si cambia la meta del aviso, se puede volver a avisar.
    notified_at: p.notifyAt !== undefined && p.notifyAt !== (cur.notify_at ?? null) ? null : (cur.notified_at ?? null),
  };
}

/* ---------- Etiquetas ---------- */

async function tagsFor(ids: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (!ids.length) return map;
  const rows = await all<{ link_id: string; tag: string }>(
    `SELECT link_id, tag FROM link_tags WHERE link_id IN (${ids.map(() => "?").join(", ")}) ORDER BY tag`,
    ...ids,
  );
  for (const r of rows) map.set(r.link_id, [...(map.get(r.link_id) ?? []), r.tag]);
  return map;
}

/** Convierte filas en DTO con sus etiquetas (una sola consulta extra). */
export async function withTags(rows: LinkRow[]): Promise<LinkDTO[]> {
  const tags = await tagsFor(rows.map((r) => r.id));
  return rows.map((r) => toDTO(r, tags.get(r.id) ?? []));
}

export async function linkDTO(row: LinkRow): Promise<LinkDTO> {
  return (await withTags([row]))[0];
}

/** Reemplaza las etiquetas de un enlace (ya normalizadas con cleanTags). */
export async function setTags(linkId: string, userId: string, tags: string[]): Promise<void> {
  await run("DELETE FROM link_tags WHERE link_id = ?", linkId);
  for (const t of tags) {
    await run("INSERT INTO link_tags (link_id, user_id, tag) VALUES (?, ?, ?) ON CONFLICT (link_id, tag) DO NOTHING", linkId, userId, t);
  }
}

export type Facets = { folders: { name: string; count: number }[]; tags: { name: string; count: number }[] };

/** Carpetas y etiquetas que ya usa la persona, con cuántos enlaces tiene cada una. */
/** Acepta un espacio o, por compatibilidad, solo el id (= espacio personal). */
export const toScope = (o: string | Scope): Scope => (typeof o === "string" ? personalScope(o) : o);

export async function listFacets(owner: string | Scope): Promise<Facets> {
  const s = scopeSql(toScope(owner));
  const sl = scopeSql(toScope(owner), "l.");
  const [folders, tags] = await Promise.all([
    all<{ name: string; n: number }>(
      `SELECT folder AS name, CAST(COUNT(*) AS INTEGER) AS n FROM links WHERE ${s.sql} AND folder IS NOT NULL GROUP BY folder ORDER BY LOWER(folder)`,
      ...s.args,
    ),
    all<{ name: string; n: number }>(
      `SELECT t.tag AS name, CAST(COUNT(*) AS INTEGER) AS n FROM link_tags t JOIN links l ON l.id = t.link_id WHERE ${sl.sql}
       GROUP BY t.tag ORDER BY COUNT(*) DESC, t.tag LIMIT 50`,
      ...sl.args,
    ),
  ]);
  return {
    folders: folders.map((f) => ({ name: f.name, count: Number(f.n) })),
    tags: tags.map((t) => ({ name: t.name, count: Number(t.n) })),
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
  /** Equipo dueño del enlace (null = espacio personal). */
  workspaceId?: string | null;
  url: string;
  slug?: string | null;
  expiresAt: number | null;
  title?: string | null;
  folder?: string | null;
  tags?: string[];
  access?: AccessPatch;
}): Promise<LinkRow> {
  const now = Date.now();
  const row: LinkRow = {
    id: uuid(),
    user_id: input.userId,
    slug: input.slug || (await uniqueRandomSlug()),
    destination_url: input.url,
    title: input.title?.trim() || null,
    is_active: 1,
    expires_at: input.expiresAt,
    click_count: 0,
    created_at: now,
    updated_at: now,
    folder: input.userId ? (input.folder ?? null) : null,
    ...(input.userId ? accessColumns(input.access ?? {}, {}) : {}),
  };
  await run(
    `INSERT INTO links (id, user_id, slug, destination_url, title, is_active, expires_at, click_count, created_at, updated_at, folder,
                        password_hash, starts_at, max_clicks, notify_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    row.id, row.user_id, row.slug, row.destination_url, row.title, row.is_active, row.expires_at, 0, now, now, row.folder ?? null,
    row.password_hash ?? null, row.starts_at ?? null, row.max_clicks ?? null, row.notify_at ?? null,
  );
  if (input.userId && input.workspaceId) {
    await run("UPDATE links SET workspace_id = ? WHERE id = ?", input.workspaceId, row.id);
    row.workspace_id = input.workspaceId;
  }
  if (input.userId && input.tags?.length) await setTags(row.id, input.userId, input.tags);
  return row;
}

/** Siempre filtra por user_id: nadie ve enlaces ajenos cambiando el id. */
/**
 * Enlace al que la persona tiene acceso: uno suyo del espacio personal, o uno
 * de un equipo del que es miembro. Para cambiarlo, revisa además canEdit(linkRole(...)).
 */
export async function getOwnLink(userId: string, id: string): Promise<LinkRow | null> {
  const row = await get<LinkRow>(
    `SELECT * FROM links WHERE id = ? AND (
       (workspace_id IS NULL AND user_id = ?)
       OR workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = ?)
     )`,
    id,
    userId,
    userId,
  );
  return row ? normalize(row) : null;
}

export type ListParams = {
  q?: string;
  sort?: "recent" | "clicks" | "oldest";
  page?: number;
  status?: "all" | LinkStatus;
  pageSize?: number;
  /** Nombre de carpeta, o "" para "sin carpeta". */
  folder?: string | null;
  tag?: string | null;
};

export async function listLinks(owner: string | Scope, p: ListParams) {
  const pageSize = p.pageSize ?? 10;
  const page = Math.max(1, p.page ?? 1);
  const scope = scopeSql(toScope(owner));
  const where: string[] = [scope.sql];
  const args: (string | number)[] = [...scope.args];
  if (p.q?.trim()) {
    where.push("(LOWER(slug) LIKE ? OR LOWER(destination_url) LIKE ? OR LOWER(COALESCE(title,'')) LIKE ?)");
    const like = `%${p.q.trim().toLowerCase().replace(/[%_\\]/g, "")}%`;
    args.push(like, like, like);
  }
  if (p.folder === "") {
    where.push("folder IS NULL");
  } else if (p.folder) {
    where.push("folder = ?");
    args.push(p.folder);
  }
  if (p.tag) {
    where.push("id IN (SELECT link_id FROM link_tags WHERE tag = ?)");
    args.push(p.tag);
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
  return { items: await withTags(rows), total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function updateLink(
  link: LinkRow,
  patch: {
    url?: string;
    slug?: string;
    expiresAt?: number | null;
    isActive?: boolean;
    title?: string | null;
    folder?: string | null;
    tags?: string[];
    access?: AccessPatch;
  },
): Promise<LinkRow> {
  const next: LinkRow = {
    ...link,
    destination_url: patch.url ?? link.destination_url,
    slug: patch.slug ?? link.slug,
    expires_at: patch.expiresAt !== undefined ? patch.expiresAt : link.expires_at,
    is_active: patch.isActive !== undefined ? (patch.isActive ? 1 : 0) : link.is_active,
    title: patch.title !== undefined ? patch.title : link.title,
    folder: patch.folder !== undefined ? patch.folder : (link.folder ?? null),
    ...accessColumns(patch.access ?? {}, link),
    updated_at: Date.now(),
  };
  await run(
    `UPDATE links SET destination_url = ?, slug = ?, expires_at = ?, is_active = ?, title = ?, folder = ?,
            password_hash = ?, starts_at = ?, max_clicks = ?, notify_at = ?, notified_at = ?, updated_at = ? WHERE id = ?`,
    next.destination_url, next.slug, next.expires_at, next.is_active, next.title, next.folder ?? null,
    next.password_hash ?? null, next.starts_at ?? null, next.max_clicks ?? null, next.notify_at ?? null, next.notified_at ?? null,
    next.updated_at, link.id,
  );
  if (patch.tags !== undefined && link.user_id) await setTags(link.id, link.user_id, patch.tags);
  await cacheDelete(link.slug, next.slug);
  return next;
}

export async function deleteLink(link: LinkRow): Promise<void> {
  await run("DELETE FROM links WHERE id = ?", link.id);
  await cacheDelete(link.slug);
}

export async function recentLinks(owner: string | Scope, n = 5): Promise<LinkDTO[]> {
  const s = scopeSql(toScope(owner));
  return withTags(await all<LinkRow>(`SELECT * FROM links WHERE ${s.sql} ORDER BY created_at DESC LIMIT ?`, ...s.args, n));
}

/** Toma el <title> del destino (en segundo plano, con límite de tiempo). */
export async function fetchTitle(url: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3000);
    // safeFetch rechaza direcciones internas y revisa cada redirección (anti-SSRF).
    const res = await safeFetch(url, {
      signal: ctrl.signal,
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

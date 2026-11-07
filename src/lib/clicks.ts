import "server-only";
import { UAParser } from "ua-parser-js";
import { all, get, run, type ClickRow } from "./db";
import { hashIp } from "./ids";

const BOT_RE =
  /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|slack|discord|twitter|linkedin|embedly|quora|pinterest|vkshare|skype|bingpreview|headless|curl|wget|python-requests|httpclient|go-http/i;

export function isBot(ua: string): boolean {
  return !ua || BOT_RE.test(ua);
}

export function parseUa(ua: string) {
  const r = new UAParser(ua).getResult();
  const type = r.device.type;
  const device = type === "mobile" ? "Móvil" : type === "tablet" ? "Tablet" : "Escritorio";
  return {
    device,
    browser: r.browser.name ?? "Otro",
    os: r.os.name ?? "Otro",
  };
}

export function referrerDomain(ref: string | null): string {
  if (!ref) return "Directo";
  try {
    return new URL(ref).hostname.replace(/^www\./, "") || "Directo";
  } catch {
    return "Directo";
  }
}

export async function recordClick(linkId: string, h: Headers, ip: string): Promise<void> {
  const ua = h.get("user-agent") ?? "";
  const bot = isBot(ua);
  const { device, browser, os } = parseUa(ua);
  const country = h.get("x-vercel-ip-country") ?? h.get("cf-ipcountry") ?? null;
  const cityRaw = h.get("x-vercel-ip-city");
  const city = cityRaw ? decodeURIComponent(cityRaw) : null;
  await run(
    `INSERT INTO clicks (link_id, clicked_at, country, city, device, browser, os, referrer, ip_hash, is_bot)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    linkId, Date.now(), country, city, device, browser, os, referrerDomain(h.get("referer")), hashIp(ip), bot ? 1 : 0,
  );
  if (!bot) await run("UPDATE links SET click_count = click_count + 1 WHERE id = ?", linkId);
}

/* ------------------------------ Analíticas ------------------------------ */

export type Range = "7d" | "30d" | "90d";
export const RANGES: Record<Range, number> = { "7d": 7, "30d": 30, "90d": 90 };

export function dayKey(ts: number, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(ts);
}

export function lastDays(days: number, tz: string): string[] {
  const out: string[] = [];
  const now = Date.now();
  for (let i = days - 1; i >= 0; i--) out.push(dayKey(now - i * 86_400_000, tz));
  return [...new Set(out)];
}

type Count = { label: string; value: number };

function tally(rows: ClickRow[], pick: (r: ClickRow) => string | null, top = 6): Count[] {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = pick(r) || "Desconocido";
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  const sorted = [...m.entries()].sort((a, b) => b[1] - a[1]);
  const head = sorted.slice(0, top).map(([label, value]) => ({ label, value }));
  const rest = sorted.slice(top).reduce((s, [, v]) => s + v, 0);
  if (rest > 0) head.push({ label: "Otros", value: rest });
  return head;
}

export function series(rows: Pick<ClickRow, "clicked_at">[], days: number, tz: string) {
  const keys = lastDays(days, tz);
  const m = new Map(keys.map((k) => [k, 0]));
  for (const r of rows) {
    const k = dayKey(r.clicked_at, tz);
    if (m.has(k)) m.set(k, m.get(k)! + 1);
  }
  return keys.map((date) => ({ date, clicks: m.get(date)! }));
}

const num = (v: unknown) => Number(v ?? 0);

export async function linkStats(linkId: string, range: Range, tz: string) {
  const days = RANGES[range];
  const since = Date.now() - (days + 1) * 86_400_000;
  const rows = (
    await all<ClickRow>(
      "SELECT clicked_at, country, device, browser, os, referrer, ip_hash FROM clicks WHERE link_id = ? AND clicked_at >= ? AND is_bot = 0",
      linkId,
      since,
    )
  ).map((r) => ({ ...r, clicked_at: num(r.clicked_at) }));
  const s = series(rows, days, tz);
  const inRange = rows.filter((r) => r.clicked_at >= Date.now() - days * 86_400_000);
  const prevSince = Date.now() - 2 * days * 86_400_000;
  const prev = num(
    (
      await get<{ n: number }>(
        "SELECT CAST(COUNT(*) AS INTEGER) AS n FROM clicks WHERE link_id = ? AND clicked_at >= ? AND clicked_at < ? AND is_bot = 0",
        linkId,
        prevSince,
        Date.now() - days * 86_400_000,
      )
    )?.n,
  );
  const bots = num(
    (await get<{ n: number }>("SELECT CAST(COUNT(*) AS INTEGER) AS n FROM clicks WHERE link_id = ? AND clicked_at >= ? AND is_bot = 1", linkId, since))?.n,
  );
  const peak = s.reduce((a, b) => (b.clicks > a.clicks ? b : a), s[0]);
  return {
    range,
    total: inRange.length,
    previous: prev,
    unique: new Set(inRange.map((r) => r.ip_hash)).size,
    bots,
    peak,
    series: s,
    countries: tally(inRange, (r) => r.country, 5),
    devices: tally(inRange, (r) => r.device, 3),
    browsers: tally(inRange, (r) => r.browser, 4),
    os: tally(inRange, (r) => r.os, 4),
    referrers: tally(inRange, (r) => r.referrer, 5),
  };
}

export type LinkStats = Awaited<ReturnType<typeof linkStats>>;

export async function recentClicks(linkId: string, page: number, pageSize = 10) {
  const rows = await all<ClickRow>("SELECT * FROM clicks WHERE link_id = ? ORDER BY clicked_at DESC LIMIT ? OFFSET ?", linkId, pageSize + 1, (page - 1) * pageSize);
  return {
    items: rows.slice(0, pageSize).map((r) => ({
      id: num(r.id),
      clickedAt: num(r.clicked_at),
      country: r.country,
      city: r.city,
      device: r.device,
      browser: r.browser,
      os: r.os,
      referrer: r.referrer,
      isBot: Boolean(num(r.is_bot)),
    })),
    hasMore: rows.length > pageSize,
  };
}

export type ClickItem = Awaited<ReturnType<typeof recentClicks>>["items"][number];

export async function dashboardStats(userId: string, tz: string) {
  const counts = await get<{ links: number; active: number; total: number }>(
    `SELECT CAST(COUNT(*) AS INTEGER) AS links,
            CAST(COALESCE(SUM(CASE WHEN is_active = 1 AND (expires_at IS NULL OR expires_at > ?) THEN 1 ELSE 0 END), 0) AS INTEGER) AS active,
            CAST(COALESCE(SUM(click_count), 0) AS INTEGER) AS total
     FROM links WHERE user_id = ?`,
    Date.now(),
    userId,
  );
  const links = num(counts?.links);
  const active = num(counts?.active);
  const total = num(counts?.total);
  const since = Date.now() - 32 * 86_400_000;
  const rows = (
    await all<Pick<ClickRow, "clicked_at">>(
      `SELECT c.clicked_at FROM clicks c JOIN links l ON l.id = c.link_id
       WHERE l.user_id = ? AND c.clicked_at >= ? AND c.is_bot = 0`,
      userId,
      since,
    )
  ).map((r) => ({ clicked_at: num(r.clicked_at) }));
  const s = series(rows, 30, tz);
  const today = s[s.length - 1]?.clicks ?? 0;
  const yesterday = s[s.length - 2]?.clicks ?? 0;
  const countryRows = await get<{ label: string; value: number }>(
    `SELECT c.country AS label, CAST(COUNT(*) AS INTEGER) AS value FROM clicks c JOIN links l ON l.id = c.link_id
     WHERE l.user_id = ? AND c.is_bot = 0 AND c.country IS NOT NULL
     GROUP BY c.country ORDER BY value DESC LIMIT 1`,
    userId,
  );
  const last30 = s.reduce((a, b) => a + b.clicks, 0);
  return {
    links,
    active,
    total,
    today,
    yesterday,
    last30,
    topCountry: countryRows ? { code: countryRows.label, clicks: num(countryRows.value), share: total ? num(countryRows.value) / total : 0 } : null,
    series: s,
  };
}

export type DashboardStats = Awaited<ReturnType<typeof dashboardStats>>;

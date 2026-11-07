import crypto from "node:crypto";
import { all, get, insertMany, run } from "./db";

/**
 * Cuenta demo con datos realistas (demo@snip.to) para que un reclutador
 * pruebe el producto en menos de un minuto con "Entrar como demo".
 */

export const DEMO_EMAIL = "demo@snip.to";

const LINKS = [
  { slug: "launch-v2", url: "https://www.producthunt.com/posts/snip-v2?utm_source=twitter&utm_medium=social&utm_campaign=launch", title: "Snip v2 en Product Hunt", weight: 1, spike: 24, ageDays: 60 },
  { slug: "menu-tacos", url: "https://drive.google.com/file/d/1aB2cD3eF4gH5iJ6kL7mN8oP9qR0sT/view?usp=sharing", title: "Menú de temporada · Taquería Don Beto", weight: 0.55, spike: 0, ageDays: 88 },
  { slug: "bio", url: "https://linktr.ee/marianacreativa?utm_source=instagram&utm_medium=bio", title: "Mariana Creativa · Enlaces", weight: 0.7, spike: 0, ageDays: 90 },
  { slug: "webinar-nov", url: "https://us02web.zoom.us/webinar/register/WN_x8Yp2RkQSq2mZ7Lw?utm_campaign=webinar-noviembre", title: "Webinar: Métricas que importan", weight: 0.35, spike: 3, ageDays: 20 },
  { slug: "QxR7mZp", url: "https://github.com/carlo/snip#decisiones-tecnicas", title: "carlo/snip · GitHub", weight: 0.22, spike: 0, ageDays: 45 },
  { slug: "promo-buen-fin", url: "https://tienda.ejemplo.mx/ofertas/buen-fin-2026?utm_source=whatsapp&utm_medium=broadcast", title: "Ofertas Buen Fin · Tienda", weight: 0.4, spike: 0, ageDays: 30, paused: true },
  { slug: "promo-verano", url: "https://tienda.ejemplo.mx/verano?utm_source=instagram", title: "Rebajas de verano", weight: 0.3, spike: 0, ageDays: 120, expiredDaysAgo: 40 },
];

const COUNTRIES: [string, string[], number][] = [
  ["MX", ["Ciudad de México", "Guadalajara", "Monterrey", "Puebla"], 34],
  ["US", ["Los Angeles", "Austin", "New York", "Chicago"], 22],
  ["ES", ["Madrid", "Barcelona", "Valencia"], 11],
  ["CO", ["Bogotá", "Medellín"], 9],
  ["AR", ["Buenos Aires", "Córdoba"], 8],
  ["CL", ["Santiago"], 5],
  ["DE", ["Berlin", "Munich"], 4],
  ["PE", ["Lima"], 4],
  ["BR", ["São Paulo"], 3],
];
const DEVICES: [string, number][] = [["Móvil", 61], ["Escritorio", 33], ["Tablet", 6]];
const BROWSERS: Record<string, [string, number][]> = {
  Móvil: [["Mobile Safari", 45], ["Chrome", 40], ["Samsung Internet", 10], ["Instagram", 5]],
  Escritorio: [["Chrome", 62], ["Safari", 16], ["Edge", 12], ["Firefox", 10]],
  Tablet: [["Mobile Safari", 70], ["Chrome", 30]],
};
const OS: Record<string, [string, number][]> = {
  Móvil: [["iOS", 52], ["Android", 48]],
  Escritorio: [["Windows", 54], ["macOS", 38], ["Linux", 8]],
  Tablet: [["iOS", 75], ["Android", 25]],
};
const REFERRERS: [string, number][] = [
  ["Directo", 34], ["instagram.com", 18], ["t.co", 14], ["whatsapp.com", 12], ["linkedin.com", 9], ["google.com", 7], ["facebook.com", 6],
];

function pick<T>(items: [T, number][], r: number): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let x = r * total;
  for (const [v, w] of items) {
    if ((x -= w) <= 0) return v;
  }
  return items[items.length - 1][0];
}

type Rand = () => number;
type Spec = (typeof LINKS)[number];
type Param = string | number | null;

function makeRand(seed: number): Rand {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const DAY = 86_400_000;
const visitors = Array.from({ length: 2600 }, (_, i) => crypto.createHash("sha256").update(`v${i}`).digest("hex").slice(0, 32));
const COUNTRY_W = COUNTRIES.map(([c, ci, w]) => [[c, ci] as const, w] as [readonly [string, string[]], number]);
const CLICK_COLS = ["link_id", "clicked_at", "country", "city", "device", "browser", "os", "referrer", "ip_hash", "is_bot"];

/** Genera filas de clics sintéticos para un enlace entre `from` y `to`. */
function genClicks(linkId: string, l: Spec, created: number, from: number, to: number, rand: Rand): { rows: Param[][]; human: number } {
  const rows: Param[][] = [];
  let human = 0;
  for (let t = from; t < to; t += DAY) {
    const span = Math.min(DAY, to - t);
    const age = (t - created) / DAY;
    const dow = new Date(t).getDay();
    let perDay = 38 * l.weight * (1 + 0.35 * Math.sin(age / 6)) * (dow === 0 || dow === 6 ? 0.7 : 1.1);
    if (l.spike && Math.abs(age - l.spike) < 1) perDay *= 7;
    else if (l.spike && age > l.spike && age < l.spike + 6) perDay *= 1 + 3 / (age - l.spike + 0.5);
    const n = Math.max(0, Math.round(perDay * (span / DAY) * (0.75 + rand() * 0.5)));
    for (let k = 0; k < n; k++) {
      const at = t + Math.floor(rand() * span);
      const [country, cities] = pick(COUNTRY_W, rand());
      const device = pick(DEVICES, rand());
      const bot = rand() < 0.04;
      rows.push([
        linkId, at, country, cities[Math.floor(rand() * cities.length)], device,
        bot ? "WhatsApp" : pick(BROWSERS[device], rand()), pick(OS[device], rand()), pick(REFERRERS, rand()),
        visitors[Math.floor(rand() * rand() * visitors.length)], bot ? 1 : 0,
      ]);
      if (!bot) human++;
    }
  }
  return { rows, human };
}

const g = globalThis as unknown as { __snipSeeding?: Promise<string> };

/** Crea la cuenta demo si no existe y la mantiene al día. Devuelve su id. */
export function ensureDemoData(): Promise<string> {
  g.__snipSeeding ??= seed().finally(() => {
    g.__snipSeeding = undefined;
  });
  return g.__snipSeeding;
}

async function seed(): Promise<string> {
  const now = Date.now();
  const existing = await get<{ id: string }>("SELECT id FROM users WHERE email = ?", DEMO_EMAIL);
  if (existing) {
    await topUpDemo(existing.id, now);
    return existing.id;
  }
  const rand = makeRand(20261106);
  const userId = crypto.randomUUID();
  await run("INSERT INTO users (id, email, name, password_hash, timezone, created_at) VALUES (?, ?, ?, NULL, ?, ?)", userId, DEMO_EMAIL, "Demo", "America/Mexico_City", now - 120 * DAY);
  try {
    for (const [idx, l] of LINKS.entries()) {
      const id = crypto.randomUUID();
      const created = now - l.ageDays * DAY;
      const expires = "expiredDaysAgo" in l && l.expiredDaysAgo ? now - l.expiredDaysAgo * DAY : null;
      await run(
        `INSERT INTO links (id, user_id, slug, destination_url, title, is_active, expires_at, click_count, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
        id, userId, l.slug, l.url, l.title, "paused" in l && l.paused ? 0 : 1, expires, created, created + idx * 1000,
      );
      const { rows, human } = genClicks(id, l, created, created, expires ?? now, rand);
      await insertMany("clicks", CLICK_COLS, rows);
      await run("UPDATE links SET click_count = ? WHERE id = ?", human, id);
    }
  } catch (e) {
    // Si algo falla, no dejamos una demo a medias.
    await run("DELETE FROM users WHERE id = ?", userId);
    throw e;
  }
  return userId;
}

/** Mantiene viva la demo: rellena los clics desde la última visita hasta ahora. */
async function topUpDemo(userId: string, now: number): Promise<void> {
  const rows = await all<{ id: string; slug: string; created_at: number; is_active: number; expires_at: number | null; last: number | null }>(
    `SELECT l.id, l.slug, l.created_at, l.is_active, l.expires_at,
            (SELECT MAX(clicked_at) FROM clicks c WHERE c.link_id = l.id) AS last
     FROM links l WHERE l.user_id = ?`,
    userId,
  );
  const rand = makeRand(now % 100000);
  for (const r of rows) {
    const spec = LINKS.find((l) => l.slug === r.slug);
    if (!spec || !Number(r.is_active) || (r.expires_at && Number(r.expires_at) < now)) continue;
    const from = Math.max(Number(r.last ?? r.created_at), now - 90 * DAY);
    if (now - from < 15 * 60_000) continue;
    const { rows: clicks, human } = genClicks(r.id, spec, Number(r.created_at), from, now, rand);
    await insertMany("clicks", CLICK_COLS, clicks);
    if (human) await run("UPDATE links SET click_count = click_count + ? WHERE id = ?", human, r.id);
  }
}

/** Utilidades de formato compartidas entre servidor y cliente. */

const nf = new Intl.NumberFormat("es-MX");
export const fmt = (n: number) => nf.format(n);

export function compact(n: number): string {
  return new Intl.NumberFormat("es-MX", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function pct(part: number, total: number, digits = 0): string {
  if (!total) return "0%";
  return `${((part / total) * 100).toFixed(digits)}%`;
}

export function delta(cur: number, prev: number): { label: string; dir: "up" | "down" | "flat" } {
  if (!prev && !cur) return { label: "sin cambio", dir: "flat" };
  if (!prev) return { label: "nuevo", dir: "up" };
  const d = ((cur - prev) / prev) * 100;
  if (Math.abs(d) < 0.5) return { label: "0%", dir: "flat" };
  return { label: `${d > 0 ? "+" : ""}${d.toFixed(Math.abs(d) < 10 ? 1 : 0)}%`, dir: d > 0 ? "up" : "down" };
}

let regionNames: Intl.DisplayNames | null = null;
export function countryName(code: string | null): string {
  if (!code || code === "Desconocido") return "Desconocido";
  if (code === "Otros") return "Otros países";
  try {
    regionNames ??= new Intl.DisplayNames(["es"], { type: "region" });
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
}

export function flag(code: string | null): string {
  if (!code || !/^[A-Z]{2}$/.test(code)) return "🌐";
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

export function stripProtocol(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
export function timeAgo(ts: number, now = Date.now()): string {
  const s = Math.round((ts - now) / 1000);
  const abs = Math.abs(s);
  if (abs < 45) return "hace un momento";
  if (abs < 3600) return rtf.format(Math.round(s / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(s / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(s / 86400), "day");
  if (abs < 86400 * 365) return rtf.format(Math.round(s / (86400 * 30)), "month");
  return rtf.format(Math.round(s / (86400 * 365)), "year");
}

export function shortDate(ts: number | string, tz?: string): string {
  const d = typeof ts === "string" ? new Date(`${ts}T12:00:00Z`) : new Date(ts);
  return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", timeZone: typeof ts === "string" ? "UTC" : tz }).format(d);
}

export function longDate(ts: number | string, tz?: string): string {
  const d = typeof ts === "string" ? new Date(`${ts}T12:00:00Z`) : new Date(ts);
  return new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long", timeZone: typeof ts === "string" ? "UTC" : tz }).format(d);
}

export function dateTime(ts: number, tz?: string): string {
  return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: tz }).format(ts);
}

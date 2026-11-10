import { describe, expect, it } from "vitest";
import { filterSql, linkStats, previousSeries, readFilter, rhythm } from "@/lib/clicks";
import { contrastRatio, parseQrOptions, qrQuery, qrWarnings, QR_DEFAULTS } from "@/lib/qr-options";
import { run } from "@/lib/db";
import { createLink } from "@/lib/links";

describe("filtros de estadísticas", () => {
  it("solo acepta las 4 columnas, ignora 'Otros' y valores enormes", () => {
    const params: Record<string, string> = { country: "MX", os: "Windows", browser: "Otros", referrer: "x".repeat(200), device: " Móvil " };
    expect(readFilter((k) => params[k])).toEqual({ country: "MX", device: "Móvil" });
  });

  it("arma SQL con parámetros y trata 'Desconocido' como vacío", () => {
    expect(filterSql({ country: "MX", referrer: "Desconocido" })).toEqual({ sql: " AND country = ? AND referrer IS NULL", args: ["MX"] });
    expect(filterSql({})).toEqual({ sql: "", args: [] });
  });
});

describe("agregaciones", () => {
  it("cuenta por hora local y día de la semana", () => {
    // 2026-11-09 es lunes. 15:30 UTC = 09:30 en Ciudad de México (UTC-6).
    const t = Date.UTC(2026, 10, 9, 15, 30);
    const r = rhythm([{ clicked_at: t }, { clicked_at: t + 60_000 }], "America/Mexico_City");
    expect(r.hours[9]).toBe(2);
    expect(r.weekdays[0]).toBe(2);
    expect(r.hours.reduce((a, b) => a + b, 0)).toBe(2);
  });

  it("alinea el periodo anterior en cubetas de 24 h", () => {
    const start = 1_000_000_000_000;
    const s = previousSeries([{ clicked_at: start }, { clicked_at: start + 86_400_000 * 2 + 5 }, { clicked_at: start - 1 }], 3, start);
    expect(s).toEqual([1, 0, 1]);
  });

  it("linkStats compara con el periodo anterior y respeta el filtro", async () => {
    await run("INSERT INTO users (id, email, name, password_hash, timezone, created_at) VALUES (?, ?, ?, NULL, ?, ?)", "f3", "f3@prueba.mx", "f3", "UTC", Date.now());
    const link = await createLink({ userId: "f3", url: "https://f3.mx/", expiresAt: null });
    const day = 86_400_000;
    const now = Date.now();
    const add = (ago: number, country: string, ip: string) =>
      run("INSERT INTO clicks (link_id, clicked_at, country, device, browser, os, referrer, ip_hash, is_bot) VALUES (?, ?, ?, 'Móvil', 'Chrome', 'Android', NULL, ?, 0)", link.id, now - ago, country, ip);
    await add(day, "MX", "a");
    await add(2 * day, "MX", "b");
    await add(3 * day, "US", "a");
    await add(10 * day, "MX", "c"); // periodo anterior (7 días)
    const all = await linkStats(link.id, "7d", "UTC");
    expect(all).toMatchObject({ total: 3, previous: 1, unique: 2, previousUnique: 1 });
    expect(all.series).toHaveLength(7);
    expect(all.series.reduce((s, p) => s + p.previous, 0)).toBe(1);
    const mx = await linkStats(link.id, "7d", "UTC", { country: "MX" });
    expect(mx).toMatchObject({ total: 2, filter: { country: "MX" } });
    expect(mx.referrers).toEqual([{ label: "Desconocido", value: 2 }]);
  });
});

describe("opciones de QR", () => {
  it("valida colores, nivel, tamaño y margen", () => {
    const p: Record<string, string> = { fg: "5B2FD6", bg: "#fff4dc", ecc: "h", size: "2048", margin: "0" };
    expect(parseQrOptions((k) => p[k])).toEqual({ fg: "#5b2fd6", bg: "#fff4dc", ecc: "H", size: 2048, margin: 0 });
    const bad: Record<string, string> = { fg: "red", bg: "#12", ecc: "Z", size: "99999", margin: "-3" };
    expect(parseQrOptions((k) => bad[k])).toEqual(QR_DEFAULTS);
  });

  it("solo pone en la URL lo que cambió", () => {
    expect(qrQuery(QR_DEFAULTS)).toBe("");
    expect(qrQuery({ ...QR_DEFAULTS, fg: "#5b2fd6", ecc: "Q" })).toBe("fg=5b2fd6&ecc=Q");
  });

  it("calcula el contraste y avisa cuando el QR puede no leerse", () => {
    expect(Math.round(contrastRatio("#000000", "#ffffff"))).toBe(21);
    expect(qrWarnings(QR_DEFAULTS)).toEqual([]);
    expect(qrWarnings({ ...QR_DEFAULTS, fg: "#dddddd" })[0]).toMatch(/muy bajo/);
    expect(qrWarnings({ ...QR_DEFAULTS, fg: "#ffffff", bg: "#000000" })).toHaveLength(1);
  });
});

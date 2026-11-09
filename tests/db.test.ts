import { describe, expect, it } from "vitest";
import { all, get, MIGRATIONS, run } from "@/lib/db";
import { rateLimit } from "@/lib/cache";
import { createLink, getOwnLink, listLinks } from "@/lib/links";

async function user(id: string) {
  await run("INSERT INTO users (id, email, name, password_hash, timezone, created_at) VALUES (?, ?, ?, NULL, ?, ?)", id, `${id}@prueba.mx`, id, "America/Mexico_City", Date.now());
}

describe("migraciones", () => {
  it("aplica todas las versiones una sola vez y crea las tablas", async () => {
    const rows = await all<{ version: number }>("SELECT version FROM schema_migrations ORDER BY version");
    expect(rows.map((r) => Number(r.version))).toEqual(MIGRATIONS.map((m) => m.version));
    expect(await get("SELECT 1 AS x FROM password_resets LIMIT 1")).toBeUndefined();
  });

  it("las versiones son crecientes y únicas", () => {
    const v = MIGRATIONS.map((m) => m.version);
    expect(v).toEqual([...v].sort((a, b) => a - b));
    expect(new Set(v).size).toBe(v.length);
  });
});

describe("rateLimit", () => {
  it("deja pasar hasta el límite y luego bloquea", async () => {
    const results = [];
    for (let i = 0; i < 4; i++) results.push((await rateLimit("prueba:limite", 3, 60)).ok);
    expect(results).toEqual([true, true, true, false]);
  });

  it("las claves son independientes y no se guardan en claro", async () => {
    expect((await rateLimit("prueba:otra", 1, 60)).ok).toBe(true);
    const keys = await all<{ key: string }>("SELECT key FROM rate_limits");
    expect(keys.some((k) => k.key.includes("prueba"))).toBe(false);
  });
});

describe("enlaces: cada quien ve solo los suyos", () => {
  it("getOwnLink y listLinks filtran por dueño", async () => {
    await user("ana");
    await user("beto");
    const link = await createLink({ userId: "ana", url: "https://ejemplo.com/", expiresAt: null });
    expect(await getOwnLink("ana", link.id)).not.toBeNull();
    expect(await getOwnLink("beto", link.id)).toBeNull();
    expect((await listLinks("beto", {})).total).toBe(0);
    expect((await listLinks("ana", {})).items[0].slug).toBe(link.slug);
  });

  it("la búsqueda no se rompe con comodines de SQL", async () => {
    const res = await listLinks("ana", { q: "%_" + String.fromCharCode(92) });
    expect(res.total).toBe(1);
  });
});

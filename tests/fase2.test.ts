import { describe, expect, it } from "vitest";
import { applyUtm, hasUtm, readUtm } from "@/lib/utm";
import { csvCell, parseCsv, toCsv } from "@/lib/csv";
import { cleanTags } from "@/lib/validation";
import { run } from "@/lib/db";
import { createLink, listFacets, listLinks, updateLink, getOwnLink } from "@/lib/links";
import { importLinks, ImportError } from "@/lib/links-import";

describe("UTM", () => {
  it("agrega, reemplaza y quita parámetros sin tocar los demás", () => {
    const url = applyUtm("https://tienda.mx/zapatos?color=rojo#tallas", { utm_source: "instagram", utm_campaign: " buen fin " });
    const u = new URL(url);
    expect(u.searchParams.get("color")).toBe("rojo");
    expect(u.searchParams.get("utm_source")).toBe("instagram");
    expect(u.searchParams.get("utm_campaign")).toBe("buen fin");
    expect(u.hash).toBe("#tallas");
    const sin = new URL(applyUtm(url, { utm_source: "", utm_campaign: "" }));
    expect(sin.searchParams.has("utm_source")).toBe(false);
    expect(sin.searchParams.get("color")).toBe("rojo");
  });

  it("lee los UTM existentes y tolera enlaces sin protocolo o inválidos", () => {
    expect(readUtm("tienda.mx/?utm_medium=email")).toEqual({ utm_medium: "email" });
    expect(applyUtm("no es un enlace", { utm_source: "x" })).toBe("no es un enlace");
    expect(hasUtm({ utm_term: "  " })).toBe(false);
  });
});

describe("CSV", () => {
  it("lee comillas, comas y saltos de línea dentro de celdas, y el BOM", () => {
    const text = "﻿destino,nombre\r\nhttps://a.mx,\"Hola, \"\"mundo\"\"\"\r\nhttps://b.mx,\"dos\nlíneas\"\r\n\r\n";
    expect(parseCsv(text)).toEqual([
      ["destino", "nombre"],
      ["https://a.mx", 'Hola, "mundo"'],
      ["https://b.mx", "dos\nlíneas"],
    ]);
  });

  it("acepta punto y coma como separador (Excel en español)", () => {
    expect(parseCsv("destino;alias\nhttps://a.mx;promo")).toEqual([
      ["destino", "alias"],
      ["https://a.mx", "promo"],
    ]);
  });

  it("neutraliza fórmulas al exportar y el resultado se vuelve a leer igual", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell("+52")).toBe("'+52");
    const back = parseCsv(toCsv([["a", "b,c", 'd"e']]));
    expect(back).toEqual([["a", "b,c", 'd"e']]);
  });
});

describe("etiquetas", () => {
  it("normaliza, quita duplicados y limita a 10", () => {
    expect(cleanTags(" Promo , #Verano 2026, promo,, ")).toEqual(["promo", "verano-2026"]);
    expect(cleanTags(Array.from({ length: 15 }, (_, i) => `t${i}`))).toHaveLength(10);
  });
});

async function user(id: string) {
  await run("INSERT INTO users (id, email, name, password_hash, timezone, created_at) VALUES (?, ?, ?, NULL, ?, ?)", id, `${id}@prueba.mx`, id, "UTC", Date.now());
}

describe("carpetas y etiquetas", () => {
  it("filtra por carpeta, sin carpeta y etiqueta; cada quien ve solo sus etiquetas", async () => {
    await user("caro");
    await user("dani");
    const a = await createLink({ userId: "caro", url: "https://a.mx/", expiresAt: null, folder: "Clientes", tags: ["promo", "verano"] });
    await createLink({ userId: "caro", url: "https://b.mx/", expiresAt: null, tags: ["promo"] });
    await createLink({ userId: "dani", url: "https://c.mx/", expiresAt: null, folder: "Clientes", tags: ["promo"] });

    expect((await listLinks("caro", { folder: "Clientes" })).total).toBe(1);
    expect((await listLinks("caro", { folder: "" })).total).toBe(1);
    expect((await listLinks("caro", { tag: "promo" })).total).toBe(2);
    expect((await listLinks("caro", { tag: "verano" })).items[0].id).toBe(a.id);

    const f = await listFacets("caro");
    expect(f.folders).toEqual([{ name: "Clientes", count: 1 }]);
    expect(f.tags).toEqual([
      { name: "promo", count: 2 },
      { name: "verano", count: 1 },
    ]);
  });

  it("editar reemplaza las etiquetas y la carpeta", async () => {
    const l = await createLink({ userId: "caro", url: "https://d.mx/", expiresAt: null, folder: "Viejo", tags: ["uno"] });
    await updateLink((await getOwnLink("caro", l.id))!, { folder: null, tags: ["dos"] });
    const res = await listLinks("caro", { tag: "dos" });
    expect(res.items[0]).toMatchObject({ id: l.id, folder: null, tags: ["dos"] });
    expect((await listLinks("caro", { tag: "uno" })).total).toBe(0);
  });
});

describe("importar CSV", () => {
  it("crea los válidos y reporta cada fila con problema", async () => {
    await user("eli");
    await run("UPDATE users SET plan = 'pro' WHERE id = ?", "eli");
    const csv = [
      "Destino,Alias,Nombre,Carpeta,Etiquetas",
      "https://ok.mx,import-uno,Primero,Campañas,\"promo, otoño\"",
      "javascript:alert(1),,,,",
      "https://ok.mx/2,import-uno,,,",
      ",sin-destino,,,",
      "ok.mx/3,login,,,",
      "https://ok.mx/4,,,,",
    ].join("\n");
    const r = await importLinks("eli", csv, ["snip.test"]);
    expect(r.created).toBe(2);
    expect(r.total).toBe(6);
    expect(r.errors.map((e) => e.row)).toEqual([3, 4, 5, 6]);
    const list = await listLinks("eli", { folder: "Campañas" });
    expect(list.items[0]).toMatchObject({ slug: "import-uno", title: "Primero", tags: ["otoño", "promo"] });
  });

  it("acepta archivos sin encabezado y rechaza archivos vacíos o enormes", async () => {
    const r = await importLinks("eli", "https://sin-encabezado.mx", []);
    expect(r.created).toBe(1);
    await expect(importLinks("eli", " \n ", [])).rejects.toBeInstanceOf(ImportError);
    const big = ["destino", ...Array.from({ length: 501 }, (_, i) => `https://x.mx/${i}`)].join("\n");
    await expect(importLinks("eli", big, [])).rejects.toThrow(/500/);
  });
});

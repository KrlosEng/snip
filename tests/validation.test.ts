import { describe, expect, it } from "vitest";
import { aliasSchema, checkDestination, normalizeUrl } from "@/lib/validation";

describe("checkDestination", () => {
  it("agrega https cuando falta el protocolo", () => {
    expect(normalizeUrl("ejemplo.com/a")).toBe("https://ejemplo.com/a");
    expect(checkDestination("ejemplo.com", [])).toEqual({ ok: true, url: "https://ejemplo.com/" });
  });

  it("rechaza protocolos peligrosos", () => {
    for (const bad of ["javascript:alert(1)", "data:text/html,hola", "file:///etc/passwd", "ftp://ejemplo.com"]) {
      expect(checkDestination(bad, []).ok).toBe(false);
    }
  });

  it("rechaza vacíos, demasiado largos y dominios sin terminación", () => {
    expect(checkDestination("   ", []).ok).toBe(false);
    expect(checkDestination(`https://e.com/${"a".repeat(2100)}`, []).ok).toBe(false);
    expect(checkDestination("https://intranet", []).ok).toBe(false);
  });

  it("no deja acortar enlaces propios (bucles)", () => {
    expect(checkDestination("https://snip.example/abc", ["snip.example"]).ok).toBe(false);
    expect(checkDestination("https://SNIP.example/abc", ["snip.example"]).ok).toBe(false);
  });
});

describe("aliasSchema", () => {
  it("acepta alias válidos", () => {
    expect(aliasSchema.safeParse("mi-promo-2026").success).toBe(true);
  });

  it("rechaza alias reservados, cortos, con símbolos o guiones en los extremos", () => {
    for (const bad of ["login", "API", "forgot", "uso-aceptable", "ab", "con espacio", "a/b", "-hola", "hola-", "x".repeat(33)]) {
      expect(aliasSchema.safeParse(bad).success, bad).toBe(false);
    }
  });
});

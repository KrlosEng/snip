import { describe, expect, it } from "vitest";
import { hashIp, hashPassword, randomSlug, randomToken, sha256, verifyPassword } from "@/lib/ids";

describe("ids y contraseñas", () => {
  it("genera slugs del largo pedido y sin repetirse", () => {
    const slugs = new Set(Array.from({ length: 500 }, () => randomSlug()));
    expect(slugs.size).toBe(500);
    for (const s of slugs) expect(s).toMatch(/^[a-zA-Z0-9]{7}$/);
    expect(randomSlug(9)).toHaveLength(9);
  });

  it("verifica la contraseña correcta y rechaza la incorrecta", () => {
    const stored = hashPassword("una clave larga");
    expect(stored).not.toContain("una clave larga");
    expect(verifyPassword("una clave larga", stored)).toBe(true);
    expect(verifyPassword("otra clave", stored)).toBe(false);
    expect(verifyPassword("lo que sea", null)).toBe(false);
  });

  it("usa sal: la misma contraseña da hashes distintos", () => {
    expect(hashPassword("igual")).not.toBe(hashPassword("igual"));
  });

  it("hashes deterministas y tokens aleatorios", () => {
    expect(sha256("a")).toBe(sha256("a"));
    expect(randomToken()).not.toBe(randomToken());
    expect(hashIp("1.2.3.4")).not.toContain("1.2.3.4");
  });
});

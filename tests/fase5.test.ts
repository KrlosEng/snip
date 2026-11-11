import { describe, expect, it } from "vitest";
import { createKey, listKeys, looksLikeKey, revokeKey, userForKey, MAX_KEYS } from "@/lib/api-keys";
import { fromPublicInput, v1Auth } from "@/lib/api-v1";
import { createFromInput, updateFromInput } from "@/lib/link-create";
import { all, run } from "@/lib/db";

async function user(id: string) {
  await run("INSERT INTO users (id, email, name, password_hash, timezone, created_at) VALUES (?, ?, ?, NULL, ?, ?)", id, `${id}@prueba.mx`, id, "UTC", Date.now());
}

const req = (key?: string) => new Request("https://snip.test/api/v1/me", { headers: key ? { Authorization: `Bearer ${key}` } : {} });

describe("claves de API", () => {
  it("se muestran una vez, se guardan como hash y se pueden revocar", async () => {
    await user("k1");
    const r = await createKey("k1", "  Mi   sitio ");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(looksLikeKey(r.key)).toBe(true);
    expect(r.item.name).toBe("Mi sitio");
    expect(r.item.prefix).not.toBe(r.key);
    const stored = await all<{ key_hash: string; prefix: string }>("SELECT key_hash, prefix FROM api_keys WHERE user_id = ?", "k1");
    expect(JSON.stringify(stored)).not.toContain(r.key);

    expect((await userForKey(r.key))?.user.id).toBe("k1");
    expect(await userForKey(r.key.slice(0, -1) + "x")).toBeNull();

    expect(await revokeKey("otro", r.item.id)).toBe(false); // no es suya
    expect(await revokeKey("k1", r.item.id)).toBe(true);
    expect(await userForKey(r.key)).toBeNull();
    expect(await listKeys("k1")).toHaveLength(0);
  });

  it("limita a 5 claves activas y pide nombre", async () => {
    await user("k2");
    await run("UPDATE users SET plan = 'pro' WHERE id = ?", "k2");
    expect((await createKey("k2", "   ")).ok).toBe(false);
    for (let i = 0; i < MAX_KEYS; i++) expect((await createKey("k2", `c${i}`)).ok).toBe(true);
    expect((await createKey("k2", "una más")).ok).toBe(false);
  });
});

describe("autenticación v1", () => {
  it("rechaza sin clave o con clave mala, y acepta la buena con encabezados de límite", async () => {
    await user("k3");
    const r = await createKey("k3", "pruebas");
    if (!r.ok) throw new Error(r.error);
    const none = await v1Auth(req());
    expect(none instanceof Response && none.status).toBe(401);
    const badKey = await v1Auth(req("snip_" + "x".repeat(43)));
    expect(badKey instanceof Response && (await badKey.json()).error.code).toBe("invalid_key");
    const ok = await v1Auth(req(r.key));
    expect(ok instanceof Response).toBe(false);
    if (!(ok instanceof Response)) {
      expect(ok.user.id).toBe("k3");
      expect(ok.headers["X-RateLimit-Limit"]).toBe("120");
    }
  });
});

describe("entrada pública", () => {
  it("traduce snake_case al formato interno", () => {
    expect(
      fromPublicInput({ url: "https://a.mx", slug: "uno", is_active: false, expires_at: null, max_clicks: 5, password: "abcd", hack: "x" }),
    ).toEqual({ url: "https://a.mx", alias: "uno", isActive: false, expiresAt: null, access: { maxClicks: 5, password: "abcd" } });
    expect(fromPublicInput([1, 2])).toEqual({});
    expect(fromPublicInput(null)).toEqual({});
  });

  it("crea y edita con las mismas reglas que la app", async () => {
    await user("k4");
    const bad = await createFromInput({ id: "k4" }, { url: "javascript:alert(1)" }, "9.9.9.9", []);
    expect(bad).toMatchObject({ ok: false, status: 400, field: "url" });
    const ok = await createFromInput({ id: "k4" }, fromPublicInput({ url: "https://k4.mx", alias: "api-k4", tags: ["API"], max_clicks: 3 }), "9.9.9.9", []);
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(ok.value).toMatchObject({ slug: "api-k4", max_clicks: 3 });
    const dup = await createFromInput({ id: "k4" }, { url: "https://k4.mx/2", alias: "api-k4" }, "9.9.9.9", []);
    expect(dup).toMatchObject({ ok: false, status: 409 });
    const edited = await updateFromInput(ok.value, fromPublicInput({ title: "Editado", is_active: false }), []);
    expect(edited.ok && edited.value).toMatchObject({ title: "Editado", is_active: 0 });
  });
});

import { describe, expect, it, vi } from "vitest";

const sent: { to: string; subject: string }[] = [];
vi.mock("@/lib/mailer", async (orig) => ({
  ...(await orig<typeof import("@/lib/mailer")>()),
  sendMail: vi.fn(async (m: { to: string; subject: string }) => {
    sent.push(m);
    return true;
  }),
}));

const { blockedReason, isUnlocked, unlockToken } = await import("@/lib/access");
const { parseAccess } = await import("@/lib/validation");
const { get, run } = await import("@/lib/db");
const { createLink, getOwnLink, linkDTO, updateLink } = await import("@/lib/links");
const { recordClick } = await import("@/lib/clicks");
const { verifyPassword } = await import("@/lib/ids");

const H = 3_600_000;
const base = { active: true, expiresAt: null, startsAt: null, maxClicks: null };

describe("blockedReason", () => {
  it("decide por qué un enlace no redirige", () => {
    const now = 1_000 * H;
    expect(blockedReason(base, 0, now)).toBeNull();
    expect(blockedReason({ ...base, startsAt: now + H }, 0, now)).toBe("scheduled");
    expect(blockedReason({ ...base, startsAt: now - H }, 0, now)).toBeNull();
    expect(blockedReason({ ...base, maxClicks: 3 }, 2, now)).toBeNull();
    expect(blockedReason({ ...base, maxClicks: 3 }, 3, now)).toBe("limit");
    expect(blockedReason({ ...base, expiresAt: now - 1 }, 0, now)).toBe("expired");
    expect(blockedReason({ ...base, active: false }, 0, now)).toBe("paused");
    // Vencido gana a todo lo demás.
    expect(blockedReason({ active: false, expiresAt: now - 1, startsAt: now + H, maxClicks: 1 }, 5, now)).toBe("expired");
  });
});

describe("desbloqueo con contraseña", () => {
  it("el token depende del enlace y de la contraseña", () => {
    const t = unlockToken("l1", "hash-a");
    expect(isUnlocked(t, "l1", "hash-a")).toBe(true);
    expect(isUnlocked(t, "l2", "hash-a")).toBe(false);
    expect(isUnlocked(t, "l1", "hash-b")).toBe(false); // al cambiar la contraseña se cierra
    expect(isUnlocked(undefined, "l1", "hash-a")).toBe(false);
    expect(isUnlocked("corto", "l1", "hash-a")).toBe(false);
  });
});

describe("parseAccess", () => {
  it("valida fechas y convierte vacíos en 'quitar'", () => {
    expect(parseAccess({ password: "", startsAt: "", maxClicks: null }, null)).toEqual({ ok: true, patch: { password: null, startsAt: null, maxClicks: null } });
    expect(parseAccess({ startsAt: "no-es-fecha" }, null)).toMatchObject({ ok: false, field: "startsAt" });
    const exp = Date.parse("2030-01-01T00:00:00Z");
    expect(parseAccess({ startsAt: "2031-01-01T00:00:00Z" }, exp)).toMatchObject({ ok: false, field: "startsAt" });
    expect(parseAccess({ startsAt: "2029-01-01T00:00:00Z", notifyAt: 100 }, exp)).toEqual({ ok: true, patch: { startsAt: Date.parse("2029-01-01T00:00:00Z"), notifyAt: 100 } });
  });
});

describe("enlaces con controles de acceso", () => {
  it("guarda la contraseña como hash, programa, limita y la quita", async () => {
    await run("INSERT INTO users (id, email, name, password_hash, timezone, created_at) VALUES (?, ?, ?, NULL, ?, ?)", "f4", "f4@prueba.mx", "Fer", "UTC", Date.now());
    const l = await createLink({ userId: "f4", url: "https://f4.mx/", expiresAt: null, access: { password: "secreto", startsAt: Date.now() + H, maxClicks: 5 } });
    const row = await get<{ password_hash: string }>("SELECT password_hash FROM links WHERE id = ?", l.id);
    expect(row!.password_hash).not.toContain("secreto");
    expect(verifyPassword("secreto", row!.password_hash)).toBe(true);
    const dto = await linkDTO((await getOwnLink("f4", l.id))!);
    expect(dto).toMatchObject({ protected: true, status: "scheduled", maxClicks: 5 });
    expect(JSON.stringify(dto)).not.toContain(row!.password_hash);

    await updateLink((await getOwnLink("f4", l.id))!, { access: { password: null, startsAt: null } });
    expect(await linkDTO((await getOwnLink("f4", l.id))!)).toMatchObject({ protected: false, status: "active", maxClicks: 5 });
  });

  it("avisa por correo una sola vez al llegar a la meta", async () => {
    const l = await createLink({ userId: "f4", url: "https://f4.mx/meta", expiresAt: null, title: "Meta", access: { notifyAt: 2 } });
    const h = new Headers({ "user-agent": "Mozilla/5.0 (Windows NT 10.0) Chrome/130" });
    sent.length = 0;
    await recordClick(l.id, h, "1.1.1.1");
    expect(sent).toHaveLength(0);
    await recordClick(l.id, h, "1.1.1.2");
    await recordClick(l.id, h, "1.1.1.3");
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ to: "f4@prueba.mx" });
    expect(sent[0].subject).toContain("2 clics");

    // Si cambia la meta, se puede volver a avisar.
    await updateLink((await getOwnLink("f4", l.id))!, { access: { notifyAt: 4 } });
    await recordClick(l.id, h, "1.1.1.4");
    expect(sent).toHaveLength(2);
  });

  it("los bots no cuentan para el aviso", async () => {
    const l = await createLink({ userId: "f4", url: "https://f4.mx/bot", expiresAt: null, access: { notifyAt: 1 } });
    sent.length = 0;
    await recordClick(l.id, new Headers({ "user-agent": "WhatsApp/2.0" }), "2.2.2.2");
    expect(sent).toHaveLength(0);
  });
});

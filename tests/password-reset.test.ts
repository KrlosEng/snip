import { beforeEach, describe, expect, it, vi } from "vitest";

const sent: { to: string; text: string }[] = [];
vi.mock("@/lib/mailer", () => ({
  sendMail: vi.fn(async (m: { to: string; text: string }) => {
    sent.push(m);
    return true;
  }),
  resetEmail: ({ link }: { link: string }) => ({ subject: "x", text: link, html: link }),
}));

const { get, run } = await import("@/lib/db");
const { hashPassword, verifyPassword } = await import("@/lib/ids");
const { completePasswordReset, requestPasswordReset } = await import("@/lib/password-reset");
const { DEMO_EMAIL } = await import("@/lib/seed");

let n = 0;
async function newUser() {
  const id = `u${++n}`;
  await run("INSERT INTO users (id, email, name, password_hash, timezone, created_at) VALUES (?, ?, ?, ?, ?, ?)", id, `${id}@prueba.mx`, id, hashPassword("vieja-clave"), "UTC", Date.now());
  await run("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)", `s-${id}`, id, Date.now() + 1e6);
  return { id, email: `${id}@prueba.mx` };
}
const tokenFrom = (text: string) => new URL(text).searchParams.get("token")!;

beforeEach(() => {
  sent.length = 0;
});

describe("recuperar contraseña", () => {
  it("envía un enlace y guarda solo el hash del token", async () => {
    const u = await newUser();
    await requestPasswordReset(u.email.toUpperCase(), "https://snip.test", "1.1.1.1");
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe(u.email);
    const token = tokenFrom(sent[0].text);
    expect(await get("SELECT 1 AS x FROM password_resets WHERE token_hash = ?", token)).toBeUndefined();
  });

  it("no envía nada para correos desconocidos ni para la demo", async () => {
    await requestPasswordReset("nadie@prueba.mx", "https://snip.test", "1.1.1.2");
    await requestPasswordReset(DEMO_EMAIL, "https://snip.test", "1.1.1.2");
    expect(sent).toHaveLength(0);
  });

  it("cambia la contraseña, cierra las sesiones y el enlace sirve una sola vez", async () => {
    const u = await newUser();
    await requestPasswordReset(u.email, "https://snip.test", "1.1.1.3");
    const token = tokenFrom(sent[0].text);

    const ok = await completePasswordReset(token, "nueva-clave-segura");
    expect(ok).toEqual({ ok: true, userId: u.id });
    const row = await get<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = ?", u.id);
    expect(verifyPassword("nueva-clave-segura", row!.password_hash)).toBe(true);
    expect(await get("SELECT 1 AS x FROM sessions WHERE user_id = ?", u.id)).toBeUndefined();

    expect((await completePasswordReset(token, "otra-clave-larga")).ok).toBe(false);
  });

  it("dos usos simultáneos del mismo enlace: solo uno gana", async () => {
    const u = await newUser();
    await requestPasswordReset(u.email, "https://snip.test", "1.1.1.4");
    const token = tokenFrom(sent[0].text);
    const results = await Promise.all([completePasswordReset(token, "clave-numero-1"), completePasswordReset(token, "clave-numero-2")]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
  });

  it("pedir un enlace nuevo invalida el anterior", async () => {
    const u = await newUser();
    await requestPasswordReset(u.email, "https://snip.test", "1.1.1.5");
    await requestPasswordReset(u.email, "https://snip.test", "1.1.1.5");
    const [first, second] = sent.map((m) => tokenFrom(m.text));
    expect((await completePasswordReset(first, "clave-larga-1")).ok).toBe(false);
    expect((await completePasswordReset(second, "clave-larga-2")).ok).toBe(true);
  });

  it("rechaza enlaces vencidos, inventados y contraseñas cortas", async () => {
    const u = await newUser();
    await requestPasswordReset(u.email, "https://snip.test", "1.1.1.6");
    const token = tokenFrom(sent[0].text);
    expect((await completePasswordReset(token, "corta")).ok).toBe(false);
    expect((await completePasswordReset("inventado".repeat(5), "clave-larga-3")).ok).toBe(false);
    await run("UPDATE password_resets SET expires_at = ? WHERE user_id = ?", Date.now() - 1, u.id);
    expect((await completePasswordReset(token, "clave-larga-3")).ok).toBe(false);
  });

  it("limita las solicitudes por correo (3 por hora)", async () => {
    const u = await newUser();
    for (let i = 0; i < 5; i++) await requestPasswordReset(u.email, "https://snip.test", `2.2.2.${i}`);
    expect(sent).toHaveLength(3);
  });
});

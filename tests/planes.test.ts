import { describe, expect, it } from "vitest";
import { run } from "@/lib/db";
import { linkQuotaError, monthStart, planOf, PLANS, usageOf } from "@/lib/plans";
import { createFromInput } from "@/lib/link-create";
import { importLinks, ImportError } from "@/lib/links-import";
import { createKey } from "@/lib/api-keys";
import { createWorkspace, inviteMember } from "@/lib/workspaces";
import { DEMO_EMAIL } from "@/lib/seed";

async function user(id: string, email = `${id}@prueba.mx`) {
  await run("INSERT INTO users (id, email, name, password_hash, timezone, created_at) VALUES (?, ?, ?, NULL, ?, ?)", id, email, id, "UTC", Date.now());
}

async function fillLinks(userId: string, count: number) {
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    await run(
      "INSERT INTO links (id, user_id, slug, destination_url, title, is_active, expires_at, click_count, created_at, updated_at) VALUES (?, ?, ?, ?, NULL, 1, NULL, 0, ?, ?)",
      `${userId}-l${i}`, userId, `${userId}-s${i}`, "https://a.mx/", now, now,
    );
  }
}

describe("planes", () => {
  it("todos empiezan en Gratis; el Pro vence y la demo es Pro", async () => {
    await user("p1");
    expect((await planOf("p1")).id).toBe("free");
    await run("UPDATE users SET plan = 'pro', plan_until = ? WHERE id = ?", Date.now() + 86_400_000, "p1");
    expect((await planOf("p1")).id).toBe("pro");
    await run("UPDATE users SET plan_until = ? WHERE id = ?", Date.now() - 1, "p1");
    expect((await planOf("p1")).id).toBe("free");
    await run("UPDATE users SET plan = 'pro', plan_until = NULL WHERE id = ?", "p1");
    expect((await planOf("p1")).until).toBeNull();
    expect((await planOf("p1")).id).toBe("pro");

    await user("demo-x", DEMO_EMAIL);
    expect((await planOf("demo-x")).id).toBe("pro");
  });

  it("el mes empieza el día 1 en UTC", () => {
    expect(monthStart(Date.UTC(2026, 10, 30, 23, 0))).toBe(Date.UTC(2026, 10, 1));
  });

  it("Gratis: tope de enlaces al mes, sin contraseña ni CSV", async () => {
    await user("p2");
    await fillLinks("p2", PLANS.free.limits.linksPerMonth - 1);
    expect(await linkQuotaError("p2")).toBeNull();
    const last = await createFromInput({ id: "p2" }, { url: "https://ultimo.mx" }, "1.2.3.4", []);
    expect(last.ok).toBe(true);
    const over = await createFromInput({ id: "p2" }, { url: "https://uno-mas.mx" }, "1.2.3.4", []);
    expect(over).toMatchObject({ ok: false, status: 403 });
    expect(!over.ok && over.error).toMatch(/plan Gratis/);
    expect((await usageOf("p2")).linksThisMonth).toBe(PLANS.free.limits.linksPerMonth);

    await user("p3");
    const pw = await createFromInput({ id: "p3" }, { url: "https://secreto.mx", access: { password: "abcd1234" } }, "1.2.3.4", []);
    expect(pw).toMatchObject({ ok: false, status: 403, field: "password" });
    await expect(importLinks("p3", "destino\nhttps://a.mx", [])).rejects.toBeInstanceOf(ImportError);

    // Con Pro, ambas cosas funcionan.
    await run("UPDATE users SET plan = 'pro' WHERE id = ?", "p3");
    expect((await createFromInput({ id: "p3" }, { url: "https://secreto.mx", access: { password: "abcd1234" } }, "1.2.3.4", [])).ok).toBe(true);
    expect((await importLinks("p3", "destino\nhttps://a.mx", [])).created).toBe(1);
  });

  it("Gratis: 1 clave, 1 equipo y 3 lugares por equipo (contando invitaciones)", async () => {
    await user("p4");
    expect((await createKey("p4", "uno")).ok).toBe(true);
    const k2 = await createKey("p4", "dos");
    expect(k2.ok).toBe(false);
    expect(!k2.ok && k2.error).toMatch(/Gratis/);

    const t = await createWorkspace("p4", "Único");
    expect(t.ok).toBe(true);
    expect((await createWorkspace("p4", "Otro")).ok).toBe(false);
    if (!t.ok) return;
    expect((await inviteMember(t.value.id, "p4", "a@prueba.mx", "editor", "https://snip.test")).ok).toBe(true);
    expect((await inviteMember(t.value.id, "p4", "b@prueba.mx", "editor", "https://snip.test")).ok).toBe(true);
    const third = await inviteMember(t.value.id, "p4", "c@prueba.mx", "editor", "https://snip.test");
    expect(third.ok).toBe(false);
    // Reenviar la invitación al mismo correo no ocupa otro lugar.
    expect((await inviteMember(t.value.id, "p4", "b@prueba.mx", "viewer", "https://snip.test")).ok).toBe(true);
  });
});

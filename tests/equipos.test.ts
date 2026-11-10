import { describe, expect, it, vi } from "vitest";

const mails: { to: string; text: string }[] = [];
vi.mock("@/lib/mailer", async (orig) => ({
  ...(await orig<typeof import("@/lib/mailer")>()),
  sendMail: vi.fn(async (m: { to: string; text: string }) => {
    mails.push(m);
    return true;
  }),
}));

const { run, get } = await import("@/lib/db");
const ws = await import("@/lib/workspaces");
const { createLink, getOwnLink, listLinks, listFacets } = await import("@/lib/links");

async function user(id: string) {
  await run("INSERT INTO users (id, email, name, password_hash, timezone, created_at) VALUES (?, ?, ?, NULL, ?, ?)", id, `${id}@prueba.mx`, id.toUpperCase(), "UTC", Date.now());
  return { id, email: `${id}@prueba.mx` };
}
const tokenFrom = (text: string) => new URL(text.match(/https?:\/\/\S+/)![0]).searchParams.get("token")!;

describe("equipos y roles", () => {
  it("flujo completo: crear, invitar, aceptar, roles, permisos y salir", async () => {
    const ana = await user("ana");
    const beto = await user("beto");
    const caro = await user("caro");

    const created = await ws.createWorkspace(ana.id, "  Marketing  ");
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const team = created.value.id;
    expect(created.value.name).toBe("Marketing");
    expect(await ws.roleIn(ana.id, team)).toBe("owner");

    // Solo el dueño invita; no se puede invitar como dueño.
    expect((await ws.inviteMember(team, beto.id, "caro@prueba.mx", "editor", "https://snip.test")).ok).toBe(false);
    expect((await ws.inviteMember(team, ana.id, "beto@prueba.mx", "owner", "https://snip.test")).ok).toBe(false);

    mails.length = 0;
    expect((await ws.inviteMember(team, ana.id, "BETO@prueba.mx", "editor", "https://snip.test")).ok).toBe(true);
    expect(mails[0].to).toBe("beto@prueba.mx");
    const tokenBeto = tokenFrom(mails[0].text);

    // Otra cuenta no puede usar la invitación de Beto.
    expect((await ws.acceptInvite(tokenBeto, caro)).ok).toBe(false);
    expect((await ws.acceptInvite(tokenBeto, beto)).ok).toBe(true);
    expect((await ws.acceptInvite(tokenBeto, beto)).ok).toBe(false); // un solo uso
    expect(await ws.roleIn(beto.id, team)).toBe("editor");

    // Enlaces del equipo: los ven los miembros, no quien no es parte.
    const teamScope = await ws.currentScope(beto.id, team);
    expect(teamScope).toMatchObject({ workspaceId: team, role: "editor", name: "Marketing" });
    const link = await createLink({ userId: beto.id, workspaceId: team, url: "https://equipo.mx/", expiresAt: null, folder: "Campañas", tags: ["q4"] });
    const personal = await createLink({ userId: ana.id, url: "https://solo-ana.mx/", expiresAt: null });
    expect(await getOwnLink(ana.id, link.id)).not.toBeNull();
    expect(await getOwnLink(caro.id, link.id)).toBeNull();
    expect(await getOwnLink(beto.id, personal.id)).toBeNull();
    expect((await listLinks(teamScope, {})).items.map((l) => l.id)).toEqual([link.id]);
    expect((await listLinks(ana.id, {})).items.map((l) => l.id)).toEqual([personal.id]);
    expect(await listFacets(teamScope)).toEqual({ folders: [{ name: "Campañas", count: 1 }], tags: [{ name: "q4", count: 1 }] });

    // La cookie de un equipo ajeno no da acceso: vuelve a personal.
    expect((await ws.currentScope(caro.id, team)).workspaceId).toBeNull();

    // Roles: el dueño cambia a lector; un lector no puede editar.
    expect((await ws.changeRole(team, beto.id, beto.id, "viewer")).ok).toBe(false);
    expect((await ws.changeRole(team, ana.id, beto.id, "viewer")).ok).toBe(true);
    expect(ws.canEdit(await ws.linkRole(beto.id, link))).toBe(false);
    expect(ws.canEdit(await ws.linkRole(ana.id, link))).toBe(true);
    expect(ws.canEdit(await ws.linkRole(ana.id, personal))).toBe(true);
    expect(await ws.linkRole(caro.id, personal)).toBeNull();

    // El dueño no puede salirse; el miembro sí, y su enlace se queda en el equipo.
    expect((await ws.removeMember(team, ana.id, ana.id)).ok).toBe(false);
    expect((await ws.removeMember(team, beto.id, beto.id)).ok).toBe(true);
    expect(await ws.roleIn(beto.id, team)).toBeNull();
    expect(await getOwnLink(ana.id, link.id)).not.toBeNull();

    // Borrar el equipo: los enlaces pasan al espacio personal del dueño.
    expect((await ws.deleteWorkspace(team, beto.id)).ok).toBe(false);
    expect((await ws.deleteWorkspace(team, ana.id)).ok).toBe(true);
    const moved = await get<{ user_id: string; workspace_id: string | null }>("SELECT user_id, workspace_id FROM links WHERE id = ?", link.id);
    expect(moved).toEqual({ user_id: ana.id, workspace_id: null });
    expect((await listLinks(ana.id, {})).total).toBe(2);
  });

  it("valida nombres, correos y límites", async () => {
    const dani = await user("dani");
    expect((await ws.createWorkspace(dani.id, "   ")).ok).toBe(false);
    const t = await ws.createWorkspace(dani.id, "Tienda");
    if (!t.ok) throw new Error(t.error);
    expect((await ws.inviteMember(t.value.id, dani.id, "no-es-correo", "viewer", "https://snip.test")).ok).toBe(false);
    expect((await ws.inviteMember(t.value.id, dani.id, "dani@prueba.mx", "viewer", "https://snip.test")).ok).toBe(false); // ya es miembro
    for (let i = 1; i < ws.MAX_WORKSPACES; i++) await ws.createWorkspace(dani.id, `E${i}`);
    expect((await ws.createWorkspace(dani.id, "Uno más")).ok).toBe(false);
  });
});

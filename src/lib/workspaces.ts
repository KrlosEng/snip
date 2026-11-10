import "server-only";
import { all, get, run, type LinkRow } from "./db";
import { randomToken, sha256, uuid } from "./ids";
import { inviteEmail, sendMail } from "./mailer";

/**
 * Espacios de trabajo (equipos). Cada persona tiene su espacio personal
 * (enlaces con workspace_id NULL) y puede pertenecer a equipos con un rol:
 * - owner: todo, incluido invitar, cambiar roles, renombrar y borrar el equipo.
 * - editor: crear, editar y borrar enlaces del equipo.
 * - viewer: solo ver enlaces y estadísticas.
 */

export type Role = "owner" | "editor" | "viewer";
export const ROLES: Role[] = ["owner", "editor", "viewer"];
export const ROLE_LABEL: Record<Role, string> = { owner: "Dueño", editor: "Editor", viewer: "Lector" };
export const WS_COOKIE = "snip_ws";
export const MAX_WORKSPACES = 10;
export const MAX_MEMBERS = 25;
export const INVITE_DAYS = 7;

/** Dónde trabaja la persona ahora: su espacio personal o un equipo. */
export type Scope = { userId: string; workspaceId: string | null; role: Role; name: string };

export const personalScope = (userId: string): Scope => ({ userId, workspaceId: null, role: "owner", name: "Personal" });
export const canEdit = (role: Role | null | undefined) => role === "owner" || role === "editor";

/** SQL para filtrar enlaces del espacio (prefijo opcional de tabla). */
export function scopeSql(s: Scope, t = ""): { sql: string; args: string[] } {
  return s.workspaceId ? { sql: `${t}workspace_id = ?`, args: [s.workspaceId] } : { sql: `${t}user_id = ? AND ${t}workspace_id IS NULL`, args: [s.userId] };
}

export async function roleIn(userId: string, workspaceId: string): Promise<Role | null> {
  const r = await get<{ role: Role }>("SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?", workspaceId, userId);
  return r?.role ?? null;
}

/** Espacio activo según la cookie; si ya no es miembro, vuelve al personal. */
export async function currentScope(userId: string, cookieValue: string | undefined): Promise<Scope> {
  if (!cookieValue) return personalScope(userId);
  const r = await get<{ role: Role; name: string }>(
    "SELECT m.role, w.name FROM workspace_members m JOIN workspaces w ON w.id = m.workspace_id WHERE m.workspace_id = ? AND m.user_id = ?",
    cookieValue,
    userId,
  );
  return r ? { userId, workspaceId: cookieValue, role: r.role, name: r.name } : personalScope(userId);
}

/** Rol de la persona sobre un enlace concreto (null = no tiene acceso). */
export async function linkRole(userId: string, link: Pick<LinkRow, "user_id" | "workspace_id">): Promise<Role | null> {
  if (!link.workspace_id) return link.user_id === userId ? "owner" : null;
  return roleIn(userId, link.workspace_id);
}

export type WorkspaceItem = { id: string; name: string; role: Role; members: number };

export async function listMyWorkspaces(userId: string): Promise<WorkspaceItem[]> {
  const rows = await all<{ id: string; name: string; role: Role; members: number }>(
    `SELECT w.id, w.name, m.role, (SELECT CAST(COUNT(*) AS INTEGER) FROM workspace_members x WHERE x.workspace_id = w.id) AS members
     FROM workspace_members m JOIN workspaces w ON w.id = m.workspace_id WHERE m.user_id = ? ORDER BY LOWER(w.name)`,
    userId,
  );
  return rows.map((r) => ({ ...r, members: Number(r.members) }));
}

type Result<T = true> = { ok: true; value: T } | { ok: false; error: string; status?: number };
const no = (error: string, status = 400) => ({ ok: false as const, error, status });
const cleanName = (n: string) => n.trim().replace(/\s+/g, " ").slice(0, 40);

export async function createWorkspace(userId: string, nameRaw: string): Promise<Result<WorkspaceItem>> {
  const name = cleanName(nameRaw);
  if (!name) return no("Ponle un nombre al equipo.");
  const owned = Number((await get<{ n: number }>("SELECT CAST(COUNT(*) AS INTEGER) AS n FROM workspaces WHERE owner_id = ?", userId))?.n ?? 0);
  if (owned >= MAX_WORKSPACES) return no(`Puedes crear hasta ${MAX_WORKSPACES} equipos.`);
  const id = uuid();
  const now = Date.now();
  await run("INSERT INTO workspaces (id, name, owner_id, created_at) VALUES (?, ?, ?, ?)", id, name, userId, now);
  await run("INSERT INTO workspace_members (workspace_id, user_id, role, created_at) VALUES (?, ?, 'owner', ?)", id, userId, now);
  return { ok: true, value: { id, name, role: "owner", members: 1 } };
}

async function requireOwner(workspaceId: string, actorId: string): Promise<Result> {
  return (await roleIn(actorId, workspaceId)) === "owner" ? { ok: true, value: true } : no("Solo el dueño del equipo puede hacer esto.", 403);
}

export async function renameWorkspace(workspaceId: string, actorId: string, nameRaw: string): Promise<Result> {
  const own = await requireOwner(workspaceId, actorId);
  if (!own.ok) return own;
  const name = cleanName(nameRaw);
  if (!name) return no("Ponle un nombre al equipo.");
  await run("UPDATE workspaces SET name = ? WHERE id = ?", name, workspaceId);
  return { ok: true, value: true };
}

/** Borra el equipo. Sus enlaces no se pierden: pasan al espacio personal del dueño. */
export async function deleteWorkspace(workspaceId: string, actorId: string): Promise<Result> {
  const own = await requireOwner(workspaceId, actorId);
  if (!own.ok) return own;
  await run("UPDATE links SET user_id = ?, workspace_id = NULL WHERE workspace_id = ?", actorId, workspaceId);
  await run("DELETE FROM workspaces WHERE id = ?", workspaceId);
  return { ok: true, value: true };
}

export type Member = { userId: string; name: string; email: string; role: Role; joinedAt: number };
export type PendingInvite = { id: string; email: string; role: Role; expiresAt: number };

export async function teamDetail(workspaceId: string): Promise<{ members: Member[]; invites: PendingInvite[] }> {
  const [members, invites] = await Promise.all([
    all<{ user_id: string; name: string; email: string; role: Role; created_at: number }>(
      `SELECT m.user_id, u.name, u.email, m.role, m.created_at FROM workspace_members m JOIN users u ON u.id = m.user_id
       WHERE m.workspace_id = ? ORDER BY CASE m.role WHEN 'owner' THEN 0 WHEN 'editor' THEN 1 ELSE 2 END, LOWER(u.name)`,
      workspaceId,
    ),
    all<{ id: string; email: string; role: Role; expires_at: number }>(
      "SELECT id, email, role, expires_at FROM workspace_invites WHERE workspace_id = ? AND accepted_at IS NULL AND expires_at > ? ORDER BY created_at DESC",
      workspaceId,
      Date.now(),
    ),
  ]);
  return {
    members: members.map((m) => ({ userId: m.user_id, name: m.name, email: m.email, role: m.role, joinedAt: Number(m.created_at) })),
    invites: invites.map((i) => ({ id: i.id, email: i.email, role: i.role, expiresAt: Number(i.expires_at) })),
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Invita por correo (solo el dueño). Reemplaza una invitación pendiente al mismo correo. */
export async function inviteMember(
  workspaceId: string,
  actorId: string,
  emailRaw: string,
  role: Role,
  origin: string,
): Promise<Result<PendingInvite>> {
  const own = await requireOwner(workspaceId, actorId);
  if (!own.ok) return own;
  const email = emailRaw.trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 200) return no("Ese correo no parece válido.");
  if (role === "owner") return no("Solo puede haber un dueño. Invita como editor o lector.");
  const ws = await get<{ name: string }>("SELECT name FROM workspaces WHERE id = ?", workspaceId);
  if (!ws) return no("El equipo ya no existe.", 404);
  if (await get("SELECT 1 AS x FROM workspace_members m JOIN users u ON u.id = m.user_id WHERE m.workspace_id = ? AND u.email = ?", workspaceId, email)) {
    return no("Esa persona ya es parte del equipo.");
  }
  const count = Number((await get<{ n: number }>("SELECT CAST(COUNT(*) AS INTEGER) AS n FROM workspace_members WHERE workspace_id = ?", workspaceId))?.n ?? 0);
  if (count >= MAX_MEMBERS) return no(`Un equipo puede tener hasta ${MAX_MEMBERS} personas.`);

  await run("DELETE FROM workspace_invites WHERE workspace_id = ? AND email = ? AND accepted_at IS NULL", workspaceId, email);
  const token = randomToken(32);
  const now = Date.now();
  const invite: PendingInvite = { id: uuid(), email, role, expiresAt: now + INVITE_DAYS * 86_400_000 };
  await run(
    "INSERT INTO workspace_invites (id, workspace_id, email, role, token_hash, invited_by, expires_at, accepted_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?)",
    invite.id, workspaceId, email, role, sha256(token), actorId, invite.expiresAt, now,
  );
  const inviter = await get<{ name: string }>("SELECT name FROM users WHERE id = ?", actorId);
  await sendMail({ to: email, ...inviteEmail({ team: ws.name, inviter: inviter?.name ?? "Alguien", role: ROLE_LABEL[role], link: `${origin}/invite?token=${encodeURIComponent(token)}` }) });
  return { ok: true, value: invite };
}

export async function cancelInvite(workspaceId: string, actorId: string, inviteId: string): Promise<Result> {
  const own = await requireOwner(workspaceId, actorId);
  if (!own.ok) return own;
  await run("DELETE FROM workspace_invites WHERE id = ? AND workspace_id = ? AND accepted_at IS NULL", inviteId, workspaceId);
  return { ok: true, value: true };
}

export type InviteInfo = { workspaceId: string; team: string; email: string; role: Role; inviter: string; valid: boolean };

export async function inviteInfo(token: string): Promise<InviteInfo | null> {
  const r = await get<{ workspace_id: string; name: string; email: string; role: Role; inviter: string; expires_at: number; accepted_at: number | null }>(
    `SELECT i.workspace_id, w.name, i.email, i.role, u.name AS inviter, i.expires_at, i.accepted_at
     FROM workspace_invites i JOIN workspaces w ON w.id = i.workspace_id JOIN users u ON u.id = i.invited_by WHERE i.token_hash = ?`,
    sha256(token),
  );
  if (!r) return null;
  return { workspaceId: r.workspace_id, team: r.name, email: r.email, role: r.role, inviter: r.inviter, valid: r.accepted_at == null && Number(r.expires_at) > Date.now() };
}

/** Acepta la invitación: solo con la cuenta del correo invitado, y una sola vez. */
export async function acceptInvite(token: string, user: { id: string; email: string }): Promise<Result<{ workspaceId: string }>> {
  const info = await inviteInfo(token);
  if (!info || !info.valid) return no("La invitación venció o ya se usó. Pide una nueva.", 410);
  if (info.email !== user.email.toLowerCase()) return no(`Esta invitación es para ${info.email}. Entra con esa cuenta para aceptarla.`, 403);
  const claimed = await get<{ id: string }>(
    "UPDATE workspace_invites SET accepted_at = ? WHERE token_hash = ? AND accepted_at IS NULL RETURNING id",
    Date.now(),
    sha256(token),
  );
  if (!claimed) return no("La invitación ya se usó.", 410);
  await run(
    "INSERT INTO workspace_members (workspace_id, user_id, role, created_at) VALUES (?, ?, ?, ?) ON CONFLICT (workspace_id, user_id) DO NOTHING",
    info.workspaceId, user.id, info.role, Date.now(),
  );
  return { ok: true, value: { workspaceId: info.workspaceId } };
}

export async function changeRole(workspaceId: string, actorId: string, targetId: string, role: Role): Promise<Result> {
  const own = await requireOwner(workspaceId, actorId);
  if (!own.ok) return own;
  if (targetId === actorId) return no("No puedes cambiar tu propio rol de dueño.");
  if (role === "owner") return no("Solo puede haber un dueño.");
  const r = await get<{ user_id: string }>("UPDATE workspace_members SET role = ? WHERE workspace_id = ? AND user_id = ? RETURNING user_id", role, workspaceId, targetId);
  return r ? { ok: true, value: true } : no("Esa persona no es parte del equipo.", 404);
}

/** Quita a alguien (el dueño) o salirse (cualquiera menos el dueño). Sus enlaces se quedan en el equipo. */
export async function removeMember(workspaceId: string, actorId: string, targetId: string): Promise<Result> {
  const actorRole = await roleIn(actorId, workspaceId);
  if (!actorRole) return no("No eres parte de este equipo.", 403);
  if (targetId === actorId) {
    if (actorRole === "owner") return no("El dueño no puede salirse. Borra el equipo si ya no lo necesitas.");
  } else if (actorRole !== "owner") {
    return no("Solo el dueño puede quitar personas.", 403);
  }
  await run("DELETE FROM workspace_members WHERE workspace_id = ? AND user_id = ? AND role <> 'owner'", workspaceId, targetId);
  return { ok: true, value: true };
}

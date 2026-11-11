import "server-only";
import { get } from "./db";
import { DEMO_EMAIL } from "./seed";

/**
 * Planes y límites. Por ahora no se cobra: el plan se asigna a mano con
 * `node scripts/set-plan.mjs correo pro [días]`. Lo que ya existe nunca se
 * borra al bajar de plan; solo se bloquea crear más allá del límite.
 */

export type PlanId = "free" | "pro";

export type Limits = {
  linksPerMonth: number;
  teams: number;
  membersPerTeam: number;
  apiKeys: number;
  csvImport: boolean;
  passwordLinks: boolean;
  statsDays: 30 | 90;
};

export const PLANS: Record<PlanId, { name: string; limits: Limits }> = {
  free: {
    name: "Gratis",
    limits: { linksPerMonth: 50, teams: 1, membersPerTeam: 3, apiKeys: 1, csvImport: false, passwordLinks: false, statsDays: 30 },
  },
  pro: {
    name: "Pro",
    limits: { linksPerMonth: 2000, teams: 10, membersPerTeam: 25, apiKeys: 5, csvImport: true, passwordLinks: true, statsDays: 90 },
  },
};

export const UPGRADE = "Escríbenos para activarlo.";

export type PlanInfo = { id: PlanId; name: string; limits: Limits; until: number | null };

/** Plan vigente: si el Pro venció, vuelve a Gratis. La demo es Pro para enseñar todo. */
export async function planOf(userId: string): Promise<PlanInfo> {
  const u = await get<{ plan: string | null; plan_until: number | null; email: string }>("SELECT plan, plan_until, email FROM users WHERE id = ?", userId);
  let id: PlanId = u?.plan === "pro" ? "pro" : "free";
  const until = u?.plan_until == null ? null : Number(u.plan_until);
  if (id === "pro" && until !== null && until <= Date.now()) id = "free";
  if (u?.email === DEMO_EMAIL) id = "pro";
  return { id, name: PLANS[id].name, limits: PLANS[id].limits, until: id === "pro" ? until : null };
}

/** Inicio del mes actual en UTC (los contadores se reinician el día 1). */
export function monthStart(now = Date.now()): number {
  const d = new Date(now);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
}

const count = async (sql: string, ...args: (string | number)[]) => Number((await get<{ n: number }>(sql, ...args))?.n ?? 0);

export type Usage = { linksThisMonth: number; teams: number; apiKeys: number };

export async function usageOf(userId: string): Promise<Usage> {
  const [linksThisMonth, teams, apiKeys] = await Promise.all([
    count("SELECT CAST(COUNT(*) AS INTEGER) AS n FROM links WHERE user_id = ? AND created_at >= ?", userId, monthStart()),
    count("SELECT CAST(COUNT(*) AS INTEGER) AS n FROM workspaces WHERE owner_id = ?", userId),
    count("SELECT CAST(COUNT(*) AS INTEGER) AS n FROM api_keys WHERE user_id = ? AND revoked_at IS NULL", userId),
  ]);
  return { linksThisMonth, teams, apiKeys };
}

/** null si puede crear `adding` enlaces más este mes; si no, el mensaje para mostrar. */
export async function linkQuotaError(userId: string, adding = 1): Promise<string | null> {
  const plan = await planOf(userId);
  const used = await count("SELECT CAST(COUNT(*) AS INTEGER) AS n FROM links WHERE user_id = ? AND created_at >= ?", userId, monthStart());
  if (used + adding <= plan.limits.linksPerMonth) return null;
  const left = Math.max(0, plan.limits.linksPerMonth - used);
  return plan.id === "free"
    ? `Tu plan Gratis permite ${plan.limits.linksPerMonth} enlaces nuevos al mes y te ${left === 1 ? "queda 1" : `quedan ${left}`}. Se reinicia el día 1, o pásate a Pro.`
    : `Llegaste a los ${plan.limits.linksPerMonth} enlaces nuevos de este mes. Se reinicia el día 1.`;
}

/** Personas en el equipo más invitaciones pendientes (cuentan para el límite). */
export async function teamSeats(workspaceId: string): Promise<number> {
  const [members, pending] = await Promise.all([
    count("SELECT CAST(COUNT(*) AS INTEGER) AS n FROM workspace_members WHERE workspace_id = ?", workspaceId),
    count("SELECT CAST(COUNT(*) AS INTEGER) AS n FROM workspace_invites WHERE workspace_id = ? AND accepted_at IS NULL AND expires_at > ?", workspaceId, Date.now()),
  ]);
  return members + pending;
}

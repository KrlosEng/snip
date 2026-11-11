import "server-only";
import { rateLimit } from "./cache";
import type { LinkRow } from "./db";
import { createLink, isUnsafe, slugExists, updateLink, type AccessPatch } from "./links";
import { checkDestination, createLinkSchema, parseAccess, parseExpiry, updateLinkSchema } from "./validation";
import { linkQuotaError, planOf, UPGRADE } from "./plans";

/**
 * Crear y editar enlaces desde cualquier entrada (la app o la API pública).
 * Mismas reglas en los dos lados: destino válido, alias libre, fechas futuras,
 * sitios peligrosos bloqueados y límite de enlaces por hora.
 */

export type Outcome<T> = { ok: true; value: T } | { ok: false; status: number; error: string; field?: string };

const ANON_DAYS = 7;
const bad = (status: number, error: string, field?: string) => ({ ok: false as const, status, error, field });

export async function createFromInput(
  user: { id: string } | null,
  raw: unknown,
  ip: string,
  hosts: string[],
  /** Equipo donde se crea (el que llama ya revisó que pueda editar). */
  workspaceId: string | null = null,
): Promise<Outcome<LinkRow>> {
  const limit = user ? await rateLimit(`links:u:${user.id}`, 100) : await rateLimit(`links:ip:${ip}`, 10);
  if (!limit.ok) {
    const mins = Math.ceil(limit.resetIn / 60);
    return bad(
      429,
      user
        ? `Llegaste al límite de 100 enlaces por hora. Intenta de nuevo en ${mins} min.`
        : `Llegaste al límite de 10 enlaces por hora sin cuenta. Crea una cuenta gratis o espera ${mins} min.`,
    );
  }

  const parsed = createLinkSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return bad(400, issue.message, String(issue.path[0] ?? ""));
  }
  const dest = checkDestination(parsed.data.url, hosts);
  if (!dest.ok) return bad(400, dest.error, "url");

  if (user) {
    const quota = await linkQuotaError(user.id);
    if (quota) return bad(403, quota);
  }

  const alias = parsed.data.alias || null;
  if (alias && !user) return bad(401, "Crea una cuenta gratis para elegir tu propio alias.", "alias");
  if (alias && (await slugExists(alias))) return bad(409, "Ese alias ya está ocupado. Prueba otra variante.", "alias");

  let expiresAt: number | null;
  if (user) {
    const exp = parseExpiry(parsed.data.expiresAt);
    if (!exp.ok) return bad(400, exp.error, "expiresAt");
    expiresAt = exp.at;
  } else {
    expiresAt = Date.now() + ANON_DAYS * 86_400_000;
  }

  let access: AccessPatch | undefined;
  if (user && parsed.data.access) {
    const a = parseAccess(parsed.data.access, expiresAt);
    if (!a.ok) return bad(400, a.error, a.field);
    if (a.patch.password && !(await planOf(user.id)).limits.passwordLinks) return bad(403, `Los enlaces con contraseña son del plan Pro. ${UPGRADE}`, "password");
    access = a.patch;
  }

  if (await isUnsafe(dest.url)) return bad(422, "Google marcó ese sitio como peligroso. No podemos acortarlo.", "url");

  try {
    const link = await createLink({
      userId: user?.id ?? null,
      workspaceId: user ? workspaceId : null,
      url: dest.url,
      slug: alias,
      expiresAt,
      title: user ? parsed.data.title : null,
      folder: parsed.data.folder,
      tags: parsed.data.tags,
      access,
    });
    return { ok: true, value: link };
  } catch {
    return bad(409, "Ese alias acaba de ser ocupado. Prueba otro.", "alias");
  }
}

export async function updateFromInput(link: LinkRow, raw: unknown, hosts: string[], actorId?: string): Promise<Outcome<LinkRow>> {
  const parsed = updateLinkSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return bad(400, issue.message, String(issue.path[0] ?? ""));
  }
  const p = parsed.data;
  const patch: Parameters<typeof updateLink>[1] = {};
  if (p.url !== undefined) {
    const dest = checkDestination(p.url, hosts);
    if (!dest.ok) return bad(400, dest.error, "url");
    patch.url = dest.url;
  }
  if (p.alias !== undefined && p.alias !== link.slug) {
    if (await slugExists(p.alias)) return bad(409, "Ese alias ya está ocupado. Prueba otra variante.", "alias");
    patch.slug = p.alias;
  }
  if (p.expiresAt !== undefined) {
    if (p.expiresAt === null || p.expiresAt === "") {
      patch.expiresAt = null;
    } else {
      const exp = parseExpiry(p.expiresAt);
      if (!exp.ok) return bad(400, exp.error, "expiresAt");
      patch.expiresAt = exp.at;
    }
  }
  if (p.isActive !== undefined) patch.isActive = p.isActive;
  if (p.title !== undefined) patch.title = p.title?.trim() || null;
  if (p.folder !== undefined) patch.folder = p.folder;
  if (p.tags !== undefined) patch.tags = p.tags;
  if (p.access) {
    const a = parseAccess(p.access, patch.expiresAt !== undefined ? patch.expiresAt : link.expires_at);
    if (!a.ok) return bad(400, a.error, a.field);
    const payer = actorId ?? link.user_id;
    if (a.patch.password && payer && !(await planOf(payer)).limits.passwordLinks) {
      return bad(403, `Los enlaces con contraseña son del plan Pro. ${UPGRADE}`, "password");
    }
    patch.access = a.patch;
  }
  if (patch.url && (await isUnsafe(patch.url))) return bad(422, "Google marcó ese sitio como peligroso. No podemos usarlo.", "url");
  try {
    return { ok: true, value: await updateLink(link, patch) };
  } catch {
    return bad(409, "Ese alias acaba de ser ocupado. Prueba otro.", "alias");
  }
}

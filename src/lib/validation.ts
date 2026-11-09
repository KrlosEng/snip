import { z } from "zod";

/** Palabras que no pueden usarse como alias porque chocan con rutas de la app. */
export const RESERVED_SLUGS = new Set([
  "api", "login", "register", "logout", "dashboard", "links", "settings", "privacy", "uso-aceptable", "forgot", "reset",
  "admin", "auth", "app", "help", "demo", "static", "_next", "favicon.ico",
  "robots.txt", "sitemap.xml", "snip", "about", "terms", "signup", "signin",
  // alias de la cuenta demo
  "launch-v2", "menu-tacos", "bio", "webinar-nov", "qxr7mzp", "promo-buen-fin", "promo-verano",
]);

export const ALIAS_RE = /^[a-zA-Z0-9-]{3,32}$/;

export const aliasSchema = z
  .string()
  .trim()
  .regex(ALIAS_RE, "Usa de 3 a 32 letras, números o guiones.")
  .refine((s) => !RESERVED_SLUGS.has(s.toLowerCase()), "Esa palabra está reservada. Prueba otra.")
  .refine((s) => !s.startsWith("-") && !s.endsWith("-"), "No puede empezar ni terminar con guion.");

export function normalizeUrl(input: string): string {
  const raw = input.trim();
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw)) return `https://${raw}`;
  return raw;
}

export function checkDestination(input: string, ownHosts: string[]): { ok: true; url: string } | { ok: false; error: string } {
  if (!input.trim()) return { ok: false, error: "Pega el enlace que quieres acortar." };
  if (input.length > 2048) return { ok: false, error: "El enlace es demasiado largo (máximo 2048 caracteres)." };
  let parsed: URL;
  try {
    parsed = new URL(normalizeUrl(input));
  } catch {
    return { ok: false, error: "Eso no parece un enlace válido. Revisa que esté completo." };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: "Solo se aceptan enlaces http o https." };
  }
  if (!parsed.hostname.includes(".") && parsed.hostname !== "localhost") {
    return { ok: false, error: "Al dominio le falta la terminación (por ejemplo .com)." };
  }
  const host = parsed.host.toLowerCase();
  if (ownHosts.some((h) => h && h.toLowerCase() === host)) {
    return { ok: false, error: "Ese enlace ya es de Snip; acortarlo crearía un bucle." };
  }
  return { ok: true, url: parsed.toString() };
}

export const createLinkSchema = z.object({
  url: z.string().min(1, "Pega el enlace que quieres acortar."),
  alias: z.union([aliasSchema, z.literal(""), z.null()]).optional(),
  expiresAt: z.union([z.string(), z.null()]).optional(),
});

export const updateLinkSchema = z.object({
  url: z.string().min(1).optional(),
  alias: aliasSchema.optional(),
  expiresAt: z.union([z.string(), z.null()]).optional(),
  isActive: z.boolean().optional(),
  title: z.union([z.string().max(200), z.null()]).optional(),
});

export function parseExpiry(value: string | null | undefined): { ok: true; at: number | null } | { ok: false; error: string } {
  if (value === undefined || value === null || value === "") return { ok: true, at: null };
  const t = Date.parse(value);
  if (Number.isNaN(t)) return { ok: false, error: "La fecha de vencimiento no es válida." };
  if (t <= Date.now()) return { ok: false, error: "La fecha de vencimiento debe ser futura." };
  return { ok: true, at: t };
}

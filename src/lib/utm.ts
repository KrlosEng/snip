/**
 * Parámetros UTM: le dicen a Google Analytics (y similares) de dónde llegó la visita.
 * Sin dependencias, para usarse en el navegador y en las pruebas.
 */

export const UTM_FIELDS = [
  { key: "utm_source", label: "Fuente", example: "instagram" },
  { key: "utm_medium", label: "Medio", example: "social" },
  { key: "utm_campaign", label: "Campaña", example: "buen-fin" },
  { key: "utm_term", label: "Término", example: "zapatos" },
  { key: "utm_content", label: "Contenido", example: "historia-1" },
] as const;

export type UtmKey = (typeof UTM_FIELDS)[number]["key"];
export type Utm = Partial<Record<UtmKey, string>>;

function parse(url: string): URL | null {
  const raw = url.trim();
  if (!raw) return null;
  try {
    return new URL(/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
}

/** Lee los UTM que ya trae un enlace. */
export function readUtm(url: string): Utm {
  const u = parse(url);
  const out: Utm = {};
  if (!u) return out;
  for (const { key } of UTM_FIELDS) {
    const v = u.searchParams.get(key);
    if (v) out[key] = v;
  }
  return out;
}

export function hasUtm(utm: Utm): boolean {
  return UTM_FIELDS.some(({ key }) => Boolean(utm[key]?.trim()));
}

/**
 * Pone los UTM en el enlace: los vacíos se quitan y los demás parámetros
 * (y el #fragmento) se respetan. Si el enlace no es válido, se devuelve tal cual.
 */
export function applyUtm(url: string, utm: Utm): string {
  const u = parse(url);
  if (!u) return url;
  for (const { key } of UTM_FIELDS) {
    const v = utm[key]?.trim();
    if (v) u.searchParams.set(key, v);
    else u.searchParams.delete(key);
  }
  return u.toString();
}

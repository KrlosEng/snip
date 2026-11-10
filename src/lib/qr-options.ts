/**
 * Opciones del código QR (colores, corrección de errores, tamaño y margen).
 * Sin dependencias: lo usan la ruta que genera el archivo, la vista previa y las pruebas.
 */

export type Ecc = "L" | "M" | "Q" | "H";
export type QrOptions = { fg: string; bg: string; ecc: Ecc; size: number; margin: number };

export const QR_DEFAULTS: QrOptions = { fg: "#1b2130", bg: "#ffffff", ecc: "M", size: 1024, margin: 2 };
export const QR_SIZES = [512, 1024, 2048] as const;
export const ECC_LABEL: Record<Ecc, string> = {
  L: "Baja (7 %)",
  M: "Normal (15 %)",
  Q: "Alta (25 %)",
  H: "Máxima (30 %)",
};

const HEX = /^#?([0-9a-fA-F]{6})$/;

function hex(v: string | null | undefined, fallback: string): string {
  const m = v?.trim().match(HEX);
  return m ? `#${m[1].toLowerCase()}` : fallback;
}

/** Lee y valida las opciones (cualquier valor raro vuelve al valor por defecto). */
export function parseQrOptions(get: (k: string) => string | null | undefined): QrOptions {
  const ecc = get("ecc")?.toUpperCase();
  const size = Number(get("size"));
  const rawMargin = get("margin");
  const margin = Number(rawMargin);
  return {
    fg: hex(get("fg"), QR_DEFAULTS.fg),
    bg: hex(get("bg"), QR_DEFAULTS.bg),
    ecc: ecc === "L" || ecc === "M" || ecc === "Q" || ecc === "H" ? ecc : QR_DEFAULTS.ecc,
    size: (QR_SIZES as readonly number[]).includes(size) ? size : QR_DEFAULTS.size,
    margin: rawMargin != null && rawMargin !== "" && Number.isInteger(margin) && margin >= 0 && margin <= 8 ? margin : QR_DEFAULTS.margin,
  };
}

/** Parámetros de URL solo con lo que cambió respecto al valor por defecto. */
export function qrQuery(o: QrOptions): string {
  const qs = new URLSearchParams();
  if (o.fg !== QR_DEFAULTS.fg) qs.set("fg", o.fg.slice(1));
  if (o.bg !== QR_DEFAULTS.bg) qs.set("bg", o.bg.slice(1));
  if (o.ecc !== QR_DEFAULTS.ecc) qs.set("ecc", o.ecc);
  if (o.size !== QR_DEFAULTS.size) qs.set("size", String(o.size));
  if (o.margin !== QR_DEFAULTS.margin) qs.set("margin", String(o.margin));
  return qs.toString();
}

function luminance(color: string): number {
  const n = parseInt(color.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

/** Contraste WCAG entre dos colores (1 a 21). */
export function contrastRatio(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** Avisos para que el QR se pueda leer con cualquier celular. */
export function qrWarnings(o: QrOptions): string[] {
  const out: string[] = [];
  const ratio = contrastRatio(o.fg, o.bg);
  if (ratio < 3) out.push("Contraste muy bajo: muchos celulares no lo van a leer.");
  else if (ratio < 4.5) out.push("Contraste justo: pruébalo con tu celular antes de imprimir.");
  if (luminance(o.fg) > luminance(o.bg)) out.push("Puntos claros sobre fondo oscuro: algunos lectores viejos no lo leen.");
  return out;
}

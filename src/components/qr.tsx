"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { motion } from "motion/react";
import { Download } from "lucide-react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { cx } from "./ui";
import { EASE } from "./motion";
import { ECC_LABEL, QR_DEFAULTS, QR_SIZES, qrQuery, qrWarnings, type Ecc, type QrOptions } from "@/lib/qr-options";

const SWATCHES = [
  { fg: "#1b2130", bg: "#ffffff", name: "Clásico" },
  { fg: "#5b2fd6", bg: "#ffffff", name: "Violeta" },
  { fg: "#ffffff", bg: "#000000", name: "Invertido" },
  { fg: "#7a3b00", bg: "#fff4dc", name: "Ámbar" },
];

/** Vista previa + opciones de color, corrección y tamaño, con descarga del archivo final. */
export function QrStudio({ value, linkId, caption }: { value: string; linkId: string; caption: string }) {
  const [o, setO] = useState<QrOptions>(QR_DEFAULTS);
  const set = (patch: Partial<QrOptions>) => setO((cur) => ({ ...cur, ...patch }));
  const warnings = qrWarnings(o);
  const q = qrQuery(o);
  const href = (format: "png" | "svg") => `/api/links/${linkId}/qr?format=${format}${q ? `&${q}` : ""}`;
  const changed = q !== "";
  const field = "h-8 rounded-lg border border-line bg-surface px-2 text-[13px] outline-none hover:border-line-strong focus:border-brand";
  const dl =
    "inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface text-[13px] font-semibold text-ink transition-[border-color,transform] hover:border-line-strong active:scale-[0.97]";

  return (
    <div className="grid gap-4">
      <QrPreview value={value} fg={o.fg} bg={o.bg} ecc={o.ecc} className="mx-auto w-full max-w-[220px] border border-line" />
      <p className="-mt-1 text-center text-xs text-ink-3">{caption}</p>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Estilos rápidos">
        {SWATCHES.map((s) => {
          const on = s.fg === o.fg && s.bg === o.bg;
          return (
            <button
              key={s.name}
              type="button"
              onClick={() => set({ fg: s.fg, bg: s.bg })}
              aria-pressed={on}
              title={s.name}
              className={cx("grid size-8 place-items-center rounded-full border transition-transform active:scale-[0.92]", on ? "border-brand ring-2 ring-brand/40" : "border-line")}
              style={{ backgroundColor: s.bg }}
            >
              <span className="size-3.5 rounded-[3px]" style={{ backgroundColor: s.fg }} />
              <span className="sr-only">{s.name}</span>
            </button>
          );
        })}
        {changed && (
          <button type="button" onClick={() => setO(QR_DEFAULTS)} className="ml-auto inline-flex items-center gap-1 text-[12px] font-semibold text-ink-2 hover:text-ink">
            <RotateCcw className="size-3.5" aria-hidden /> Restablecer
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 text-[13px]">
        <label className="grid gap-1">
          <span className="text-ink-3">Puntos</span>
          <span className="flex items-center gap-2">
            <input type="color" value={o.fg} onChange={(e) => set({ fg: e.target.value })} className="h-8 w-10 cursor-pointer rounded border border-line bg-transparent" />
            <span className="font-mono text-[12px] text-ink-2">{o.fg}</span>
          </span>
        </label>
        <label className="grid gap-1">
          <span className="text-ink-3">Fondo</span>
          <span className="flex items-center gap-2">
            <input type="color" value={o.bg} onChange={(e) => set({ bg: e.target.value })} className="h-8 w-10 cursor-pointer rounded border border-line bg-transparent" />
            <span className="font-mono text-[12px] text-ink-2">{o.bg}</span>
          </span>
        </label>
        <label className="grid gap-1">
          <span className="text-ink-3" title="Cuánto del código puede taparse o mancharse y aún leerse">
            Resistencia
          </span>
          <select value={o.ecc} onChange={(e) => set({ ecc: e.target.value as Ecc })} className={field}>
            {(Object.keys(ECC_LABEL) as Ecc[]).map((k) => (
              <option key={k} value={k}>
                {ECC_LABEL[k]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-ink-3">Tamaño PNG</span>
          <select value={o.size} onChange={(e) => set({ size: Number(e.target.value) })} className={field}>
            {QR_SIZES.map((s) => (
              <option key={s} value={s}>
                {s} px
              </option>
            ))}
          </select>
        </label>
      </div>

      {warnings.length > 0 && (
        <ul className="grid gap-1 rounded-lg bg-warn-soft px-3 py-2 text-[12px] text-warn" role="status">
          {warnings.map((w) => (
            <li key={w} className="flex gap-1.5">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {w}
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <a className={dl} href={href("png")} download>
          <Download className="size-3.5" aria-hidden /> PNG
        </a>
        <a className={dl} href={href("svg")} download>
          <Download className="size-3.5" aria-hidden /> SVG
        </a>
      </div>
    </div>
  );
}

/** QR generado en el navegador (vista previa instantánea). */
export function QrPreview({
  value,
  className,
  fg = "#1b2130",
  bg = "#ffffff",
  ecc = "M",
}: {
  value: string;
  className?: string;
  fg?: string;
  bg?: string;
  ecc?: Ecc;
}) {
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    QRCode.toString(value, { type: "svg", margin: 0, errorCorrectionLevel: ecc, color: { dark: fg, light: "#00000000" } }).then(
      (s) => alive && setSvg(s),
    );
    return () => {
      alive = false;
    };
  }, [value, fg, ecc]);

  return (
    <div className={cx("relative aspect-square rounded-xl p-3 transition-colors", className)} style={{ backgroundColor: bg }}>
      {svg ? (
        <motion.div
          key={value}
          initial={{ opacity: 0, scale: 0.92, filter: "blur(4px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.5, ease: EASE }}
          className="size-full [&>svg]:size-full"
          role="img"
          aria-label={`Código QR de ${value}`}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div className="skeleton size-full" />
      )}
    </div>
  );
}

/** Descarga en cliente (para enlaces sin cuenta). */
export async function downloadQr(value: string, slug: string, format: "png" | "svg") {
  let href: string;
  if (format === "png") {
    href = await QRCode.toDataURL(value, { width: 1024, margin: 2, color: { dark: "#1b2130ff", light: "#ffffffff" } });
  } else {
    const svg = await QRCode.toString(value, { type: "svg", margin: 2, color: { dark: "#1b2130ff", light: "#ffffffff" } });
    href = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  }
  const a = document.createElement("a");
  a.href = href;
  a.download = `snip-${slug}.${format}`;
  a.click();
  if (format === "svg") setTimeout(() => URL.revokeObjectURL(href), 1000);
}

export function QrDownloads({ value, slug, linkId }: { value: string; slug: string; linkId?: string }) {
  const cls =
    "inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface text-[13px] font-semibold text-ink transition-[border-color,transform] hover:border-line-strong active:scale-[0.97]";
  if (linkId) {
    return (
      <div className="flex gap-2">
        <a className={cls} href={`/api/links/${linkId}/qr?format=png`} download>
          <Download className="size-3.5" aria-hidden /> PNG
        </a>
        <a className={cls} href={`/api/links/${linkId}/qr?format=svg`} download>
          <Download className="size-3.5" aria-hidden /> SVG
        </a>
      </div>
    );
  }
  return (
    <div className="flex gap-2">
      <button type="button" className={cls} onClick={() => downloadQr(value, slug, "png")}>
        <Download className="size-3.5" aria-hidden /> PNG
      </button>
      <button type="button" className={cls} onClick={() => downloadQr(value, slug, "svg")}>
        <Download className="size-3.5" aria-hidden /> SVG
      </button>
    </div>
  );
}

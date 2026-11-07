"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { motion } from "motion/react";
import { Download } from "lucide-react";
import { cx } from "./ui";
import { EASE } from "./motion";

/** QR generado en el navegador (vista previa instantánea). */
export function QrPreview({ value, className }: { value: string; className?: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    QRCode.toString(value, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#1b2130", light: "#00000000" } }).then(
      (s) => alive && setSvg(s),
    );
    return () => {
      alive = false;
    };
  }, [value]);

  return (
    <div className={cx("relative aspect-square rounded-xl bg-white p-3", className)}>
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

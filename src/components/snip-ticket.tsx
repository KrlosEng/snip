"use client";

import { motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, Scissors } from "lucide-react";
import Link from "next/link";
import { CopyButton, EASE } from "./motion";
import { QrDownloads, QrPreview } from "./qr";
import { stripProtocol } from "@/lib/format";

/**
 * El momento "snip": el enlace largo se corta con una línea punteada y
 * el enlace corto aparece letra por letra en un talón de boleto con su QR.
 */
export function SnipTicket({
  longUrl,
  shortUrl,
  slug,
  linkId,
  note,
  statsHref,
}: {
  longUrl: string;
  shortUrl: string;
  slug: string;
  linkId?: string;
  note?: React.ReactNode;
  statsHref?: string;
}) {
  const reduce = useReducedMotion();
  const display = stripProtocol(shortUrl);
  const host = display.slice(0, display.length - slug.length);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
      transition={{ duration: 0.55, ease: EASE }}
      className="relative grid overflow-hidden rounded-2xl border border-line bg-surface shadow-2 sm:grid-cols-[1fr_auto]"
    >
      {/* Talón principal */}
      <div className="min-w-0 p-5 sm:p-6">
        <div className="relative mb-4 flex items-center gap-2 text-[13px] text-ink-3">
          <span className="relative min-w-0 flex-1 truncate font-mono text-[12.5px]">
            {stripProtocol(longUrl)}
            {/* La línea de corte que tacha el enlace largo */}
            <motion.span
              aria-hidden
              className="absolute inset-x-0 top-1/2 h-px origin-left bg-danger/70"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.5, ease: EASE, delay: 0.15 }}
            />
          </span>
          <motion.span
            aria-hidden
            initial={reduce ? false : { x: -24, rotate: 0, opacity: 0 }}
            animate={{ x: 0, rotate: [0, -18, 0, -18, 0], opacity: 1 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.1 }}
            className="text-danger"
          >
            <Scissors className="size-4" />
          </motion.span>
        </div>

        <p className="mb-1.5 text-xs font-medium tracking-wide text-ink-3 uppercase">Tu enlace corto</p>
        <a
          href={shortUrl}
          target="_blank"
          rel="noopener"
          className="group inline-flex max-w-full flex-wrap items-baseline font-mono text-[clamp(1.15rem,3.2vw,1.55rem)] leading-tight font-medium tracking-tight text-ink"
          aria-label={`Abrir ${display}`}
        >
          <span className="whitespace-nowrap text-ink-3">{host}</span>
          <span className="break-all text-brand">
            {slug.split("").map((ch, i) => (
              <motion.span
                key={i}
                className="inline-block"
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: EASE, delay: 0.35 + i * 0.035 }}
              >
                {ch}
              </motion.span>
            ))}
          </span>
          <ArrowUpRight className="ml-1 size-5 shrink-0 self-center text-ink-3 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
        </a>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <CopyButton text={shortUrl} label="Copiar enlace" primary />
          {statsHref && (
            <Link
              href={statsHref}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-ink-2 transition-colors hover:bg-brand-soft hover:text-brand"
            >
              Ver estadísticas
            </Link>
          )}
        </div>
        {note && <div className="mt-4 text-[13px] leading-relaxed text-ink-2">{note}</div>}
      </div>

      {/* Talón del QR, separado por una perforación */}
      <div className="relative border-t border-dashed border-line-strong p-5 sm:w-[188px] sm:border-t-0 sm:border-l sm:p-6">
        <span aria-hidden className="absolute -top-[9px] -left-[9px] hidden size-[18px] rounded-full border border-line bg-bg sm:block" />
        <span aria-hidden className="absolute -bottom-[9px] -left-[9px] hidden size-[18px] rounded-full border border-line bg-bg sm:block" />
        <div className="flex items-center gap-4 sm:block">
          <QrPreview value={shortUrl} className="w-28 shrink-0 border border-line sm:w-full" />
          <div className="flex-1 sm:mt-3">
            <p className="mb-2 text-xs text-ink-3 sm:text-center">Descargar QR</p>
            <QrDownloads value={shortUrl} slug={slug} linkId={linkId} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

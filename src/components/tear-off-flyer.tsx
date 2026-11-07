"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { QrDownloads, QrPreview } from "./qr";
import { EASE } from "./motion";
import { stripProtocol } from "@/lib/format";

/**
 * El resultado como volante pegado en la calle: el enlace corto, su QR y
 * una fila de tiras para arrancar. Arrancar una tira copia el enlace.
 */
const TABS = 8;

export function TearOffFlyer({ shortUrl, slug, longUrl, linkId }: { shortUrl: string; slug: string; longUrl: string; linkId?: string }) {
  const reduce = useReducedMotion();
  const [torn, setTorn] = useState<number[]>([]);
  const [copied, setCopied] = useState(false);
  const display = stripProtocol(shortUrl);
  const host = display.slice(0, display.length - slug.length);

  async function copy() {
    try {
      await navigator.clipboard.writeText(shortUrl);
    } catch {
      /* el enlace sigue visible para copiarlo a mano */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  function tear(i: number) {
    setTorn((t) => (t.includes(i) ? t : [...t, i]));
    copy();
  }

  return (
    <div data-ui className="relative max-w-[640px] text-ink">
      <div className="rounded-t-[18px] bg-surface p-6 sm:p-7">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-[15px] text-ink-3">Tu enlace corto</p>
            <a href={shortUrl} target="_blank" rel="noopener" className="mt-1 block text-[clamp(1.2rem,3vw,1.6rem)] leading-tight break-all text-ink hover:underline">
              <span className="text-ink-3">{host}</span>
              {slug}
            </a>
            <p className="mt-2 truncate text-[14px] text-ink-3" title={longUrl}>
              antes: {stripProtocol(longUrl)}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={copy}
                className="inline-flex h-11 items-center rounded-full bg-brand px-6 text-[16px] font-bold text-brand-ink transition-[background-color,transform] hover:bg-brand-strong active:scale-[0.96]"
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span key={String(copied)} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
                    {copied ? "copiado" : "copiar enlace"}
                  </motion.span>
                </AnimatePresence>
              </button>
              <span className="text-[14px] text-ink-3">o arranca una tira</span>
            </div>
          </div>
          <div className="w-[132px] shrink-0">
            <QrPreview value={shortUrl} className="w-full" />
            <div className="mt-2">
              <QrDownloads value={shortUrl} slug={slug} linkId={linkId} />
            </div>
          </div>
        </div>
      </div>

      {/* Tiras para arrancar */}
      <div className="flex gap-[3px]" role="group" aria-label="Tiras con el enlace">
        {Array.from({ length: TABS }, (_, i) => {
          const gone = torn.includes(i);
          return (
            <motion.button
              key={i}
              type="button"
              onClick={() => tear(i)}
              aria-label={`Arrancar tira ${i + 1} y copiar ${display}`}
              disabled={gone}
              initial={reduce ? false : { scaleY: 0 }}
              animate={gone ? { y: 60, rotate: i % 2 ? 9 : -9, opacity: 0 } : { scaleY: 1, y: 0, rotate: 0, opacity: 1 }}
              transition={gone ? { duration: 0.5, ease: [0.55, 0, 0.75, 0.2] } : { duration: 0.45, ease: EASE, delay: 0.15 + i * 0.04 }}
              whileHover={gone ? undefined : { y: 3 }}
              className="relative h-[118px] flex-1 origin-top rounded-b-[10px] bg-surface outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="rotate-90 text-[13px] whitespace-nowrap text-ink-2">{slug}</span>
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

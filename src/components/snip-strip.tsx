"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Scissors } from "lucide-react";
import { EASE } from "./motion";

/**
 * Momento protagonista de la landing: una tira de papel con un enlace
 * larguísimo; unas tijeras la cortan, la cola cae y queda el enlace corto
 * sellado en bermellón. Se repite con varios ejemplos.
 */

const EXAMPLES = [
  {
    head: "tienda.ejemplo.mx",
    tail: "/ofertas/buen-fin-2026?utm_source=instagram&utm_medium=story&utm_campaign=noviembre&ref=bio",
    slug: "buen-fin",
  },
  {
    head: "docs.google.com",
    tail: "/forms/d/e/1FAIpQLSdX9kq2Lm7vR4tN8wYb/viewform?usp=sf_link&entry.1234=inscripcion",
    slug: "inscripcion",
  },
  {
    head: "drive.google.com",
    tail: "/file/d/1aB2cD3eF4gH5iJ6kL7mN8oP9qR0sT/view?usp=sharing&menu=temporada-otono",
    slug: "menu-tacos",
  },
];

type Phase = "full" | "cut" | "fallen" | "short";
const TIMING: Record<Phase, number> = { full: 1300, cut: 750, fallen: 450, short: 2600 };
const NEXT: Record<Phase, Phase> = { full: "cut", cut: "fallen", fallen: "short", short: "full" };

export function SnipStrip({ domain = "snip.to" }: { domain?: string }) {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState<Phase>("full");

  useEffect(() => {
    if (reduce) return;
    const t = setTimeout(() => {
      const next = NEXT[phase];
      if (next === "full") setI((n) => (n + 1) % EXAMPLES.length);
      setPhase(next);
    }, TIMING[phase]);
    return () => clearTimeout(t);
  }, [phase, reduce]);

  const ex = EXAMPLES[i];
  const p: Phase = reduce ? "short" : phase;
  const longLen = ex.head.length + ex.tail.length + 8;
  const shortLen = domain.length + 1 + ex.slug.length;

  return (
    <div className="relative select-none" aria-hidden>
      <div className="mb-6 flex items-center justify-between font-mono text-[11px] tracking-wide text-ink-3 uppercase">
        <span>Nº {String(412 + i).padStart(4, "0")} · antes</span>
        <span className="tnum">{longLen} caracteres</span>
      </div>

      {/* La tira de papel */}
      <div className="relative h-[68px] sm:h-[76px]">
        <div className="absolute inset-0 flex -rotate-[1.2deg] items-stretch">
          <div className="relative z-10 flex shrink-0 items-center rounded-l-md border border-r-0 border-line-strong bg-surface pr-1 pl-4 shadow-2">
            <span className="font-mono text-[13px] text-ink sm:text-[17px]">
              <span className="hidden text-ink-3 sm:inline">https://</span>
              {ex.head}
            </span>
          </div>

          <div className="relative min-w-0 flex-1">
            <AnimatePresence initial={false}>
              {(p === "full" || p === "cut") && (
                <motion.div
                  key={`tail-${i}`}
                  className="absolute inset-0 overflow-hidden rounded-r-md border border-l-0 border-line-strong bg-surface shadow-2"
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0, y: 0, rotate: 0 }}
                  exit={{ y: 90, rotate: 7, opacity: 0, transition: { duration: 0.55, ease: [0.55, 0, 0.75, 0.2] } }}
                  transition={{ duration: 0.45, ease: EASE }}
                  style={{ transformOrigin: "0% 0%" }}
                >
                  <span className="absolute inset-y-0 left-0 flex items-center pr-4 font-mono text-[13px] whitespace-nowrap text-ink-2 sm:text-[17px]">
                    {ex.tail}
                  </span>
                  <span className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-surface to-transparent" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Línea de corte + tijeras, justo después del dominio */}
            <AnimatePresence>
              {(p === "full" || p === "cut") && (
                <motion.div
                  key={`cut-${i}`}
                  className="absolute top-[-14px] bottom-[-14px] left-0 z-20 w-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.15 } }}
                >
                  <span className="absolute inset-y-0 left-[-0.5px] border-l border-dashed border-brand" />
                  <motion.span
                    className="absolute left-[-11px] grid size-[22px] place-items-center rounded-full bg-brand text-brand-ink shadow-2"
                    initial={{ top: "-6px", rotate: 90 }}
                    animate={p === "cut" ? { top: "calc(100% - 16px)", rotate: [90, 70, 90, 70, 90] } : { top: "-6px", rotate: 90 }}
                    transition={{ duration: 0.7, ease: EASE }}
                  >
                    <Scissors className="size-3" strokeWidth={2.6} />
                  </motion.span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Resultado sellado */}
      <div className="mt-9 flex min-h-[92px] items-start justify-between gap-4">
        <AnimatePresence mode="wait">
          {p === "short" && (
            <motion.div
              key={`short-${i}`}
              initial={{ opacity: 0, scale: 1.25, rotate: -4 }}
              animate={{ opacity: 1, scale: 1, rotate: -1.5 }}
              exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
              transition={{ duration: 0.4, ease: EASE }}
              className="stamp inline-flex flex-col rounded-lg border-2 border-ink bg-brand px-4 py-3 text-brand-ink"
            >
              <span className="font-mono text-[10px] tracking-[0.14em] uppercase opacity-80">Después</span>
              <span className="font-mono text-[clamp(1.25rem,2.6vw,1.65rem)] leading-tight font-medium">
                {domain}/{ex.slug}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {p === "short" && (
            <motion.p
              key={`saved-${i}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: EASE, delay: 0.25 }}
              className="text-right font-mono text-[11px] leading-relaxed tracking-wide text-ink-3 uppercase"
            >
              <span className="block font-display text-[2rem] leading-none font-bold tracking-tight text-ink normal-case tnum">
                −{longLen - shortLen}
              </span>
              caracteres
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

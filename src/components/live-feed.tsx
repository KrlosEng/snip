"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Monitor, Smartphone, Tablet } from "lucide-react";
import { EASE } from "./motion";
import { CountryCode } from "./country";

/**
 * Muestra ilustrativa (no son datos reales): un flujo de clics llegando a
 * un enlace, para que el visitante entienda el producto en 5 segundos.
 */
const SAMPLE = [
  { cc: "MX", city: "Guadalajara", dev: "m", src: "instagram.com" },
  { cc: "ES", city: "Madrid", dev: "d", src: "t.co" },
  { cc: "CO", city: "Medellín", dev: "m", src: "whatsapp.com" },
  { cc: "US", city: "Austin", dev: "d", src: "linkedin.com" },
  { cc: "AR", city: "Buenos Aires", dev: "m", src: "Directo" },
  { cc: "MX", city: "Monterrey", dev: "t", src: "facebook.com" },
  { cc: "CL", city: "Santiago", dev: "m", src: "instagram.com" },
  { cc: "PE", city: "Lima", dev: "d", src: "google.com" },
] as const;

const BARS = [18, 24, 21, 30, 27, 36, 33, 44, 40, 52, 47, 58, 55, 66];

export function LiveFeed() {
  const reduce = useReducedMotion();
  const [tick, setTick] = useState(0);
  const [count, setCount] = useState(1284);

  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => {
      setTick((t) => t + 1);
      setCount((c) => c + 1);
    }, 2200);
    return () => clearInterval(id);
  }, [reduce]);

  const rows = [0, 1, 2, 3].map((k) => {
    const idx = (tick + 3 - k + SAMPLE.length * 10) % SAMPLE.length;
    return { key: tick - k, ...SAMPLE[idx], ago: k === 0 ? "ahora" : `hace ${k * 2 + 1} s` };
  });

  return (
    <div className="relative rounded-2xl border border-line bg-surface p-5 shadow-3" aria-label="Ejemplo de analíticas de un enlace">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[13px] text-ink">
            <span className="text-ink-3">snip.to/</span>
            <span className="text-brand">launch-v2</span>
          </p>
          <p className="mt-0.5 text-xs text-ink-3">Últimos 14 días · ejemplo</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success">
          <span className="pulse-dot size-1.5 rounded-full bg-current" /> En vivo
        </span>
      </div>

      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs text-ink-3">Clics</p>
          <p className="font-display text-[2.1rem] leading-none font-bold tracking-tight tnum">
            <motion.span key={count} initial={reduce ? false : { opacity: 0.4, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }} className="inline-block">
              {count.toLocaleString("es-MX")}
            </motion.span>
          </p>
        </div>
        <div className="flex h-14 flex-1 items-end gap-[3px]" aria-hidden>
          {BARS.map((h, i) => (
            <motion.span
              key={i}
              className="flex-1 origin-bottom rounded-[3px] bg-brand"
              style={{ height: `${h + 30}%`, opacity: i === BARS.length - 1 ? 1 : 0.28 + (i / BARS.length) * 0.5 }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.7, ease: EASE, delay: 0.5 + i * 0.035 }}
            />
          ))}
        </div>
      </div>

      <div className="mt-5 border-t border-dashed border-line pt-3">
        <ul className="relative grid gap-1" aria-hidden>
          <AnimatePresence initial={false}>
            {rows.map((r, i) => (
              <motion.li
                key={r.key}
                layout
                initial={{ opacity: 0, scale: 0.97, backgroundColor: "var(--brand-soft)" }}
                animate={{ opacity: 1 - i * 0.18, scale: 1, backgroundColor: "rgba(0,0,0,0)" }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
                transition={{ duration: 0.5, ease: EASE, backgroundColor: { duration: 1.4 } }}
                className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-[13px]"
              >
                <CountryCode code={r.cc} />
                <span className="min-w-0 flex-1 truncate text-ink">{r.city}</span>
                <span className="text-ink-3">
                  {r.dev === "m" ? <Smartphone className="size-3.5" /> : r.dev === "t" ? <Tablet className="size-3.5" /> : <Monitor className="size-3.5" />}
                </span>
                <span className="hidden w-24 truncate font-mono text-xs text-ink-3 sm:block">{r.src}</span>
                <span className="w-14 text-right text-xs text-ink-3">{r.ago}</span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </div>
    </div>
  );
}

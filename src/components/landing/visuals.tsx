"use client";

import { motion } from "motion/react";
import { CountUp, EASE } from "../motion";
import { QrPreview } from "../qr";

/**
 * Las "imágenes" de las secciones: no hay tarjetas ni capturas. Los datos
 * flotan directamente sobre el vacío, como el resto de la página. Los
 * números de muestra son coherentes: los totales salen de las filas.
 */

const DAYS = [41, 38, 52, 47, 44, 61, 58, 49, 55, 63, 70, 66, 59, 72];
const TOTAL = DAYS.reduce((a, b) => a + b, 0); // 775
const COUNTRIES: [string, number, string][] = [
  ["México", 289, "#8052ff"],
  ["Estados Unidos", 171, "#ffb829"],
  ["España", 92, "#15846e"],
  ["Colombia", 81, "#ffffff"],
  ["Otros países", TOTAL - (289 + 171 + 92 + 81), "#6f6f78"],
];

const label = "text-[14px] leading-[1.2] font-semibold tracking-[0.025em] uppercase";

export function ClicksVisual() {
  const max = Math.max(...DAYS);
  return (
    <div data-ui className="w-full max-w-[520px]">
      <p className={`${label} text-ash`}>menu-tacos · últimos 14 días, sin bots</p>
      <p className="mt-3 text-[clamp(4.5rem,9vw,7rem)] leading-[1] font-normal tracking-[-0.045em]">
        <CountUp value={TOTAL} />
      </p>
      <p className="mt-1 text-[18px] font-extralight text-mist">clics</p>

      <div className="mt-8 flex h-16 items-end gap-[6px]" role="img" aria-label="Clics por día; el último día en ámbar">
        {DAYS.map((d, i) => (
          <motion.span
            key={i}
            className="w-[4px] origin-bottom rounded-full"
            style={{ height: `${(d / max) * 100}%`, background: i === DAYS.length - 1 ? "#ffb829" : "rgba(255,255,255,0.35)" }}
            initial={{ scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, ease: EASE, delay: i * 0.03 }}
          />
        ))}
      </div>

      <ul className="mt-10 grid gap-5">
        {COUNTRIES.map(([name, n, color], i) => (
          <li key={name}>
            <div className="flex items-baseline justify-between gap-4 text-[18px] font-extralight">
              <span>{name}</span>
              <span className="tabular-nums text-mist">
                {n} · {Math.round((n / TOTAL) * 100)}%
              </span>
            </div>
            <div className="mt-2 h-[2px] bg-white/10">
              <motion.div
                className="h-full origin-left"
                style={{ width: `${(n / TOTAL) * 100}%`, background: color }}
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 1, ease: EASE, delay: 0.2 + i * 0.08 }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function QrVisual() {
  return (
    <div className="w-full max-w-[420px]">
      <div className="overflow-hidden rounded-[24px]">
        <QrPreview value="https://snip-acortador.vercel.app/menu-tacos" className="w-full" />
      </div>
      <p className="mt-6 text-[24px] leading-[1.25] font-normal tracking-[-0.02em]">snip-acortador.vercel.app/menu-tacos</p>
      <p className="mt-2 text-[18px] font-extralight text-mist">PNG de 1024 px o SVG para imprenta.</p>
    </div>
  );
}

const FACTS: [string, string][] = [
  ["302", "Redirección sin caché del navegador: cada visita pasa por Snip y se cuenta."],
  ["0", "IPs guardadas. Solo un hash con sal, para contar visitantes únicos."],
  ["7 días", "Lo que dura un enlace sin cuenta. Con una cuenta gratis, para siempre."],
];

export function FactsVisual() {
  return (
    <dl className="grid w-full max-w-[520px] gap-12">
      {FACTS.map(([big, text], i) => (
        <motion.div
          key={big}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.8, ease: EASE, delay: i * 0.1 }}
        >
          <dt className="text-[clamp(3.5rem,6.4vw,4.875rem)] leading-[1] font-normal tracking-[-0.045em]">{big}</dt>
          <dd className="mt-3 max-w-[40ch] text-[18px] leading-[1.5] font-extralight text-mist">{text}</dd>
        </motion.div>
      ))}
    </dl>
  );
}

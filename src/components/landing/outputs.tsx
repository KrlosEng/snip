"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { QrPreview } from "../qr";
import { cx } from "../ui";

/**
 * "Lo que sale de Snip": cinco salidas reales del producto. A la izquierda
 * sus nombres; a la derecha la hoja seleccionada, construida en HTML a su
 * tamaño real y recortada por el borde del escenario.
 */

const HOST = "snip-acortador.vercel.app";
// Filas de un fragmento de interfaz (data-ui): las líneas son las de la propia tabla del producto.
const RULE = "border-t border-[#e2e5e1]"; // taste-skill-ignore

// Datos de muestra coherentes: los totales salen de las filas.
const DAYS = [41, 38, 52, 47, 44, 61, 58, 49, 55, 63, 70, 66, 59, 72];
const COUNTRIES: [string, string, number][] = [
  ["MX", "México", 289],
  ["US", "Estados Unidos", 171],
  ["ES", "España", 92],
  ["CO", "Colombia", 81],
  ["AR", "Argentina", 64],
];
const TOTAL = DAYS.reduce((a, b) => a + b, 0);
const OTHERS = TOTAL - COUNTRIES.reduce((a, [, , n]) => a + n, 0);

const ROWS = [
  ["2026-11-06 18:42", "MX", "Guadalajara", "Móvil", "instagram.com"],
  ["2026-11-06 18:37", "MX", "Monterrey", "Móvil", "whatsapp.com"],
  ["2026-11-06 18:21", "CO", "Medellín", "Escritorio", "Directo"],
  ["2026-11-06 17:58", "US", "Austin", "Móvil", "t.co"],
  ["2026-11-06 17:44", "ES", "Madrid", "Escritorio", "google.com"],
  ["2026-11-06 17:30", "MX", "Puebla", "Tablet", "facebook.com"],
  ["2026-11-06 17:12", "AR", "Córdoba", "Móvil", "instagram.com"],
];

const OUTPUTS = [
  { id: "link", name: "el enlace corto", width: 560 },
  { id: "qr", name: "el código qr", width: 440 },
  { id: "clicks", name: "los clics", width: 560 },
  { id: "csv", name: "el reporte", width: 560 },
  { id: "gone", name: "el aviso de vencido", width: 440 },
] as const;

type Id = (typeof OUTPUTS)[number]["id"];

export function OutputIndex() {
  const [sel, setSel] = useState<Id>("link");
  const current = OUTPUTS.find((o) => o.id === sel)!;

  return (
    <div className="grid gap-8 md:grid-cols-12 md:gap-6">
      <div className="md:col-span-5">
        <ul className="flex snap-x gap-5 overflow-x-auto pb-2 md:block md:overflow-visible md:pb-0" role="tablist" aria-label="Salidas de Snip">
          {OUTPUTS.map((o) => (
            <li key={o.id} className="shrink-0 snap-start">
              <button
                role="tab"
                aria-selected={sel === o.id}
                aria-controls="output-sheet"
                onClick={() => setSel(o.id)}
                className={cx(
                  "text-left text-[22px] leading-[1.1] font-bold tracking-[-0.03em] transition-[color,transform] duration-200 md:text-[clamp(2rem,3.4vw,3rem)] md:hover:translate-x-1.5",
                  sel === o.id ? "text-field-ink" : "text-[#5a6b61]",
                )}
              >
                {o.name}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="relative h-[70svh] overflow-hidden rounded-[18px] bg-[#a9bcb1] md:col-span-7 md:h-[540px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={sel}
            id="output-sheet"
            role="tabpanel"
            data-ui
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ width: current.width }}
            className="absolute top-4 left-4 rounded-[14px] bg-[#f4f5f2] text-[#1c1c1c] md:top-[72px] md:left-16"
          >
            {sel === "link" && <LinkSheet />}
            {sel === "qr" && <QrSheet />}
            {sel === "clicks" && <ClicksSheet />}
            {sel === "csv" && <CsvSheet />}
            {sel === "gone" && <GoneSheet />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 ${RULE} py-3 text-[15px]`}>
      <span className="text-[#5b666e]">{k}</span>
      <span className="text-right font-medium">{v}</span>
    </div>
  );
}

function LinkSheet() {
  return (
    <div className="p-7">
      <p className="text-[14px] text-[#5b666e]">Menú de temporada · Taquería Don Beto</p>
      <p className="mt-2 text-[30px] leading-tight font-bold tracking-[-0.03em]">
        <span className="text-[#5b666e]">{HOST}/</span>menu-tacos
      </p>
      <p className="mt-2 truncate text-[14px] text-[#5b666e]">drive.google.com/file/d/1aB2cD3eF4gH5iJ6kL7mN8oP9qR0sT/view?usp=sharing</p>
      <div className="mt-6">
        <Row k="Estado" v={<span className="rounded-full bg-[#dfe9e1] px-2.5 py-0.5 text-[13px] text-[#2f5a3c]">Activo</span>} />
        <Row k="Redirección" v="302 · en milisegundos" />
        <Row k="Creado" v="10 de agosto de 2026" />
        <Row k="Vence" v="Nunca" />
        <Row k="Clics de siempre" v={<span className="tnum">1,784</span>} />
        <Row k="Últimos 14 días" v={<span className="tnum">{TOTAL.toLocaleString("es-MX")}</span>} />
      </div>
    </div>
  );
}

function QrSheet() {
  return (
    <div className="p-8 text-center">
      <p className="text-[30px] leading-none font-bold tracking-[-0.03em]">menú de temporada</p>
      <p className="mt-2 text-[15px] text-[#5b666e]">Taquería Don Beto · escanea para ver el menú</p>
      <QrPreview value={`https://${HOST}/menu-tacos`} className="mx-auto mt-6 w-[260px]" />
      <p className="mt-4 text-[15px]">{HOST}/menu-tacos</p>
      <p className="mt-6 text-[14px] text-[#5b666e]">PNG de 1024 px o SVG para imprenta</p>
    </div>
  );
}

function ClicksSheet() {
  const max = Math.max(...DAYS);
  return (
    <div className="p-7">
      <div className="flex items-baseline justify-between">
        <p className="text-[15px] text-[#5b666e]">menu-tacos · últimos 14 días</p>
        <p className="text-[15px] text-[#5b666e]">sin bots</p>
      </div>
      <p className="mt-1 text-[40px] leading-none font-bold tracking-[-0.03em] tnum">{TOTAL.toLocaleString("es-MX")} clics</p>
      <div className="mt-6 flex h-28 items-end gap-1.5" aria-label="Clics por día">
        {DAYS.map((d, i) => (
          <span key={i} className={cx("flex-1 rounded-t-[4px]", i === DAYS.length - 1 ? "bg-[#2c3620]" : "bg-[#b7c8be]")} style={{ height: `${(d / max) * 100}%` }} />
        ))}
      </div>
      <div className="mt-6">
        {COUNTRIES.map(([cc, name, n]) => (
          <div key={cc} className={`flex items-center gap-3 ${RULE} py-2.5 text-[15px]`}>
            <span className="w-7 text-[13px] text-[#5b666e]">{cc}</span>
            <span className="flex-1">{name}</span>
            <span className="tnum">{n}</span>
            <span className="w-12 text-right text-[#5b666e] tnum">{Math.round((n / TOTAL) * 100)}%</span>
          </div>
        ))}
        <div className={`flex items-center gap-3 ${RULE} py-2.5 text-[15px] text-[#5b666e]`}>
          <span className="w-7" />
          <span className="flex-1">Otros países</span>
          <span className="tnum">{OTHERS}</span>
          <span className="w-12 text-right tnum">{Math.round((OTHERS / TOTAL) * 100)}%</span>
        </div>
      </div>
    </div>
  );
}

function CsvSheet() {
  return (
    <div className="p-7">
      <p className="text-[15px] text-[#5b666e]">snip-menu-tacos-clics.csv</p>
      <table className="mt-4 w-full text-left text-[14px]">
        <thead>
          <tr className="text-[13px] text-[#5b666e]">
            <th className="pb-2 font-normal">Fecha</th>
            <th className="pb-2 font-normal">País</th>
            <th className="pb-2 font-normal">Ciudad</th>
            <th className="pb-2 font-normal">Dispositivo</th>
            <th className="pb-2 font-normal">Referido</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((r) => (
            <tr key={r[0]} className={RULE}>
              {r.map((c, i) => (
                <td key={i} className={cx("py-2.5 pr-2", i === 0 && "tnum", i === 4 && "text-[13px]")}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-5 text-[14px] text-[#5b666e]">Se abre en Excel o Google Sheets. La IP nunca se guarda.</p>
    </div>
  );
}

function GoneSheet() {
  return (
    <div className="p-8">
      <span className="inline-block rounded-full bg-[#f3dfd9] px-2.5 py-0.5 text-[13px] text-[#8a3a26]">410 · Enlace vencido</span>
      <p className="mt-4 text-[30px] leading-[1.05] font-bold tracking-[-0.03em]">este enlace ya venció.</p>
      <p className="mt-3 text-[15px] leading-relaxed text-[#38424a]">Quien lo creó le puso fecha de caducidad y esa fecha ya pasó. Si lo necesitas, pídele un enlace nuevo.</p>
      <div className="mt-5 rounded-[10px] bg-[#e8ebe7] p-4 text-[15px]">
        <p className="text-[13px] text-[#5b666e]">Enlace</p>
        <p>{HOST}/promo-verano</p>
        <p className="mt-3 text-[13px] text-[#5b666e]">Motivo</p>
        <p>Venció el 27 de septiembre de 2026.</p>
      </div>
    </div>
  );
}

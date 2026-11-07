"use client";

import { useState } from "react";
import { cx } from "../ui";

/**
 * "Tus enlaces, en un tablero": la lista principal de Snip como pizarra de
 * salidas. Una fila abierta a la vez; tocar otra la abre. Los datos son de
 * muestra (los de la cuenta demo).
 */

type Status = "Activo" | "Pausado" | "Vencido";

const ROWS: { slug: string; clicks: number | null; source: string; status: Status; dest: string; note: string }[] = [
  { slug: "launch-v2", clicks: 1204, source: "t.co", status: "Activo", dest: "producthunt.com/posts/snip-v2", note: "Lanzamiento · el mejor día fue el 24 de octubre" },
  { slug: "menu-tacos", clicks: 775, source: "instagram.com", status: "Activo", dest: "drive.google.com/file/d/1aB2cD3eF…/view", note: "Impreso en el menú de la taquería, con su QR" },
  { slug: "bio", clicks: 531, source: "instagram.com", status: "Activo", dest: "linktr.ee/marianacreativa", note: "Enlace de la bio de Instagram" },
  { slug: "webinar-nov", clicks: 342, source: "linkedin.com", status: "Activo", dest: "zoom.us/webinar/register/WN_x8Yp2RkQ…", note: "Registro del webinar de noviembre" },
  { slug: "promo-buen-fin", clicks: null, source: "—", status: "Pausado", dest: "tienda.ejemplo.mx/ofertas/buen-fin-2026", note: "Pausado hasta el fin de semana de ofertas" },
  { slug: "promo-verano", clicks: null, source: "—", status: "Vencido", dest: "tienda.ejemplo.mx/verano", note: "Venció el 27 de septiembre: muestra la página de enlace vencido" },
];

const STATUS_STYLE: Record<Status, string> = {
  Activo: "bg-[#b7c8be]",
  Pausado: "bg-[#d6c4b8]",
  Vencido: "bg-[#e6b3a3]",
};

export function DepartureBoard() {
  const [open, setOpen] = useState(1);

  return (
    <ul data-ui className="grid gap-1" aria-label="Enlaces de ejemplo">
      {ROWS.map((r, i) => {
        const isOpen = open === i;
        return (
          <li key={r.slug}>
            <button
              type="button"
              onClick={() => setOpen(i)}
              aria-expanded={isOpen}
              className={cx(
                "block w-full rounded-lg text-left transition-[background-color,color] duration-300",
                isOpen ? "bg-field-2 text-[#1c1c1c]" : "bg-[#272727] text-[#e3e2da] hover:bg-[#303030]",
              )}
            >
              <span className="grid min-h-16 grid-cols-[1fr_auto] items-center gap-x-4 px-4 py-2 md:min-h-[72px] md:grid-cols-[5fr_2fr_3fr_2fr] md:px-6">
                <span className="truncate text-[20px] font-bold tracking-[-0.02em] md:text-[28px]">{r.slug}</span>
                <span className="hidden text-[22px] tnum md:block">{r.clicks === null ? "—" : r.clicks.toLocaleString("es-MX")}</span>
                <span className="hidden truncate text-[22px] md:block">{r.source}</span>
                <span className="justify-self-end">
                  <span className={cx("inline-block rounded-md px-3 py-1.5 text-[15px] font-semibold text-[#1c1c1c] md:text-[17px]", STATUS_STYLE[r.status])}>{r.status}</span>
                </span>
              </span>
              <span className={cx("grid transition-[grid-template-rows] duration-300 ease-out", isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
                <span className="overflow-hidden">
                  <span className="block px-4 pb-5 text-[17px] leading-snug md:px-6">
                    <span className="block">
                      Va a <strong className="font-semibold break-all">{r.dest}</strong>
                    </span>
                    <span className="mt-1 block">{r.note}</span>
                    <span className="mt-1 block md:hidden">
                      {r.clicks === null ? "Sin clics en 14 días" : `${r.clicks.toLocaleString("es-MX")} clics en 14 días, sobre todo de ${r.source}`}
                    </span>
                  </span>
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

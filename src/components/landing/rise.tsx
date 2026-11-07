"use client";

import { useEffect } from "react";

/**
 * Entradas de la landing sin ocultar nada si no hay JavaScript ni con
 * movimiento reducido: los estados ocultos viven en CSS bajo
 * `prefers-reduced-motion: no-preference` y `.js`. Este observador solo
 * marca `data-shown` cuando cada pieza entra en pantalla.
 */
export function RiseObserver() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-rise]"));
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.setAttribute("data-shown", ""));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.setAttribute("data-shown", "");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return null;
}

"use client";

import { useEffect, useRef } from "react";

/**
 * La imagen de marca de Snip: una nube de miles de triángulos diminutos, en
 * contorno y de todos los colores, que se ensambla hasta formar el logo (las
 * tijeras). De vez en cuando llega una chispa ámbar desde fuera: es un clic
 * aterrizando. Con `shape="none"` es solo el campo de partículas ambiental.
 * Con movimiento reducido se dibuja una vez, sin animación.
 */

const COLORS = ["#8052ff", "#8052ff", "#ffb829", "#15846e", "#c04bff", "#3d7bff", "#ff4f9a", "#ffffff"];

type P = {
  tx: number;
  ty: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  a: number;
  va: number;
  c: number;
  ph: number;
  spark: number;
  alpha: number;
};

/** Puntos que cubren el logo de Snip (dos aros y dos hojas que se cruzan). */
function sampleMark(size: number): { x: number; y: number }[] {
  const off = document.createElement("canvas");
  off.width = off.height = size;
  const g = off.getContext("2d", { willReadFrequently: true })!;
  const k = size / 32;
  g.strokeStyle = "#fff";
  g.lineCap = "round";
  g.lineWidth = 2.3 * k;
  g.beginPath();
  g.arc(10 * k, 22 * k, 3.9 * k, 0, Math.PI * 2);
  g.moveTo(26.9 * k, 22 * k);
  g.arc(23 * k, 22 * k, 3.9 * k, 0, Math.PI * 2);
  g.moveTo(12.4 * k, 18.8 * k);
  g.lineTo(24 * k, 5 * k);
  g.moveTo(20.6 * k, 18.8 * k);
  g.lineTo(9 * k, 5 * k);
  g.stroke();
  const data = g.getImageData(0, 0, size, size).data;
  const pts: { x: number; y: number }[] = [];
  const step = Math.max(3, Math.round(size / 110));
  for (let y = 0; y < size; y += step) {
    for (let x = 0; x < size; x += step) {
      if (data[(y * size + x) * 4 + 3] > 120) pts.push({ x: x + (Math.random() - 0.5) * step, y: y + (Math.random() - 0.5) * step });
    }
  }
  return pts;
}

export function Constellation({ shape = "mark", className = "" }: { shape?: "mark" | "none"; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let parts: P[] = [];
    let raf = 0;
    let visible = true;
    let t0 = performance.now();
    let lastSpark = 0;
    const mouse = { x: -9999, y: -9999 };

    function build() {
      const rect = canvas!.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      if (!w || !h) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      parts = [];
      const rnd = (a: number, b: number) => a + Math.random() * (b - a);

      if (shape === "mark") {
        const side = Math.min(w, h) * 0.92;
        const pts = sampleMark(Math.round(Math.max(220, side)));
        const sc = side / Math.max(220, Math.round(side));
        const ox = (w - side) / 2;
        const oy = (h - side) / 2;
        for (const p of pts) {
          const tx = ox + p.x * sc;
          const ty = oy + p.y * sc;
          parts.push({
            tx, ty,
            x: reduce ? tx : rnd(0, w), y: reduce ? ty : rnd(0, h),
            vx: 0, vy: 0, r: rnd(2.2, 4.6), a: rnd(0, 6.28), va: rnd(-0.01, 0.01),
            c: (Math.random() * COLORS.length) | 0, ph: rnd(0, 6.28), spark: 0, alpha: rnd(0.75, 1),
          });
        }
      }
      // Partículas ambientales: dispersas, tenues, a la deriva.
      const ambient = shape === "mark" ? Math.round((w * h) / 5200) : Math.round((w * h) / 2600);
      for (let i = 0; i < ambient; i++) {
        const x = rnd(0, w);
        const y = rnd(0, h);
        parts.push({
          tx: x, ty: y, x, y, vx: rnd(-0.12, 0.12), vy: rnd(-0.12, 0.12), r: rnd(1.6, 3.4), a: rnd(0, 6.28), va: rnd(-0.006, 0.006),
          c: (Math.random() * COLORS.length) | 0, ph: -1, spark: 0, alpha: rnd(0.12, 0.35),
        });
      }
    }

    function draw(now: number) {
      ctx!.clearRect(0, 0, w, h);
      const byColor: Record<number, P[]> = {};
      for (const p of parts) (byColor[p.spark > now ? -1 : p.c] ??= []).push(p);
      ctx!.lineWidth = 1.1;
      for (const key of Object.keys(byColor)) {
        const idx = Number(key);
        ctx!.strokeStyle = idx === -1 ? "#ffb829" : COLORS[idx];
        // Un trazo por color y por nivel de opacidad (3 niveles) para no pintar miles de rutas.
        for (const level of [0.28, 0.6, 1]) {
          ctx!.globalAlpha = idx === -1 ? 1 : level;
          ctx!.beginPath();
          for (const p of byColor[idx]) {
            const lv = p.alpha < 0.4 ? 0.28 : p.alpha < 0.8 ? 0.6 : 1;
            if (lv !== level && idx !== -1) continue;
            const r = idx === -1 ? p.r * 1.8 : p.r;
            for (let k = 0; k < 3; k++) {
              const ang = p.a + (k * Math.PI * 2) / 3;
              const px = p.x + Math.cos(ang) * r;
              const py = p.y + Math.sin(ang) * r;
              if (k === 0) ctx!.moveTo(px, py);
              else ctx!.lineTo(px, py);
            }
            ctx!.closePath();
          }
          ctx!.stroke();
          if (idx === -1) break;
        }
      }
      ctx!.globalAlpha = 1;
    }

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      if (!visible || document.hidden) return;
      const t = (now - t0) / 1000;
      const assemble = Math.min(1, t / 2.2);
      const ease = 1 - Math.pow(1 - assemble, 3);

      if (shape === "mark" && now - lastSpark > 1500) {
        lastSpark = now;
        const targets = parts.filter((p) => p.ph >= 0);
        const p = targets[(Math.random() * targets.length) | 0];
        if (p) {
          const side = (Math.random() * 4) | 0;
          p.x = side === 0 ? -20 : side === 1 ? w + 20 : Math.random() * w;
          p.y = side === 2 ? -20 : side === 3 ? h + 20 : Math.random() * h;
          p.vx = p.vy = 0;
          p.spark = now + 1800;
        }
      }

      for (const p of parts) {
        p.a += p.va;
        if (p.ph < 0) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < -10) p.x = w + 10;
          if (p.x > w + 10) p.x = -10;
          if (p.y < -10) p.y = h + 10;
          if (p.y > h + 10) p.y = -10;
          continue;
        }
        const wob = Math.sin(t * 0.9 + p.ph) * 2.2;
        const wob2 = Math.cos(t * 0.7 + p.ph * 1.3) * 2.2;
        const k = 0.012 + 0.03 * ease;
        p.vx += (p.tx + wob - p.x) * k;
        p.vy += (p.ty + wob2 - p.y) * k;
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 90 * 90 && d2 > 1) {
          const f = (1 - Math.sqrt(d2) / 90) * 1.6;
          p.vx += (dx / Math.sqrt(d2)) * f;
          p.vy += (dy / Math.sqrt(d2)) * f;
        }
        p.vx *= 0.86;
        p.vy *= 0.86;
        p.x += p.vx;
        p.y += p.vy;
      }
      draw(now);
    }

    function onMove(e: PointerEvent) {
      const r = canvas!.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    }
    function onLeave() {
      mouse.x = mouse.y = -9999;
    }

    build();
    if (reduce) {
      draw(0);
    } else {
      t0 = performance.now();
      raf = requestAnimationFrame(frame);
    }

    const ro = new ResizeObserver(() => {
      build();
      if (reduce) draw(0);
    });
    ro.observe(canvas);
    const io = new IntersectionObserver((es) => (visible = es[0]?.isIntersecting ?? true), { threshold: 0 });
    io.observe(canvas);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, [shape]);

  return <canvas ref={ref} className={`block size-full ${className}`} role="img" aria-label="Constelación de partículas que forma el logo de Snip: unas tijeras" />;
}

"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { animate, motion, useInView, useReducedMotion, type Variants } from "motion/react";
import { Check, Copy } from "lucide-react";
import { cx } from "./ui";

export const EASE = [0.16, 1, 0.3, 1] as const;

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};

/** Entrada coordinada: los hijos <Item> aparecen escalonados. */
export function Stagger({ children, className, as = "div" }: { children: ReactNode; className?: string; as?: "div" | "section" | "ul" }) {
  const C = motion[as];
  return (
    <C variants={container} initial="hidden" animate="show" className={className}>
      {children}
    </C>
  );
}

export function Item({ children, className, as = "div" }: { children: ReactNode; className?: string; as?: "div" | "section" | "li" | "header" }) {
  const C = motion[as];
  return (
    <C variants={item} className={className}>
      {children}
    </C>
  );
}

/** Revela al entrar en pantalla (para secciones de la landing). */
export function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, ease: EASE, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Número que cuenta hasta su valor al aparecer. */
export function CountUp({ value, format = (n) => Math.round(n).toLocaleString("es-MX"), className }: { value: number; format?: (n: number) => string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const prev = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el || !inView) return;
    if (reduce) {
      el.textContent = format(value);
      prev.current = value;
      return;
    }
    const controls = animate(prev.current, value, {
      duration: Math.min(1.4, 0.6 + Math.log10(Math.max(10, Math.abs(value - prev.current))) * 0.2),
      ease: EASE,
      onUpdate: (v) => (el.textContent = format(v)),
    });
    prev.current = value;
    return () => controls.stop();
  }, [value, inView, reduce, format]);

  return (
    <span ref={ref} className={cx("tnum", className)}>
      {format(0)}
    </span>
  );
}

/** Botón de copiar con confirmación visible. */
export function CopyButton({
  text,
  label = "Copiar",
  className,
  compact,
  primary,
  onCopied,
}: {
  text: string;
  label?: string;
  className?: string;
  compact?: boolean;
  primary?: boolean;
  onCopied?: () => void;
}) {
  const [done, setDone] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setDone(true);
    onCopied?.();
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(() => setDone(false), 1600);
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={compact ? (done ? "Copiado" : `${label} ${text}`) : undefined}
      className={cx(
        "relative inline-flex items-center justify-center gap-1.5 overflow-hidden font-semibold transition-[background-color,color,border-color,transform] duration-150 active:scale-[0.95]",
        compact
          ? "size-8 rounded-lg text-ink-3 hover:bg-brand-soft hover:text-brand"
          : primary
            ? "h-10 rounded-lg bg-brand px-4 text-sm text-brand-ink hover:bg-brand-strong"
            : "h-9 rounded-lg border border-line bg-surface px-3 text-sm text-ink hover:border-line-strong",
        done && (compact ? "text-success hover:text-success" : primary ? "bg-success hover:bg-success" : "border-success/40 text-success"),
        className,
      )}
    >
      <span className="relative grid size-4 place-items-center">
        <motion.span
          className="absolute"
          initial={false}
          animate={{ opacity: done ? 0 : 1, scale: done ? 0.5 : 1, rotate: done ? -45 : 0 }}
          transition={{ duration: 0.2, ease: EASE }}
        >
          <Copy className="size-4" aria-hidden />
        </motion.span>
        <motion.span
          className="absolute"
          initial={false}
          animate={{ opacity: done ? 1 : 0, scale: done ? 1 : 0.5 }}
          transition={{ duration: 0.25, ease: EASE }}
        >
          <Check className="size-4" strokeWidth={2.6} aria-hidden />
        </motion.span>
      </span>
      {!compact && <span aria-live="polite">{done ? "Copiado" : label}</span>}
    </button>
  );
}

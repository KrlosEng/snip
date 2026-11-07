import { cx } from "./ui";

/**
 * Código de país como etiqueta. Windows no dibuja las banderas emoji, así que
 * usamos el código ISO en un chip: se ve igual en todos los sistemas.
 */
export function CountryCode({ code, className }: { code: string | null; className?: string }) {
  const c = code && /^[A-Z]{2}$/.test(code) ? code : "··";
  return (
    <span
      aria-hidden
      className={cx(
        "inline-grid h-[18px] w-[26px] shrink-0 place-items-center rounded-[4px] border border-line bg-surface-2 font-mono text-[10px] font-medium tracking-wide text-ink-2",
        className,
      )}
    >
      {c}
    </span>
  );
}

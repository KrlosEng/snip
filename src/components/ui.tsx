"use client";

import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

/* ------------------------------ Logo ------------------------------ */

export function LogoMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="var(--brand)" />
      <g fill="none" stroke="var(--brand-ink)" strokeWidth="2.6" strokeLinecap="round">
        <circle cx="11" cy="21.5" r="3.2" />
        <circle cx="21" cy="21.5" r="3.2" />
        <path d="M13 19 L22 8M19 19 L10 8" />
      </g>
    </svg>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cx("group inline-flex items-center gap-2 rounded-lg", className)} aria-label="Snip, inicio">
      <span className="transition-transform duration-300 ease-out group-hover:-rotate-12">
        <LogoMark />
      </span>
      <span className="font-display text-[1.3rem] font-bold leading-none tracking-[-0.04em]">Snip</span>
    </Link>
  );
}

/* ------------------------------ Botón ------------------------------ */

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-brand text-brand-ink hover:bg-brand-strong",
  secondary: "bg-surface text-ink border border-line hover:border-line-strong hover:bg-surface-2",
  ghost: "text-ink-2 hover:bg-surface-2 hover:text-ink",
  danger: "bg-danger text-brand-ink hover:brightness-95 dark:text-[oklch(0.18_0.03_25)]",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-lg",
  md: "h-9 px-4 text-sm gap-2 rounded-lg",
  lg: "h-11 px-5 text-[15px] gap-2 rounded-[10px]",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, icon, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cx(
        "relative inline-flex select-none items-center justify-center whitespace-nowrap font-semibold",
        "transition-[background-color,border-color,color,transform,filter] duration-150 ease-out active:scale-[0.97]",
        "disabled:opacity-60 disabled:active:scale-100",
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
});

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  icon,
  ...rest
}: { href: string; variant?: Variant; size?: Size; className?: string; children: ReactNode; icon?: ReactNode } & Omit<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  "href"
>) {
  const external = href.startsWith("/api/");
  const cls = cx(
    "inline-flex select-none items-center justify-center whitespace-nowrap font-semibold transition-[background-color,border-color,color,transform] duration-150 ease-out active:scale-[0.97]",
    variants[variant],
    sizes[size],
    className,
  );
  if (external) {
    return (
      <a href={href} className={cls} {...rest}>
        {icon}
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls} {...rest}>
      {icon}
      {children}
    </Link>
  );
}

/* ------------------------------ Campos ------------------------------ */

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function Input({ className, invalid, ...rest }, ref) {
    return (
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cx(
          "h-10 w-full rounded-lg border bg-surface px-3 text-[15px] text-ink placeholder:text-ink-3",
          "transition-[border-color,box-shadow] duration-150 outline-none",
          "focus:border-brand focus:shadow-[0_0_0_3px_var(--ring)]",
          invalid ? "border-danger" : "border-line hover:border-line-strong",
          className,
        )}
        {...rest}
      />
    );
  },
);

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  optional,
}: {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  htmlFor: string;
  children: ReactNode;
  optional?: boolean;
}) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={htmlFor} className="flex items-baseline justify-between text-[13px] font-medium text-ink">
        {label}
        {optional && <span className="text-xs font-normal text-ink-3">Opcional</span>}
      </label>
      {children}
      <FieldMessage error={error} hint={hint} id={`${htmlFor}-msg`} />
    </div>
  );
}

export function FieldMessage({ error, hint, id }: { error?: string | null; hint?: ReactNode; id?: string }) {
  if (!error && !hint) return null;
  return (
    <motion.p
      key={error ?? "hint"}
      id={id}
      initial={error ? { opacity: 0, y: -4 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      role={error ? "alert" : undefined}
      className={cx("text-[13px] leading-snug", error ? "text-danger" : "text-ink-3")}
    >
      {error ?? hint}
    </motion.p>
  );
}

/* ------------------------------ Switch ------------------------------ */

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        "relative inline-flex h-[22px] w-[38px] shrink-0 items-center rounded-full p-[3px] transition-colors duration-200 disabled:opacity-40",
        checked ? "bg-success" : "bg-line-strong",
      )}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 700, damping: 52 }}
        className={cx("block size-4 rounded-full bg-surface shadow-1", checked ? "ml-auto" : "")}
      />
    </button>
  );
}

/* ------------------------------ Badges ------------------------------ */

export function StatusBadge({ status }: { status: "active" | "paused" | "expired" }) {
  const map = {
    active: { label: "Activo", cls: "bg-success-soft text-success" },
    paused: { label: "Pausado", cls: "bg-surface-2 text-ink-2" },
    expired: { label: "Vencido", cls: "bg-danger-soft text-danger" },
  } as const;
  const m = map[status];
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium", m.cls)}>
      <span className={cx("size-1.5 rounded-full bg-current", status === "active" && "pulse-dot")} />
      {m.label}
    </span>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-ink-3">{children}</kbd>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArrowLeft, LoaderCircle, MailCheck } from "lucide-react";
import { EASE, Item, Stagger } from "./motion";
import { useToast } from "./providers";
import { cx } from "./ui";

const LEN = 6;

/** Paso de verificación: 6 casillas para el código que llegó al correo. */
export function OtpForm({ email }: { email: string }) {
  const router = useRouter();
  const toast = useToast();
  const [digits, setDigits] = useState<string[]>(Array(LEN).fill(""));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const [trust, setTrust] = useState(true);
  const [cooldown, setCooldown] = useState(30);
  const [expired, setExpired] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function submit(code: string) {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, trust }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (!res?.ok) {
      setBusy(false);
      setError(data?.error ?? "Sin conexión. Intenta de nuevo.");
      setExpired(Boolean(data?.expired));
      setShake((n) => n + 1);
      setDigits(Array(LEN).fill(""));
      setTimeout(() => refs.current[0]?.focus(), 30);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  function setAt(i: number, value: string) {
    const clean = value.replace(/\D/g, "");
    if (!clean) {
      setDigits((d) => d.map((x, k) => (k === i ? "" : x)));
      return;
    }
    // Soporta pegar el código completo en cualquier casilla.
    const next = [...digits];
    for (let k = 0; k < clean.length && i + k < LEN; k++) next[i + k] = clean[k];
    setDigits(next);
    const focusAt = Math.min(LEN - 1, i + clean.length);
    refs.current[focusAt]?.focus();
    if (next.every(Boolean)) submit(next.join(""));
  }

  async function resend() {
    setCooldown(30);
    const res = await fetch("/api/auth/verify/resend", { method: "POST" }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (!res?.ok) {
      setError(data?.error ?? "No pudimos reenviar el código.");
      setExpired(Boolean(data?.expired));
      return;
    }
    setError(null);
    toast({ tone: "success", title: "Te enviamos un código nuevo", body: "El anterior ya no sirve." });
  }

  return (
    <Stagger className="w-full">
      <Item>
        <Link href="/login" className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-ink-2 hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden /> Volver
        </Link>
      </Item>
      <Item>
        <span className="mb-5 grid size-12 place-items-center rounded-xl bg-brand-soft text-brand">
          <MailCheck className="size-6" aria-hidden />
        </span>
        <h1 className="text-[2rem] leading-tight font-bold">Confirma que eres tú</h1>
        <p className="mt-2 text-ink-2">
          Entraste desde un dispositivo nuevo. Te enviamos un código de 6 dígitos a{" "}
          <span className="font-medium text-ink">{email || "tu correo"}</span>.
        </p>
      </Item>

      <Item className="mt-8">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (digits.every(Boolean)) submit(digits.join(""));
          }}
        >
          <motion.div
            key={shake}
            animate={shake ? { x: [0, -8, 8, -4, 4, 0] } : undefined}
            transition={{ duration: 0.36, ease: "easeOut" }}
            className="flex justify-between gap-2"
            role="group"
            aria-label="Código de verificación"
          >
            {digits.map((d, i) => (
              <motion.input
                key={i}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                value={d}
                onChange={(e) => setAt(i, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Backspace" && !d && i > 0) refs.current[i - 1]?.focus();
                  if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
                  if (e.key === "ArrowRight" && i < LEN - 1) refs.current[i + 1]?.focus();
                }}
                onFocus={(e) => e.target.select()}
                inputMode="numeric"
                autoComplete={i === 0 ? "one-time-code" : "off"}
                maxLength={LEN}
                aria-label={`Dígito ${i + 1}`}
                disabled={busy}
                animate={d ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                transition={{ duration: 0.2, ease: EASE }}
                className={cx(
                  "h-14 w-full min-w-0 rounded-lg border-2 bg-surface text-center font-mono text-2xl font-medium text-ink outline-none transition-[border-color,box-shadow]",
                  "focus:border-brand focus:shadow-[0_0_0_3px_var(--ring)]",
                  error ? "border-danger" : d ? "border-ink" : "border-line",
                )}
              />
            ))}
          </motion.div>

          <div className="mt-3 min-h-5" aria-live="polite">
            {busy ? (
              <p className="inline-flex items-center gap-2 text-[13px] text-ink-3">
                <LoaderCircle className="size-3.5 animate-spin" /> Comprobando…
              </p>
            ) : error ? (
              <p role="alert" className="text-[13px] text-danger">
                {error}{" "}
                {expired && (
                  <Link href="/login" className="font-semibold underline underline-offset-2">
                    Iniciar sesión otra vez
                  </Link>
                )}
              </p>
            ) : null}
          </div>

          <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-sm text-ink-2">
            <input type="checkbox" checked={trust} onChange={(e) => setTrust(e.target.checked)} className="mt-0.5 size-4 accent-[var(--brand)]" />
            <span>
              Confiar en este dispositivo
              <span className="block text-xs text-ink-3">No volveremos a pedirte código aquí. Desactívalo en computadoras compartidas.</span>
            </span>
          </label>
        </form>
      </Item>

      <Item className="mt-8 border-t border-dashed border-line-strong pt-5 text-sm text-ink-2">
        ¿No te llegó? Revisa la carpeta de spam o{" "}
        <button onClick={resend} disabled={cooldown > 0} className="font-semibold text-brand disabled:cursor-default disabled:text-ink-3">
          {cooldown > 0 ? `reenvía en ${cooldown} s` : "envíame otro código"}
        </button>
        .
      </Item>
    </Stagger>
  );
}

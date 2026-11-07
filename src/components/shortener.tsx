"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Link2, LoaderCircle, Scissors } from "lucide-react";
import Link from "next/link";
import { SnipTicket } from "./snip-ticket";
import { EASE } from "./motion";
import { cx } from "./ui";

type Result = { id: string; slug: string; url: string; anonymous: boolean };

export function Shortener({ loggedIn }: { loggedIn: boolean }) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [shake, setShake] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) {
      setError("Pega el enlace que quieres acortar.");
      setShake((n) => n + 1);
      inputRef.current?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No pudimos acortar el enlace. Intenta de nuevo.");
        setShake((n) => n + 1);
        return;
      }
      setResult({ id: data.link.id, slug: data.link.slug, url: data.link.url, anonymous: data.anonymous });
      setUrl("");
    } catch {
      setError("Sin conexión. Revisa tu internet e intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="w-full">
      <motion.form
        onSubmit={submit}
        noValidate
        key={shake}
        animate={shake ? { x: [0, -6, 6, -3, 3, 0] } : undefined}
        transition={{ duration: 0.36, ease: "easeOut" }}
        className={cx(
          "group/bar flex flex-col gap-2 rounded-2xl border bg-surface p-2 shadow-2 transition-[border-color,box-shadow] duration-200 sm:flex-row sm:items-center",
          "focus-within:border-brand focus-within:shadow-[0_0_0_4px_var(--ring),var(--shadow-2)]",
          error ? "border-danger" : "border-line",
        )}
      >
        <label htmlFor="long-url" className="sr-only">
          Enlace largo
        </label>
        <div className="flex min-w-0 flex-1 items-center gap-2.5 pl-3">
          <Link2 className="size-[18px] shrink-0 text-ink-3 transition-colors group-focus-within/bar:text-brand" aria-hidden />
          <input
            ref={inputRef}
            id="long-url"
            type="url"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Pega un enlace largo: https://tutienda.com/oferta?utm_source=…"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "url-error" : undefined}
            className="h-12 w-full min-w-0 bg-transparent font-mono text-[14px] text-ink outline-none placeholder:font-sans placeholder:text-[15px] placeholder:text-ink-3"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="stamp relative inline-flex h-12 shrink-0 items-center justify-center gap-2 overflow-hidden rounded-xl bg-brand px-6 text-[15px] font-semibold text-brand-ink hover:bg-brand-strong disabled:opacity-80"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {busy ? (
              <motion.span key="b" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="inline-flex items-center gap-2">
                <LoaderCircle className="size-4 animate-spin" aria-hidden /> Cortando…
              </motion.span>
            ) : (
              <motion.span key="i" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="inline-flex items-center gap-2">
                <Scissors className="size-4" aria-hidden /> Acortar
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </motion.form>

      <div className="min-h-6 px-2 pt-2" aria-live="polite">
        <AnimatePresence mode="wait">
          {error ? (
            <motion.p key="err" id="url-error" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-[13px] text-danger">
              {error}
            </motion.p>
          ) : !result ? (
            <motion.p key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[13px] text-ink-3">
              {loggedIn ? "Se guarda en tu cuenta, sin fecha de vencimiento." : "Gratis y sin cuenta. Los enlaces sin cuenta duran 7 días."}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>

      <AnimatePresence mode="wait">
        {result && (
          <motion.div key={result.slug} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, ease: EASE }} className="mt-2">
            <SnipTicket
              longUrl={result.url}
              shortUrl={`${origin}/${result.slug}`}
              slug={result.slug}
              linkId={result.anonymous ? undefined : result.id}
              statsHref={result.anonymous ? undefined : `/links/${result.id}`}
              note={
                result.anonymous ? (
                  <>
                    Este enlace vence en 7 días.{" "}
                    <Link href="/register" className="font-semibold text-brand underline-offset-4 hover:underline">
                      Crea una cuenta gratis
                    </Link>{" "}
                    para que sea permanente, elegir tu alias y ver quién hace clic.
                  </>
                ) : undefined
              }
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

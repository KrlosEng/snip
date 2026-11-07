"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { LoaderCircle } from "lucide-react";
import { TearOffFlyer } from "./tear-off-flyer";
import { EASE } from "./motion";
import { cx } from "./ui";

export type ShortResult = { id: string; slug: string; url: string; anonymous: boolean };

/** Lógica compartida de "acortar": la usan el hero y la frase final. */
export function useShorten() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ShortResult | null>(null);

  async function shorten(url: string): Promise<boolean> {
    if (!url.trim()) {
      setError("Pega el enlace que quieres acortar.");
      return false;
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
        return false;
      }
      setResult({ id: data.link.id, slug: data.link.slug, url: data.link.url, anonymous: data.anonymous });
      return true;
    } catch {
      setError("Sin conexión. Revisa tu internet e intenta de nuevo.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  return { busy, error, setError, result, shorten };
}

export function ShortResultView({ result }: { result: ShortResult }) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return (
    <motion.div key={result.slug} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}>
      <TearOffFlyer shortUrl={`${origin}/${result.slug}`} slug={result.slug} longUrl={result.url} linkId={result.anonymous ? undefined : result.id} />
      <p className="mt-4 max-w-[48ch] text-[16px] leading-relaxed text-ink">
        {result.anonymous ? (
          <>
            Este enlace dura 7 días.{" "}
            <Link href="/register" className="font-bold underline underline-offset-4">
              Crea una cuenta gratis
            </Link>{" "}
            para que sea permanente, elegir tu alias y ver quién hace clic.
          </>
        ) : (
          <>
            Quedó en tu cuenta, sin vencimiento.{" "}
            <Link href={`/links/${result.id}`} className="font-bold underline underline-offset-4">
              Ver sus clics
            </Link>
          </>
        )}
      </p>
    </motion.div>
  );
}

export function Shortener({ loggedIn }: { loggedIn: boolean }) {
  const [url, setUrl] = useState("");
  const [shake, setShake] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { busy, error, setError, result, shorten } = useShorten();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const ok = await shorten(url);
    if (ok) setUrl("");
    else {
      setShake((n) => n + 1);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="w-full">
      <motion.form
        onSubmit={submit}
        noValidate
        key={shake}
        animate={shake ? { x: [0, -6, 6, -3, 3, 0] } : undefined}
        transition={{ duration: 0.36, ease: "easeOut" }}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <label htmlFor="long-url" className="sr-only">
          Enlace largo
        </label>
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
          placeholder="Pega aquí tu enlace largo"
          aria-invalid={Boolean(error)}
          aria-describedby="url-msg"
          className={cx(
            "h-14 w-full min-w-0 rounded-full sm:flex-1 bg-surface px-6 text-[17px] text-ink outline-none transition-[box-shadow] placeholder:text-ink-3",
            "focus:outline-3 focus:outline-offset-2 focus:outline-ink",
            error && "outline-2 outline-danger",
          )}
        />
        <button
          type="submit"
          disabled={busy}
          className="inline-flex h-14 shrink-0 items-center justify-center gap-2 rounded-full bg-brand px-8 text-[17px] font-bold text-brand-ink transition-[background-color,transform] duration-150 hover:bg-brand-strong active:scale-[0.96] disabled:opacity-80"
        >
          {busy && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
          {busy ? "acortando…" : "acortar"}
        </button>
      </motion.form>

      <p id="url-msg" aria-live="polite" className={cx("mt-3 min-h-6 px-2 text-[16px]", error ? "font-medium text-danger" : "text-ink")}>
        {error ?? (result ? "" : loggedIn ? "Se guarda en tu cuenta, sin vencimiento." : "Gratis y sin cuenta. Sin cuenta, el enlace dura 7 días.")}
      </p>

      <AnimatePresence mode="wait">{result && <ShortResultView result={result} />}</AnimatePresence>
    </div>
  );
}

"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { useShorten } from "../shortener";
import { QrPreview, downloadQr } from "../qr";
import { stripProtocol } from "@/lib/format";
import { cx } from "../ui";
import { pill } from "./styles";

/**
 * El acortador de la landing: un campo con subrayado y una sola píldora violeta.
 * El hero y el cierre comparten el mismo resultado, que se abre como una fila
 * de texto sobre el vacío, sin tarjetas.
 */

type Ctx = ReturnType<typeof useShorten>;
const ShortenCtx = createContext<Ctx | null>(null);

export function ShortenProvider({ children }: { children: ReactNode }) {
  const value = useShorten();
  return <ShortenCtx value={value}>{children}</ShortenCtx>;
}

function useBoard(): Ctx {
  const c = useContext(ShortenCtx);
  if (!c) throw new Error("ShortenProvider ausente");
  return c;
}

function goToResult() {
  document.getElementById("resultado")?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function UrlForm({ id, label, loggedIn, cta }: { id: string; label: string; loggedIn?: boolean; cta?: boolean }) {
  const { busy, error, setError, result, shorten } = useBoard();
  const [url, setUrl] = useState("");

  return (
    <form
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        if (await shorten(url)) {
          setUrl("");
          setTimeout(goToResult, 150);
        }
      }}
    >
      <label htmlFor={id} className="block text-[14px] leading-[1.2] font-semibold tracking-[0.025em] text-saffron uppercase">
        {label}
      </label>
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end">
        <input
          id={id}
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (error) setError(null);
          }}
          placeholder="https://tu-enlace-largo.com/…"
          aria-invalid={Boolean(error)}
          aria-describedby={`${id}-msg`}
          className={cx(
            "h-12 min-w-0 flex-1 border-0 border-b bg-transparent px-0 text-[18px] text-white transition-colors outline-none placeholder:text-[#6f6f78]",
            error ? "border-[#ff7a6b]" : "border-[#3a3a41] focus:border-iris",
          )}
        />
        <button type="submit" disabled={busy} className={pill}>
          {busy && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
          {busy ? "Acortando…" : "Acortar"}
        </button>
      </div>
      <p id={`${id}-msg`} aria-live="polite" className={cx("mt-3 min-h-6 text-[15px] leading-snug", error ? "text-[#ff7a6b]" : "text-ash")}>
        {error ?? (result ? (cta ? "Listo: te llevamos a tu enlace." : "Listo: tu enlace está justo abajo.") : loggedIn ? "Se guarda en tu cuenta, sin vencimiento." : "Gratis y sin cuenta. Sin cuenta, dura 7 días.")}
      </p>
    </form>
  );
}

export const HeroForm = ({ loggedIn }: { loggedIn: boolean }) => <UrlForm id="long-url" label="Pega tu enlace largo" loggedIn={loggedIn} />;
export const CtaForm = () => <UrlForm id="cta-url" label="Pega tu enlace largo" cta />;

/** El resultado: se abre bajo el hero con el enlace a tamaño de titular y su QR. */
export function ResultSection() {
  const { result } = useBoard();
  const [copied, setCopied] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* el enlace sigue visible para copiarlo a mano */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const shortUrl = result ? `${origin}/${result.slug}` : "";
  const display = stripProtocol(shortUrl);
  const host = result ? display.slice(0, display.length - result.slug.length) : "";
  const ghost = "text-[14px] font-semibold uppercase tracking-[0.025em] text-white transition-colors hover:text-saffron";

  return (
    <div id="resultado" aria-live="polite" className={cx("grid transition-[grid-template-rows] duration-700 ease-out", result ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
      <div className="overflow-hidden">
        {result && (
          <div className="mx-auto grid max-w-[1280px] items-center gap-12 px-6 py-16 md:grid-cols-[1fr_auto] md:py-24">
            <div className="min-w-0">
              <p className="text-[14px] leading-[1.2] font-semibold tracking-[0.025em] text-saffron uppercase">Tu enlace corto</p>
              <a href={shortUrl} target="_blank" rel="noopener" className="mt-5 block text-[clamp(2rem,6vw,5rem)] leading-[1.02] font-normal tracking-[-0.04em] break-all text-white hover:opacity-80" aria-label={`Abrir ${display}`}>
                <span className="text-ash">{host}</span>
                {result.slug}
              </a>
              <p className="mt-4 max-w-[60ch] truncate text-[18px] font-extralight text-mist" title={result.url}>
                antes: {stripProtocol(result.url)}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3">
                <button type="button" onClick={() => copy(shortUrl)} className={ghost}>
                  {copied ? "Copiado ✓" : "Copiar enlace"}
                </button>
                <button type="button" onClick={() => downloadQr(shortUrl, result.slug, "png")} className={ghost}>
                  QR en PNG
                </button>
                <button type="button" onClick={() => downloadQr(shortUrl, result.slug, "svg")} className={ghost}>
                  QR en SVG
                </button>
                {!result.anonymous && (
                  <Link href={`/links/${result.id}`} className={ghost}>
                    Ver sus clics
                  </Link>
                )}
              </div>
              {result.anonymous && (
                <p className="mt-8 max-w-[52ch] text-[18px] leading-[1.5] font-extralight">
                  Este enlace dura 7 días.{" "}
                  <Link href="/register" className="font-normal text-saffron underline underline-offset-4">
                    Crea una cuenta gratis
                  </Link>{" "}
                  para que sea permanente, elegir tu alias y ver quién hace clic.
                </p>
              )}
            </div>
            <div className="w-[200px] overflow-hidden rounded-[24px] md:w-[240px]">
              <QrPreview value={shortUrl} className="w-full" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

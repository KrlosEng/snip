"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { ShortResultView, useShorten } from "../shortener";
import { cx } from "../ui";

/**
 * El acortador de la landing vive en dos mosaicos (el del hero y el del cierre)
 * y comparten un mismo resultado: el volante de tiras que aparece bajo el hero.
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

/** Mosaico de acción del hero: el campo para pegar el enlace. */
export function ActionTile({ loggedIn }: { loggedIn: boolean }) {
  const { busy, error, setError, result, shorten } = useBoard();
  const [url, setUrl] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (await shorten(url)) {
      setUrl("");
      setTimeout(goToResult, 120);
    }
  }

  return (
    <form noValidate onSubmit={submit} className="flex h-full flex-col">
      <label htmlFor="long-url" className="text-[24px] leading-[1.05] font-bold tracking-[-0.03em] sm:text-[28px]">
        pega tu enlace largo
      </label>
      <p id="url-msg" aria-live="polite" className={cx("mt-2 text-[15px] leading-snug", error && "font-semibold text-[#f6c4b4]")}>
        {error ?? (result ? "Listo: tu volante está justo abajo." : loggedIn ? "Se guarda en tu cuenta, sin vencimiento." : "Gratis y sin cuenta. Dura 7 días.")}
      </p>
      <div className="mt-auto grid gap-2 pt-8">
        <input
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
          placeholder="https://…"
          aria-invalid={Boolean(error)}
          aria-describedby="url-msg"
          className={cx(
            "h-12 w-full min-w-0 rounded-lg bg-surface px-4 text-[17px] text-ink outline-none placeholder:text-ink-3",
            "focus:outline-3 focus:outline-offset-2 focus:outline-brand-ink",
            error && "outline-2 outline-[#f0b7a6]",
          )}
        />
        <button
          type="submit"
          disabled={busy}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#e3e2da] text-[17px] font-bold text-[#1c1c1c] transition-[background-color,transform] duration-150 hover:bg-white active:scale-[0.98] disabled:opacity-80"
        >
          {busy && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
          {busy ? "acortando…" : "acortar"}
        </button>
      </div>
    </form>
  );
}

/** El resultado: una fila del tablero que se abre bajo el hero. */
export function ResultRow() {
  const { result } = useBoard();
  return (
    <div id="resultado" aria-live="polite" className={cx("grid transition-[grid-template-rows] duration-500 ease-out", result ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
      <div className="overflow-hidden">
        <div className="rounded-lg bg-field-3 p-6 md:p-8">{result && <ShortResultView result={result} />}</div>
      </div>
    </div>
  );
}

/** Mosaico de acción del cierre: el campo con el botón dentro. */
export function CtaTile() {
  const { busy, error, setError, result, shorten } = useBoard();
  const [url, setUrl] = useState("");

  return (
    <form
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        if (await shorten(url)) {
          setUrl("");
          setTimeout(goToResult, 120);
        }
      }}
      className="flex h-full flex-col justify-center"
    >
      <h2 id="empezar-t" className="max-w-[16ch] text-[32px] sm:text-[40px] leading-[0.98] font-bold tracking-[-0.04em]">
        tu primer enlace corto, ahora
      </h2>
      <p className="mt-3 max-w-[44ch] text-[17px] leading-snug">Pégalo, acórtalo y recibe su QR al momento. Sin cuenta dura 7 días; con una cuenta gratis es permanente y ves cada clic.</p>
      <div className="relative mt-6 max-w-[460px]">
        <label htmlFor="cta-url" className="sr-only">
          Tu enlace largo
        </label>
        <input
          id="cta-url"
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (error) setError(null);
          }}
          placeholder="https://…"
          aria-invalid={Boolean(error)}
          aria-describedby="cta-msg"
          className="h-14 w-full rounded-lg bg-surface pr-[132px] pl-4 text-[17px] text-ink outline-none placeholder:text-ink-3 focus:outline-3 focus:outline-offset-2 focus:outline-brand-ink"
        />
        <button
          type="submit"
          disabled={busy}
          className="absolute top-1.5 right-1.5 inline-flex h-11 items-center gap-2 rounded-lg bg-[#1c1c1c] px-5 text-[17px] font-bold text-[#e3e2da] transition-[background-color,transform] duration-150 hover:bg-black active:scale-[0.97] disabled:opacity-80"
        >
          {busy && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
          acortar
        </button>
      </div>
      <p id="cta-msg" aria-live="polite" className="mt-3 min-h-6 text-[15px]">
        {error ?? (result ? "Listo: te llevamos a tu volante." : "")}
      </p>
    </form>
  );
}

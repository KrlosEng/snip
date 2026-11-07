"use client";

import { useState } from "react";
import { AnimatePresence } from "motion/react";
import { LoaderCircle } from "lucide-react";
import { ShortResultView, useShorten } from "../shortener";

/** La frase final con un hueco: el hueco es el campo y la última palabra es el botón. */
export function CtaSentence() {
  const [url, setUrl] = useState("");
  const { busy, error, setError, result, shorten } = useShorten();

  return (
    <div>
      <form
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          if (await shorten(url)) setUrl("");
        }}
      >
        <h2 id="cierre" className="text-[11vw] leading-[1.02] font-bold tracking-[-0.05em] md:text-[clamp(3rem,6.4vw,6.5rem)]">
          pega{" "}
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
            placeholder="tu enlace"
            aria-invalid={Boolean(error)}
            aria-describedby="cta-msg"
            className="inline-block h-[1.02em] w-[7em] max-w-full rounded-full bg-[#3c4a2c] px-[0.4em] align-baseline text-[0.8em] font-bold tracking-[-0.03em] text-field-4-ink outline-none placeholder:text-[#a9b49b] focus:outline-3 focus:outline-offset-2 focus:outline-field-4-ink max-md:my-2 max-md:block max-md:w-full"
          />{" "}
          y{" "}
          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-[1.02em] items-center gap-[0.2em] rounded-full bg-field-2 px-[0.4em] align-baseline text-field-ink transition-[background-color,transform] hover:bg-[#c9d8cf] active:scale-[0.97]"
          >
            {busy && <LoaderCircle className="size-[0.5em] animate-spin" aria-hidden />}
            acórtalo
          </button>
        </h2>
      </form>
      <p id="cta-msg" aria-live="polite" className="mt-6 max-w-[56ch] text-[17px] text-field-4-ink">
        {error ?? "Recibes el enlace corto y su QR al momento. Sin cuenta dura 7 días; con una cuenta gratis es permanente y ves cada clic."}
      </p>
      <AnimatePresence>
        {result && (
          <div className="mt-10 [&>div>p]:text-field-4-ink [&_p_a]:text-field-4-ink">
            <ShortResultView result={result} />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

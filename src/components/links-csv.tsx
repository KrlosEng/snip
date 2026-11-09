"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, LoaderCircle, Upload } from "lucide-react";
import { useToast } from "./providers";

const btn =
  "inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-sm font-medium text-ink-2 transition-[background-color,border-color,color,transform] hover:border-line-strong hover:text-ink active:scale-[0.97] disabled:opacity-60";

type Result = { created: number; total: number; errors: { row: number; error: string }[] };

/** Exportar todos los enlaces a CSV e importar enlaces desde un CSV. */
export function LinksCsv({ readOnly }: { readOnly: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 300_000) {
      toast({ tone: "error", title: "Archivo demasiado grande", body: "El máximo es 300 KB (unos 500 enlaces)." });
      return;
    }
    setBusy(true);
    const csv = await file.text();
    const res = await fetch("/api/links/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv }),
    }).catch(() => null);
    setBusy(false);
    if (input.current) input.current.value = "";
    const data = await res?.json().catch(() => null);
    if (!res?.ok) {
      toast({ tone: "error", title: "No se pudo importar", body: data?.error ?? "Sin conexión. Intenta de nuevo." });
      return;
    }
    const r = data as Result;
    if (r.created) router.refresh();
    toast({
      tone: r.errors.length && !r.created ? "error" : "success",
      title: `Importaste ${r.created} de ${r.total} ${r.total === 1 ? "enlace" : "enlaces"}`,
      body: r.errors.length ? (
        <ul className="mt-1 grid gap-0.5">
          {r.errors.slice(0, 4).map((e) => (
            <li key={e.row}>
              Fila {e.row}: {e.error}
            </li>
          ))}
          {r.errors.length > 4 && <li>y {r.errors.length - 4} filas más con problemas.</li>}
        </ul>
      ) : undefined,
    });
  }

  return (
    <>
      <a href="/api/links/export" download className={btn} title="Descarga todos tus enlaces en un archivo CSV">
        <Download className="size-4" aria-hidden />
        <span className="hidden sm:inline">Exportar</span>
        <span className="sr-only sm:hidden">Exportar enlaces</span>
      </a>
      {!readOnly && (
        <>
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={busy}
            className={btn}
            title="Columnas: destino (obligatoria), alias, nombre, carpeta, etiquetas"
          >
            {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Upload className="size-4" aria-hidden />}
            <span className="hidden sm:inline">{busy ? "Importando…" : "Importar"}</span>
            <span className="sr-only sm:hidden">Importar enlaces desde CSV</span>
          </button>
          <input ref={input} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        </>
      )}
    </>
  );
}

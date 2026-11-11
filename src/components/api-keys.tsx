"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { KeyRound, LoaderCircle, ShieldAlert } from "lucide-react";
import { Button, Field, Input, cx } from "./ui";
import { CopyButton, EASE } from "./motion";
import { useToast } from "./providers";
import { timeAgo } from "@/lib/format";

type Key = { id: string; name: string; prefix: string; createdAt: number; lastUsedAt: number | null };

/** Crear, ver y revocar claves de la API pública. */
export function ApiKeys({ isDemo }: { isDemo: boolean }) {
  const toast = useToast();
  const [items, setItems] = useState<Key[] | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fresh, setFresh] = useState<{ key: string; name: string } | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/me/keys")
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => alive && setItems(d.items))
      .catch(() => alive && setItems([]));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!confirm) return;
    const t = setTimeout(() => setConfirm(null), 3500);
    return () => clearTimeout(t);
  }, [confirm]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError("Ponle un nombre, por ejemplo “Zapier” o “Mi sitio”.");
    setBusy(true);
    setError(null);
    const res = await fetch("/api/me/keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setBusy(false);
    if (!res?.ok) return setError(data?.error ?? "Sin conexión. Intenta de nuevo.");
    setItems((cur) => [data.item, ...(cur ?? [])]);
    setFresh({ key: data.key, name: data.item.name });
    setName("");
  }

  async function revoke(k: Key) {
    if (confirm !== k.id) return setConfirm(k.id);
    setConfirm(null);
    const prev = items;
    setItems((cur) => (cur ?? []).filter((x) => x.id !== k.id));
    const res = await fetch(`/api/me/keys/${k.id}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) {
      setItems(prev);
      toast({ tone: "error", title: "No se pudo revocar la clave" });
      return;
    }
    if (fresh && k.name === fresh.name) setFresh(null);
    toast({ tone: "success", title: `Revocaste “${k.name}”`, body: "Deja de funcionar al instante." });
  }

  return (
    <div className="grid gap-5 p-5 sm:p-6">
      <p className="text-sm text-ink-2">
        Con una clave, otros programas (tu sitio, Zapier, una hoja de cálculo) pueden crear enlaces y leer sus estadísticas.{" "}
        <Link href="/docs/api" className="font-semibold text-brand underline-offset-4 hover:underline">
          Ver la documentación
        </Link>
      </p>

      <AnimatePresence initial={false}>
        {fresh && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="grid gap-2 rounded-lg border border-brand/40 bg-brand-soft/40 p-4"
            role="status"
          >
            <p className="flex items-center gap-2 text-sm font-semibold">
              <ShieldAlert className="size-4 text-brand" aria-hidden /> Copia tu clave “{fresh.name}” ahora
            </p>
            <p className="text-[13px] text-ink-2">Por seguridad no la volverás a ver. Si la pierdes, revócala y crea otra.</p>
            <div className="flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-2">
              <code className="min-w-0 flex-1 truncate font-mono text-[13px]">{fresh.key}</code>
              <CopyButton compact text={fresh.key} />
            </div>
            <button type="button" onClick={() => setFresh(null)} className="justify-self-end text-[13px] font-semibold text-ink-2 hover:text-ink">
              Ya la guardé
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {isDemo ? (
        <p className="rounded-lg bg-surface-2 px-3 py-2.5 text-[13px] text-ink-2">La cuenta demo no puede crear claves. Crea tu cuenta gratis para usar la API.</p>
      ) : (
        <form onSubmit={create} noValidate className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <Field label="Nombre de la clave" htmlFor="key-name" error={error}>
              <Input id="key-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Mi sitio web" maxLength={40} autoComplete="off" invalid={Boolean(error)} />
            </Field>
          </div>
          <Button type="submit" loading={busy}>
            Crear clave
          </Button>
        </form>
      )}

      {items === null ? (
        <p className="flex items-center gap-2 text-sm text-ink-3">
          <LoaderCircle className="size-4 animate-spin" aria-hidden /> Cargando claves…
        </p>
      ) : items.length === 0 ? (
        <p className="text-sm text-ink-3">Aún no tienes claves.</p>
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line">
          {items.map((k) => (
            <li key={k.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
              <KeyRound className="size-4 text-ink-3" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{k.name}</p>
                <p className="text-xs text-ink-3">
                  <span className="font-mono">{k.prefix}</span> · {k.lastUsedAt ? `usada ${timeAgo(k.lastUsedAt)}` : "sin usar"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => revoke(k)}
                className={cx(
                  "h-9 rounded-lg border px-3 text-[13px] font-semibold transition-[background-color,border-color,color,transform] active:scale-[0.97]",
                  confirm === k.id ? "border-danger bg-danger text-brand-ink" : "border-line text-danger hover:border-danger/50",
                )}
              >
                {confirm === k.id ? "¿Revocar? Pulsa otra vez" : "Revocar"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

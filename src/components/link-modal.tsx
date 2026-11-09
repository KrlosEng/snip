"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { ChevronDown, X } from "lucide-react";
import { Button, Field, FieldMessage, Input, cx } from "./ui";
import { TearOffFlyer } from "./tear-off-flyer";
import { EASE } from "./motion";
import { useToast } from "./providers";
import type { Facets, LinkDTO } from "@/lib/links";
import { UTM_FIELDS, applyUtm, hasUtm, readUtm, type Utm } from "@/lib/utm";

type Ctx = { openCreate: () => void; openEdit: (link: LinkDTO) => void };
const LinkModalCtx = createContext<Ctx>({ openCreate: () => {}, openEdit: () => {} });
export const useLinkModal = () => useContext(LinkModalCtx);

function toLocalInput(ts: number | null): string {
  if (!ts) return "";
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function LinkModalProvider({ children, host }: { children: ReactNode; host: string }) {
  const [state, setState] = useState<{ mode: "create" } | { mode: "edit"; link: LinkDTO } | null>(null);
  const openCreate = useCallback(() => setState({ mode: "create" }), []);
  const openEdit = useCallback((link: LinkDTO) => setState({ mode: "edit", link }), []);

  // Atajo de teclado: "C" abre "Crear enlace" (fuera de campos de texto).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key.toLowerCase() !== "c" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (t.closest("input, textarea, select, [contenteditable]")) return;
      e.preventDefault();
      setState((s) => s ?? { mode: "create" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <LinkModalCtx.Provider value={{ openCreate, openEdit }}>
      {children}
      <AnimatePresence>
        {state && <LinkDialog key={state.mode === "edit" ? state.link.id : "new"} state={state} host={host} onClose={() => setState(null)} />}
      </AnimatePresence>
    </LinkModalCtx.Provider>
  );
}

function LinkDialog({
  state,
  host,
  onClose,
}: {
  state: { mode: "create" } | { mode: "edit"; link: LinkDTO };
  host: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const editing = state.mode === "edit" ? state.link : null;
  const [url, setUrl] = useState(editing?.url ?? "");
  const [alias, setAlias] = useState(editing?.slug ?? "");
  const [title, setTitle] = useState(editing?.title ?? "");
  const [expires, setExpires] = useState(toLocalInput(editing?.expiresAt ?? null));
  const [advanced, setAdvanced] = useState(Boolean(editing?.expiresAt));
  const [folder, setFolder] = useState(editing?.folder ?? "");
  const [tags, setTags] = useState((editing?.tags ?? []).join(", "));
  const [utm, setUtm] = useState<Utm>(() => readUtm(editing?.url ?? ""));
  const [showUtm, setShowUtm] = useState(() => hasUtm(readUtm(editing?.url ?? "")));
  const [facets, setFacets] = useState<Facets>({ folders: [], tags: [] });
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [created, setCreated] = useState<LinkDTO | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => firstRef.current?.focus(), 60);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && panelRef.current) {
        const f = panelRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input, select, textarea");
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      prev?.focus?.();
    };
  }, [onClose]);

  // Sugerencias: carpetas y etiquetas que ya existen.
  useEffect(() => {
    let alive = true;
    fetch("/api/links/facets")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Facets | null) => alive && d && setFacets(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const tagList = tags
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  const finalUrl = showUtm && url.trim() ? applyUtm(url, utm) : url;

  function addTag(t: string) {
    if (tagList.includes(t)) return;
    setTags([...tagList, t].join(", "));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!url.trim()) errs.url = "Pega el enlace de destino.";
    if (alias && !/^[a-zA-Z0-9-]{3,32}$/.test(alias)) errs.alias = "Usa de 3 a 32 letras, números o guiones.";
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setBusy(true);
    setErrors({});
    const expiresAt = advanced && expires ? new Date(expires).toISOString() : null;
    const extra = { title: title.trim() || null, folder: folder.trim() || null, tags: tagList };
    const body = editing
      ? { url: finalUrl, alias: alias || editing.slug, expiresAt, ...extra }
      : { url: finalUrl, alias: alias || null, expiresAt, ...extra };
    try {
      const res = await fetch(editing ? `/api/links/${editing.id}` : "/api/links", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrors({ [data.field ?? "form"]: data.error ?? "No pudimos guardar el enlace." });
        setBusy(false);
        return;
      }
      router.refresh();
      if (editing) {
        toast({ tone: "success", title: "Cambios guardados" });
        onClose();
      } else {
        setCreated(data.link);
        setBusy(false);
      }
    } catch {
      setErrors({ form: "Sin conexión. Revisa tu internet e intenta de nuevo." });
      setBusy(false);
    }
  }

  const origin = typeof window !== "undefined" ? window.location.origin : `https://${host}`;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6" role="presentation">
      <motion.div
        className="absolute inset-0 bg-[oklch(0.2_0.03_272/0.42)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
      />
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="link-dialog-title"
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98, transition: { duration: 0.18 } }}
        transition={{ duration: 0.4, ease: EASE }}
        className={cx(
          "relative max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl border border-line bg-surface shadow-3 sm:rounded-2xl",
          created ? "sm:max-w-2xl" : "sm:max-w-lg",
        )}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface px-5 py-4 sm:px-6">
          <h2 id="link-dialog-title" className="text-lg font-semibold">
            {created ? "¡Listo! Tu enlace está activo" : editing ? "Editar enlace" : "Crear enlace"}
          </h2>
          <button onClick={onClose} className="grid size-8 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink" aria-label="Cerrar">
            <X className="size-4" />
          </button>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {created ? (
            <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-5 sm:p-6">
              <TearOffFlyer longUrl={created.url} shortUrl={`${origin}/${created.slug}`} slug={created.slug} linkId={created.id} />
              <div className="mt-5 flex justify-end gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setCreated(null);
                    setUrl("");
                    setAlias("");
                    setExpires("");
                    setAdvanced(false);
                    setTitle("");
                    setUtm({});
                    setShowUtm(false);
                    setTimeout(() => firstRef.current?.focus(), 50);
                  }}
                >
                  Crear otro
                </Button>
                <Button onClick={onClose}>Terminar</Button>
              </div>
            </motion.div>
          ) : (
            <motion.form key="form" exit={{ opacity: 0 }} onSubmit={submit} noValidate className="grid gap-5 p-5 sm:p-6">
              <Field label="Enlace de destino" htmlFor="dest" error={errors.url}>
                <Input
                  ref={firstRef}
                  id="dest"
                  type="url"
                  inputMode="url"
                  placeholder="https://tusitio.com/pagina-larga?utm_source=…"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  invalid={Boolean(errors.url)}
                  className="font-mono text-[14px]"
                />
              </Field>

              <Field
                label="Alias"
                htmlFor="alias"
                optional={!editing}
                error={errors.alias}
                hint={editing ? "Si lo cambias, el enlace anterior deja de funcionar." : "Déjalo vacío y generamos uno de 7 caracteres."}
              >
                <div
                  className={cx(
                    "flex h-10 items-center overflow-hidden rounded-lg border bg-surface transition-[border-color,box-shadow] focus-within:border-brand focus-within:shadow-[0_0_0_3px_var(--ring)]",
                    errors.alias ? "border-danger" : "border-line hover:border-line-strong",
                  )}
                >
                  <span className="flex h-full shrink-0 items-center border-r border-line bg-surface-2 px-3 font-mono text-[13px] text-ink-3">{host}/</span>
                  <input
                    id="alias"
                    value={alias}
                    onChange={(e) => setAlias(e.target.value.replace(/\s+/g, "-"))}
                    placeholder="mi-tienda"
                    maxLength={32}
                    autoComplete="off"
                    spellCheck={false}
                    aria-invalid={Boolean(errors.alias)}
                    className="h-full min-w-0 flex-1 bg-transparent px-3 font-mono text-[14px] text-ink outline-none placeholder:text-ink-3"
                  />
                </div>
              </Field>

              <Field label="Nombre para identificarlo" htmlFor="title" optional>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Campaña de Instagram" maxLength={200} />
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Carpeta" htmlFor="folder" optional error={errors.folder}>
                  <Input id="folder" list="folder-options" value={folder} onChange={(e) => setFolder(e.target.value)} placeholder="Clientes" maxLength={40} autoComplete="off" />
                  <datalist id="folder-options">
                    {facets.folders.map((f) => (
                      <option key={f.name} value={f.name} />
                    ))}
                  </datalist>
                </Field>
                <Field label="Etiquetas" htmlFor="tags" optional error={errors.tags} hint="Sepáralas con comas.">
                  <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="promo, verano" autoComplete="off" spellCheck={false} />
                </Field>
              </div>
              {facets.tags.some((t) => !tagList.includes(t.name)) && (
                <div className="-mt-2 flex flex-wrap gap-1.5" aria-label="Etiquetas que ya usas">
                  {facets.tags
                    .filter((t) => !tagList.includes(t.name))
                    .slice(0, 8)
                    .map((t) => (
                      <button
                        key={t.name}
                        type="button"
                        onClick={() => addTag(t.name)}
                        className="h-7 rounded-full border border-line px-2.5 text-[12px] text-ink-2 transition-[border-color,color,transform] hover:border-line-strong hover:text-ink active:scale-[0.96]"
                      >
                        + #{t.name}
                      </button>
                    ))}
                </div>
              )}

              <div>
                <button
                  type="button"
                  onClick={() => setShowUtm((s) => !s)}
                  aria-expanded={showUtm}
                  className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-2 transition-colors hover:text-ink"
                >
                  <motion.span animate={{ rotate: showUtm ? 180 : 0 }} transition={{ duration: 0.25, ease: EASE }}>
                    <ChevronDown className="size-4" />
                  </motion.span>
                  Parámetros UTM
                </button>
                <div className={cx("grid transition-[grid-template-rows] duration-300 ease-out", showUtm ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
                  <div className="overflow-hidden">
                    <div className="grid gap-3 pt-3">
                      <p className="text-[13px] text-ink-2">Para que Google Analytics sepa de dónde llegó cada visita. Solo llena los que uses.</p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {UTM_FIELDS.map((f) => (
                          <div key={f.key} className="grid gap-1.5">
                            <label htmlFor={f.key} className="text-[13px] font-medium text-ink">
                              {f.label} <span className="font-mono text-[11px] font-normal text-ink-3">{f.key}</span>
                            </label>
                            <Input
                              id={f.key}
                              value={utm[f.key] ?? ""}
                              onChange={(e) => setUtm((u) => ({ ...u, [f.key]: e.target.value }))}
                              placeholder={f.example}
                              maxLength={100}
                              autoComplete="off"
                              spellCheck={false}
                              tabIndex={showUtm ? 0 : -1}
                            />
                          </div>
                        ))}
                      </div>
                      {hasUtm(utm) && url.trim() && (
                        <p className="rounded-lg bg-surface-2 px-3 py-2 font-mono text-[12px] break-all text-ink-2">
                          <span className="font-sans font-medium text-ink-3">Así quedará: </span>
                          {finalUrl}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setAdvanced((a) => !a)}
                  aria-expanded={advanced}
                  className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-2 transition-colors hover:text-ink"
                >
                  <motion.span animate={{ rotate: advanced ? 180 : 0 }} transition={{ duration: 0.25, ease: EASE }}>
                    <ChevronDown className="size-4" />
                  </motion.span>
                  Fecha de vencimiento
                </button>
                <div className={cx("grid transition-[grid-template-rows] duration-300 ease-out", advanced ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
                  <div className="overflow-hidden">
                    <div className="grid gap-1.5 pt-3">
                      <label htmlFor="expires" className="sr-only">
                        Vence el
                      </label>
                      <Input
                        id="expires"
                        type="datetime-local"
                        value={expires}
                        onChange={(e) => setExpires(e.target.value)}
                        invalid={Boolean(errors.expiresAt)}
                        tabIndex={advanced ? 0 : -1}
                      />
                      <FieldMessage error={errors.expiresAt} hint="Después de esta fecha, el enlace muestra una página de “enlace vencido”." />
                    </div>
                  </div>
                </div>
              </div>

              {errors.form && (
                <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2.5 text-[13px] text-danger">
                  {errors.form}
                </p>
              )}

              <div className="flex justify-end gap-2 border-t border-line pt-5">
                <Button type="button" variant="ghost" onClick={onClose}>
                  Cancelar
                </Button>
                <Button type="submit" loading={busy}>
                  {editing ? "Guardar cambios" : "Crear enlace"}
                </Button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

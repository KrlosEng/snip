"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowDownWideNarrow, BarChart3, ChevronLeft, ChevronRight, Folder, LoaderCircle, Pencil, Plus, Search, SearchX, Trash2, X } from "lucide-react";
import { LinksCsv } from "@/components/links-csv";
import type { Facets } from "@/lib/links";
import { CopyButton, EASE, Item, Stagger } from "@/components/motion";
import { useLinkModal } from "@/components/link-modal";
import { useToast } from "@/components/providers";
import { StatusBadge, Switch, cx } from "@/components/ui";
import { fmt, hostOf, shortDate, stripProtocol } from "@/lib/format";
import type { LinkDTO } from "@/lib/links";

type Data = { items: LinkDTO[]; total: number; page: number; pages: number; pageSize: number };
type Status = "all" | "active" | "paused" | "expired";

const STATUSES: { v: Status; label: string }[] = [
  { v: "all", label: "Todos" },
  { v: "active", label: "Activos" },
  { v: "paused", label: "Pausados" },
  { v: "expired", label: "Vencidos" },
];

export function LinksView({
  data,
  q,
  sort,
  status,
  origin,
  hasAny,
  folder,
  tag,
  facets,
  readOnly,
}: {
  data: Data;
  q: string;
  sort: "recent" | "clicks" | "oldest";
  status: Status;
  origin: string;
  hasAny: boolean;
  folder: string | null;
  tag: string | null;
  facets: Facets;
  readOnly: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const { openCreate, openEdit } = useLinkModal();
  const [pending, startTransition] = useTransition();
  const [items, setItems] = useState(data.items);
  const [query, setQuery] = useState(q);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const host = stripProtocol(origin);

  // Sincroniza con los datos del servidor al cambiar filtros o página.
  const [seen, setSeen] = useState({ items: data.items, q });
  if (seen.items !== data.items || seen.q !== q) {
    setSeen({ items: data.items, q });
    setItems(data.items);
    if (seen.q !== q) setQuery(q);
  }

  function nav(patch: Record<string, string | number | null>) {
    const params = new URLSearchParams();
    const merged = { q, sort, status, folder, tag, page: data.page, ...patch } as Record<string, string | number | null>;
    if (!("page" in patch)) merged.page = 1;
    if (merged.q) params.set("q", String(merged.q));
    if (merged.folder !== null && merged.folder !== undefined) params.set("folder", String(merged.folder));
    if (merged.tag) params.set("tag", String(merged.tag));
    if (merged.sort && merged.sort !== "recent") params.set("sort", String(merged.sort));
    if (merged.status && merged.status !== "all") params.set("status", String(merged.status));
    if (merged.page && Number(merged.page) > 1) params.set("page", String(merged.page));
    const qs = params.toString();
    startTransition(() => router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false }));
  }

  function onSearch(v: string) {
    setQuery(v);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => nav({ q: v.trim() || null }), 280);
  }

  async function toggle(link: LinkDTO, active: boolean) {
    setItems((cur) => cur.map((l) => (l.id === link.id ? { ...l, isActive: active, status: l.status === "expired" ? "expired" : active ? "active" : "paused" } : l)));
    const res = await fetch(`/api/links/${link.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: active }),
    }).catch(() => null);
    if (!res?.ok) {
      const data = await res?.json().catch(() => null);
      setItems((cur) => cur.map((l) => (l.id === link.id ? link : l)));
      toast({ tone: "error", title: "No se pudo cambiar el estado", body: data?.error ?? "Intenta de nuevo." });
      return;
    }
    toast({ tone: "success", title: active ? "Enlace activado" : "Enlace pausado", body: active ? "Ya redirige a su destino." : "Quien lo abra verá que está pausado." });
    router.refresh();
  }

  function remove(link: LinkDTO) {
    const snapshot = items;
    setItems((cur) => cur.filter((l) => l.id !== link.id));
    let undone = false;
    const timer = setTimeout(async () => {
      if (undone) return;
      const res = await fetch(`/api/links/${link.id}`, { method: "DELETE" }).catch(() => null);
      if (!res?.ok) {
        const data = await res?.json().catch(() => null);
        setItems(snapshot);
        toast({ tone: "error", title: "No se pudo borrar el enlace", body: data?.error });
        return;
      }
      router.refresh();
    }, 5000);
    toast({
      tone: "success",
      title: `Borraste ${host}/${link.slug}`,
      body: (
        <button
          className="font-semibold text-brand underline-offset-4 hover:underline"
          onClick={() => {
            undone = true;
            clearTimeout(timer);
            setItems(snapshot);
          }}
        >
          Deshacer
        </button>
      ),
    });
  }

  if (!hasAny) {
    return (
      <Stagger className="grid gap-6">
        <Item as="header">
          <h1 className="text-[24px] font-semibold tracking-[-0.02em]">Mis enlaces</h1>
        </Item>
        <Item className="grid place-items-center rounded-3xl border border-dashed border-line-strong px-6 py-20 text-center">
          <p className="font-display text-xl font-semibold">Aún no tienes enlaces</p>
          <p className="mt-2 max-w-[42ch] text-ink-2">Crea uno y aparecerá aquí con sus clics, su estado y su código QR.</p>
          <button onClick={openCreate} className="mt-6 inline-flex h-11 items-center gap-2 rounded-[10px] bg-brand px-5 font-semibold text-brand-ink transition-[background-color,transform] hover:bg-brand-strong active:scale-[0.97]">
            <Plus className="size-4" aria-hidden /> Crear enlace
          </button>
        </Item>
      </Stagger>
    );
  }

  return (
    <Stagger className="grid grid-cols-[minmax(0,1fr)] gap-5">
      <Item as="header" className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[24px] leading-tight font-semibold tracking-[-0.02em]">Mis enlaces</h1>
          <p className="mt-1 text-ink-2">
            <span className="tnum">{fmt(data.total)}</span> {data.total === 1 ? "enlace" : "enlaces"}
            {q && (
              <>
                {" "}
                que coinciden con <span className="font-medium text-ink">“{q}”</span>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <LinksCsv readOnly={readOnly} />
          <button onClick={openCreate} className="hidden h-9 items-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-semibold text-brand-ink transition-[background-color,transform] hover:bg-brand-strong active:scale-[0.97] sm:inline-flex">
            <Plus className="size-4" aria-hidden /> Crear enlace
          </button>
        </div>
      </Item>

      <Item className="flex flex-col gap-3 md:flex-row md:items-center">
        <label className="relative flex flex-1 items-center">
          <span className="sr-only">Buscar enlaces</span>
          <Search className="pointer-events-none absolute left-3 size-4 text-ink-3" aria-hidden />
          <input
            value={query}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Buscar por alias, destino o nombre"
            className="h-10 w-full rounded-lg border border-line bg-surface pr-9 pl-9 text-sm outline-none transition-[border-color,box-shadow] placeholder:text-ink-3 hover:border-line-strong focus:border-brand focus:shadow-[0_0_0_3px_var(--ring)]"
          />
          <AnimatePresence>
            {pending && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute right-3">
                <LoaderCircle className="size-4 animate-spin text-ink-3" aria-label="Cargando" />
              </motion.span>
            )}
          </AnimatePresence>
        </label>
        <div className="flex gap-3">
          <div className="flex flex-1 gap-0.5 overflow-x-auto rounded-lg bg-surface-2 p-0.5" role="radiogroup" aria-label="Filtrar por estado">
            {STATUSES.map((s) => (
              <button
                key={s.v}
                role="radio"
                aria-checked={status === s.v}
                onClick={() => nav({ status: s.v })}
                className={cx("relative h-9 flex-1 rounded-md px-3 text-[13px] font-medium whitespace-nowrap transition-colors", status === s.v ? "text-ink" : "text-ink-3 hover:text-ink")}
              >
                {status === s.v && <motion.span layoutId="status-pill" className="absolute inset-0 rounded-md bg-surface shadow-1" transition={{ duration: 0.3, ease: EASE }} />}
                <span className="relative">{s.label}</span>
              </button>
            ))}
          </div>
          <label className="relative flex items-center">
            <span className="sr-only">Ordenar</span>
            <ArrowDownWideNarrow className="pointer-events-none absolute left-3 size-4 text-ink-3" aria-hidden />
            <select
              value={sort}
              onChange={(e) => nav({ sort: e.target.value })}
              className="h-10 appearance-none rounded-lg border border-line bg-surface pr-4 pl-9 text-[13px] font-medium outline-none hover:border-line-strong focus:border-brand"
            >
              <option value="recent">Más recientes</option>
              <option value="clicks">Más clics</option>
              <option value="oldest">Más antiguos</option>
            </select>
          </label>
        </div>
      </Item>

      {(facets.folders.length > 0 || facets.tags.length > 0) && (
        <Item className="flex min-w-0 flex-wrap items-center gap-2">
          {facets.folders.length > 0 && (
            <label className="relative flex items-center">
              <span className="sr-only">Filtrar por carpeta</span>
              <Folder className="pointer-events-none absolute left-3 size-4 text-ink-3" aria-hidden />
              <select
                value={folder === null ? "__all" : folder === "" ? "__none" : folder}
                onChange={(e) => nav({ folder: e.target.value === "__all" ? null : e.target.value === "__none" ? "" : e.target.value })}
                className={cx(
                  "h-9 max-w-[220px] appearance-none truncate rounded-lg border bg-surface pr-4 pl-9 text-[13px] font-medium outline-none hover:border-line-strong focus:border-brand",
                  folder !== null ? "border-brand text-ink" : "border-line text-ink-2",
                )}
              >
                <option value="__all">Todas las carpetas</option>
                {facets.folders.map((f) => (
                  <option key={f.name} value={f.name}>
                    {f.name} ({f.count})
                  </option>
                ))}
                <option value="__none">Sin carpeta</option>
              </select>
            </label>
          )}
          {facets.tags.length > 0 && (
            <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-0.5" role="group" aria-label="Filtrar por etiqueta">
              {facets.tags.map((t) => {
                const on = tag === t.name;
                return (
                  <button
                    key={t.name}
                    type="button"
                    aria-pressed={on}
                    onClick={() => nav({ tag: on ? null : t.name })}
                    className={cx(
                      "inline-flex h-9 shrink-0 items-center gap-1 rounded-full border px-3 text-[13px] font-medium transition-[background-color,border-color,color,transform] active:scale-[0.96]",
                      on ? "border-brand bg-brand-soft text-ink" : "border-line text-ink-2 hover:border-line-strong hover:text-ink",
                    )}
                  >
                    #{t.name}
                    {on ? <X className="size-3.5" aria-hidden /> : <span className="text-ink-3 tnum">{t.count}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </Item>
      )}

      <Item className={cx("overflow-hidden rounded-xl border border-line bg-surface transition-opacity duration-200", pending && "opacity-60")}>
        {items.length === 0 ? (
          <div className="grid place-items-center px-6 py-16 text-center">
            <SearchX className="size-8 text-ink-3" aria-hidden />
            <p className="mt-3 font-semibold">Nada por aquí</p>
            <p className="mt-1 text-sm text-ink-2">{q ? "Prueba con otra palabra o quita los filtros." : "No hay enlaces con estos filtros."}</p>
            <button onClick={() => nav({ q: null, status: "all", folder: null, tag: null })} className="mt-4 text-sm font-semibold text-brand">
              Quitar filtros
            </button>
          </div>
        ) : (
          <>
            <div className="hidden grid-cols-[minmax(0,1fr)_96px_88px_72px_136px] gap-4 border-b border-line px-5 py-2.5 text-[12px] text-ink-3 md:grid">
              <span>Enlace</span>
              <span>Estado</span>
              <span className="text-right">Clics</span>
              <span className="text-center">Activo</span>
              <span className="text-right">Acciones</span>
            </div>
            <ul>
              <AnimatePresence initial={false}>
                {items.map((l, i) => (
                  <motion.li
                    key={l.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE, delay: Math.min(i, 10) * 0.025 } }}
                    exit={{ opacity: 0, x: -24, transition: { duration: 0.22 } }}
                    className="group relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 border-b border-line px-4 py-3.5 transition-colors last:border-b-0 hover:bg-surface-2/50 md:grid-cols-[minmax(0,1fr)_96px_88px_72px_136px] md:px-5"
                  >
                    <div className="col-start-1 row-start-1 min-w-0 md:col-auto md:row-auto">
                      <Link href={`/links/${l.id}`} className="block truncate font-mono text-[14px] font-medium hover:text-brand">
                        <span className="text-ink-3">{host}/</span>
                        {l.slug}
                      </Link>
                      <p className="mt-0.5 truncate text-[13px] text-ink-3" title={l.url}>
                        {l.title ? <span className="text-ink-2">{l.title} · </span> : null}
                        {hostOf(l.url)} · {shortDate(l.createdAt)}
                      </p>
                      {(l.folder || l.tags.length > 0) && (
                        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-ink-3">
                          {l.folder && (
                            <button type="button" onClick={() => nav({ folder: l.folder })} className="inline-flex items-center gap-1 hover:text-ink">
                              <Folder className="size-3.5" aria-hidden />
                              {l.folder}
                            </button>
                          )}
                          {l.tags.map((t) => (
                            <button key={t} type="button" onClick={() => nav({ tag: t })} className="hover:text-ink">
                              #{t}
                            </button>
                          ))}
                        </p>
                      )}
                    </div>
                    <span className="col-start-1 row-start-2 justify-self-start md:col-auto md:row-auto">
                      <StatusBadge status={l.status} />
                    </span>
                    <span className="col-start-2 row-start-1 self-start text-right text-sm font-semibold tnum md:col-auto md:row-auto md:self-auto">
                      {fmt(l.clicks)}
                      <span className="font-normal text-ink-3 md:hidden"> clics</span>
                    </span>
                    <span className="hidden justify-center md:flex">
                      <Switch checked={l.isActive} onChange={(v) => toggle(l, v)} label={`${l.isActive ? "Pausar" : "Activar"} ${l.slug}`} disabled={readOnly || l.status === "expired"} />
                    </span>
                    <div className="col-span-2 col-start-1 row-start-2 flex items-center justify-self-end gap-0.5 md:col-span-1 md:col-auto md:row-auto md:justify-self-auto md:justify-end">
                      {!readOnly && (
                        <span className="mr-1.5 flex md:hidden">
                          <Switch checked={l.isActive} onChange={(v) => toggle(l, v)} label={`${l.isActive ? "Pausar" : "Activar"} ${l.slug}`} disabled={l.status === "expired"} />
                        </span>
                      )}
                      <CopyButton compact text={`${origin}/${l.slug}`} />
                      <IconBtn label={`Estadísticas de ${l.slug}`} href={`/links/${l.id}`}>
                        <BarChart3 className="size-4" />
                      </IconBtn>
                      {!readOnly && (
                        <>
                          <IconBtn label={`Editar ${l.slug}`} onClick={() => openEdit(l)}>
                            <Pencil className="size-4" />
                          </IconBtn>
                          <IconBtn label={`Borrar ${l.slug}`} onClick={() => remove(l)} danger>
                            <Trash2 className="size-4" />
                          </IconBtn>
                        </>
                      )}
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </>
        )}
      </Item>

      {data.pages > 1 && (
        <Item as="div">
          <nav className="flex items-center justify-between gap-3" aria-label="Paginación">
            <p className="text-sm text-ink-3">
              Página <span className="font-medium text-ink tnum">{data.page}</span> de <span className="tnum">{data.pages}</span>
            </p>
            <div className="flex gap-1">
              <PageBtn disabled={data.page <= 1} onClick={() => nav({ page: data.page - 1 })} label="Página anterior">
                <ChevronLeft className="size-4" />
              </PageBtn>
              {pageList(data.page, data.pages).map((p, i) =>
                p === "…" ? (
                  <span key={`e${i}`} className="grid size-9 place-items-center text-ink-3">
                    …
                  </span>
                ) : (
                  <PageBtn key={p} active={p === data.page} onClick={() => nav({ page: p })} label={`Página ${p}`}>
                    {p}
                  </PageBtn>
                ),
              )}
              <PageBtn disabled={data.page >= data.pages} onClick={() => nav({ page: data.page + 1 })} label="Página siguiente">
                <ChevronRight className="size-4" />
              </PageBtn>
            </div>
          </nav>
        </Item>
      )}
    </Stagger>
  );
}

function pageList(cur: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set([1, total, cur, cur - 1, cur + 1].filter((p) => p >= 1 && p <= total));
  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  sorted.forEach((p, i) => {
    if (i && p - sorted[i - 1] > 1) out.push("…");
    out.push(p);
  });
  return out;
}

function IconBtn({ children, label, onClick, href, danger }: { children: React.ReactNode; label: string; onClick?: () => void; href?: string; danger?: boolean }) {
  const cls = cx(
    "grid size-8 place-items-center rounded-lg text-ink-3 transition-[background-color,color,transform] active:scale-[0.92]",
    danger ? "hover:bg-danger-soft hover:text-danger" : "hover:bg-surface-2 hover:text-ink",
  );
  if (href)
    return (
      <Link href={href} className={cls} aria-label={label} title={label}>
        {children}
      </Link>
    );
  return (
    <button type="button" onClick={onClick} className={cls} aria-label={label} title={label}>
      {children}
    </button>
  );
}

function PageBtn({ children, onClick, disabled, active, label }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; active?: boolean; label: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={cx(
        "grid size-9 place-items-center rounded-lg text-sm font-medium tnum transition-[background-color,color,transform] active:scale-[0.94] disabled:opacity-40",
        active ? "bg-surface-2 text-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowUpRight, Bot, CalendarClock, Download, Filter, LoaderCircle, Monitor, Pencil, Smartphone, Tablet, Trash2, X } from "lucide-react";
import { BarList, ClicksChart, Columns, Donut } from "@/components/charts";
import { CopyButton, CountUp, EASE, Item, Stagger } from "@/components/motion";
import { QrStudio } from "@/components/qr";
import { useLinkModal } from "@/components/link-modal";
import { useToast } from "@/components/providers";
import { StatusBadge, Switch, cx } from "@/components/ui";
import { CountryCode } from "@/components/country";
import { countryName, dateTime, delta, fmt, shortDate, stripProtocol, timeAgo } from "@/lib/format";
import type { LinkDTO } from "@/lib/links";
import type { ClickItem, LinkStats, Range } from "@/lib/clicks";

const RANGE_LABEL: Record<Range, string> = { "7d": "7 días", "30d": "30 días", "90d": "90 días" };
const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const HOURS = Array.from({ length: 24 }, (_, h) => `${h}h`);
type FilterKey = "country" | "device" | "browser" | "referrer";
const FILTER_LABEL: Record<FilterKey, string> = { country: "País", device: "Dispositivo", browser: "Navegador", referrer: "Referido" };

const DEFINITIONS: [string, string][] = [
  ["Clics", "Cada vez que una persona abre el enlace. No cuentan los bots ni las vistas previas de WhatsApp, Slack o X."],
  ["Visitantes únicos", "Personas distintas en el periodo, estimadas con un código irreversible de su IP (la IP nunca se guarda)."],
  ["vs. anterior", "Compara con el periodo de la misma duración justo antes; la línea punteada de la gráfica es ese periodo."],
  ["Mejor día", "El día con más clics del periodo, en tu zona horaria."],
  ["Bots excluidos", "Accesos automáticos (buscadores, vistas previas, scripts). Se guardan aparte y no suman."],
  ["Horas y días", "A qué hora y qué día de la semana llegan los clics, en tu zona horaria. Útil para saber cuándo publicar."],
];

export function DetailView({
  link: initial,
  stats,
  clicks,
  origin,
  timezone,
}: {
  link: LinkDTO;
  stats: LinkStats;
  clicks: { items: ClickItem[]; hasMore: boolean };
  origin: string;
  timezone: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const { openEdit } = useLinkModal();
  const [link, setLink] = useState(initial);
  const [pending, start] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const shortUrl = `${origin}/${link.slug}`;
  const host = stripProtocol(origin);
  const d = delta(stats.total, stats.previous);
  const du = delta(stats.unique, stats.previousUnique);
  const filter = stats.filter as Partial<Record<FilterKey, string>>;
  const activeFilters = (Object.keys(FILTER_LABEL) as FilterKey[]).filter((k) => filter[k]);

  function go(patch: Partial<Record<FilterKey | "range", string | null>>) {
    const next = { range: stats.range, ...filter, ...patch } as Record<string, string | null | undefined>;
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) if (v && !(k === "range" && v === "30d")) qs.set(k, v);
    const s = qs.toString();
    start(() => router.replace(`${pathname}${s ? `?${s}` : ""}`, { scroll: false }));
  }
  const pick = (k: FilterKey) => (label: string) => go({ [k]: filter[k] === label ? null : label });

  const [seenLink, setSeenLink] = useState(initial);
  if (seenLink !== initial) {
    setSeenLink(initial);
    setLink(initial);
  }
  useEffect(() => {
    if (!confirmDelete) return;
    const t = setTimeout(() => setConfirmDelete(false), 3500);
    return () => clearTimeout(t);
  }, [confirmDelete]);

  async function toggle(active: boolean) {
    const prev = link;
    setLink({ ...link, isActive: active, status: link.status === "expired" ? "expired" : active ? "active" : "paused" });
    const res = await fetch(`/api/links/${link.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: active }),
    }).catch(() => null);
    if (!res?.ok) {
      const data = await res?.json().catch(() => null);
      setLink(prev);
      toast({ tone: "error", title: "No se pudo cambiar el estado", body: data?.error });
      return;
    }
    toast({ tone: "success", title: active ? "Enlace activado" : "Enlace pausado" });
  }

  async function destroy() {
    if (!confirmDelete) return setConfirmDelete(true);
    setDeleting(true);
    const res = await fetch(`/api/links/${link.id}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) {
      const data = await res?.json().catch(() => null);
      setDeleting(false);
      toast({ tone: "error", title: "No se pudo borrar el enlace", body: data?.error });
      return;
    }
    toast({ tone: "success", title: "Enlace borrado", body: `${host}/${link.slug} y sus clics se eliminaron.` });
    router.push("/links");
    router.refresh();
  }

  return (
    <Stagger className="grid gap-6">
      <Item>
        <Link href="/links" className="group inline-flex items-center gap-1.5 text-sm font-medium text-ink-2 transition-colors hover:text-ink">
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" aria-hidden /> Mis enlaces
        </Link>
      </Item>

      {/* Encabezado */}
      <Item as="header" className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={link.status} />
            {link.expiresAt && (
              <span className="inline-flex items-center gap-1 text-xs text-ink-3">
                <CalendarClock className="size-3.5" aria-hidden />
                {link.status === "expired" ? "Venció" : "Vence"} el {dateTime(link.expiresAt, timezone)}
              </span>
            )}
            {link.startsAt && (
              <span className="text-xs text-ink-3">
                {link.status === "scheduled" ? "Empieza" : "Empezó"} el {dateTime(link.startsAt, timezone)}
              </span>
            )}
            {link.protected && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-ink-2">Con contraseña</span>}
            {link.maxClicks && (
              <span className="text-xs text-ink-3 tnum">
                {fmt(link.clicks)} de {fmt(link.maxClicks)} clics permitidos
              </span>
            )}
            {link.notifyAt && <span className="text-xs text-ink-3 tnum">Aviso por correo a los {fmt(link.notifyAt)} clics</span>}
          </div>
          <h1 className="flex flex-wrap items-center gap-x-2 font-mono text-[clamp(1.25rem,2.6vw,1.75rem)] leading-tight font-medium tracking-tight">
            <span className="min-w-0 break-all">
              <span className="text-ink-3">{host}/</span>
              {link.slug}
            </span>
            <CopyButton compact text={shortUrl} className="size-9" />
          </h1>
          {link.title && <p className="mt-1 font-medium text-ink-2">{link.title}</p>}
          <a href={link.url} target="_blank" rel="noopener noreferrer" className="group mt-1.5 inline-flex max-w-full items-center gap-1 text-sm text-ink-3 hover:text-brand" title={link.url}>
            <span className="truncate">{stripProtocol(link.url)}</span>
            <ArrowUpRight className="size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
          </a>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="mr-1 inline-flex h-9 items-center gap-2.5 rounded-lg border border-line bg-surface px-3 text-sm font-medium">
            <Switch checked={link.isActive} onChange={toggle} label={link.isActive ? "Pausar enlace" : "Activar enlace"} disabled={link.status === "expired"} />
            {link.isActive ? "Activo" : "Pausado"}
          </label>
          <ActionBtn onClick={() => openEdit(link)} icon={<Pencil className="size-4" />}>
            Editar
          </ActionBtn>
          <a
            href={`/api/links/${link.id}/export`}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-sm font-semibold transition-[border-color,transform] hover:border-line-strong active:scale-[0.97]"
          >
            <Download className="size-4" aria-hidden /> CSV
          </a>
          <button
            onClick={destroy}
            disabled={deleting}
            className={cx(
              "relative inline-flex h-9 items-center gap-1.5 overflow-hidden rounded-lg border px-3 text-sm font-semibold transition-[background-color,border-color,color,transform] active:scale-[0.97]",
              confirmDelete ? "border-danger bg-danger text-brand-ink" : "border-line bg-surface text-danger hover:border-danger/50",
            )}
          >
            {deleting ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" aria-hidden />}
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span key={String(confirmDelete)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
                {confirmDelete ? "¿Borrar? Pulsa otra vez" : "Borrar"}
              </motion.span>
            </AnimatePresence>
          </button>
        </div>
      </Item>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="grid min-w-0 gap-6">
          {/* KPIs + rango */}
          <Item className="overflow-hidden rounded-xl border border-line bg-surface">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3 sm:px-6">
              <h2 className="text-base font-semibold">Rendimiento</h2>
              <div className="flex gap-0.5 rounded-lg bg-surface-2 p-0.5" role="radiogroup" aria-label="Periodo">
                {(Object.keys(RANGE_LABEL) as Range[]).map((r) => (
                  <button
                    key={r}
                    role="radio"
                    aria-checked={stats.range === r}
                    onClick={() => go({ range: r })}
                    className={cx("relative h-8 rounded-md px-3 text-[13px] font-medium transition-colors", stats.range === r ? "text-ink" : "text-ink-3 hover:text-ink")}
                  >
                    {stats.range === r && <motion.span layoutId="range-pill" className="absolute inset-0 rounded-md bg-surface" transition={{ duration: 0.3, ease: EASE }} />}
                    <span className="relative">{RANGE_LABEL[r]}</span>
                  </button>
                ))}
              </div>
            </div>
            {activeFilters.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 border-b border-line bg-brand-soft/40 px-5 py-2.5 sm:px-6">
                <Filter className="size-4 text-ink-3" aria-hidden />
                <span className="text-[13px] text-ink-2">Solo clics con</span>
                {activeFilters.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => go({ [k]: null })}
                    className="inline-flex h-7 items-center gap-1 rounded-full border border-brand bg-surface px-2.5 text-[13px] font-medium transition-transform active:scale-[0.96]"
                    aria-label={`Quitar filtro ${FILTER_LABEL[k]}: ${filter[k]}`}
                  >
                    <span className="text-ink-3">{FILTER_LABEL[k]}:</span> {k === "country" ? countryName(filter[k]!) : filter[k]}
                    <X className="size-3.5" aria-hidden />
                  </button>
                ))}
                <button type="button" onClick={() => go({ country: null, device: null, browser: null, referrer: null })} className="ml-auto text-[13px] font-semibold text-brand">
                  Quitar filtros
                </button>
              </div>
            )}
            <div className={cx("transition-opacity duration-200", pending && "opacity-50")}>
              <dl className="grid grid-cols-2 border-b border-line md:grid-cols-4">
                <Stat label="Clics" className="border-r border-b border-line md:border-b-0">
                  <CountUp value={stats.total} />
                  <span
                    className={cx(
                      "w-fit rounded-full px-1.5 py-px font-sans text-[11px] font-semibold tracking-normal",
                      d.dir === "up" ? "bg-success-soft text-success" : d.dir === "down" ? "bg-danger-soft text-danger" : "bg-surface-2 text-ink-3",
                    )}
                    title="Comparado con el periodo anterior"
                  >
                    {d.label} vs. anterior
                  </span>
                </Stat>
                <Stat label="Visitantes únicos" className="border-b border-line md:border-r md:border-b-0">
                  <CountUp value={stats.unique} />
                  <span
                    className={cx(
                      "w-fit rounded-full px-1.5 py-px font-sans text-[11px] font-semibold tracking-normal",
                      du.dir === "up" ? "bg-success-soft text-success" : du.dir === "down" ? "bg-danger-soft text-danger" : "bg-surface-2 text-ink-3",
                    )}
                    title="Comparado con el periodo anterior"
                  >
                    {du.label} vs. anterior
                  </span>
                </Stat>
                <Stat label="Mejor día" className="border-r border-line">
                  <span className="tnum">{fmt(stats.peak?.clicks ?? 0)}</span>
                  <Small>{stats.peak?.clicks ? shortDate(stats.peak.date) : "—"}</Small>
                </Stat>
                <Stat label="Bots excluidos">
                  <span className="inline-flex items-center gap-2 tnum">
                    <Bot className="size-5 text-ink-3" aria-hidden />
                    {fmt(stats.bots)}
                  </span>
                  <Small>no cuentan en clics</Small>
                </Stat>
              </dl>
              <div className="p-4 sm:p-6">
                <ClicksChart key={stats.range} data={stats.series} height={260} compare />
                <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-3">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-0.5 w-4 rounded bg-chart" aria-hidden /> Este periodo
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-4 border-t-[1.5px] border-dashed border-ink-3" aria-hidden /> Periodo anterior
                  </span>
                </p>
              </div>
              <details className="group border-t border-line px-5 py-3 sm:px-6">
                <summary className="cursor-pointer list-none text-[13px] font-semibold text-ink-2 transition-colors hover:text-ink [&::-webkit-details-marker]:hidden">
                  ¿Cómo contamos? <span className="font-normal text-ink-3 group-open:hidden">Ver definiciones</span>
                </summary>
                <dl className="mt-3 grid gap-3 pb-1 text-[13px] sm:grid-cols-2">
                  {DEFINITIONS.map(([k, v]) => (
                    <div key={k}>
                      <dt className="font-semibold text-ink">{k}</dt>
                      <dd className="mt-0.5 text-ink-2">{v}</dd>
                    </div>
                  ))}
                </dl>
              </details>
            </div>
          </Item>

          <div className={cx("grid gap-6 md:grid-cols-2 transition-opacity duration-200", pending && "opacity-50")}>
            <Panel title="Países" hint="Toca uno para filtrar" key={`c${stats.range}`}>
              <BarList data={stats.countries} kind="country" onSelect={pick("country")} selected={filter.country} />
            </Panel>
            <Panel title="Dispositivos" key={`d${stats.range}`}>
              <Donut data={stats.devices} label="Dispositivos" />
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                {stats.devices
                  .filter((x) => x.label !== "Otros")
                  .map((x) => (
                    <button
                      key={x.label}
                      type="button"
                      onClick={() => pick("device")(x.label)}
                      aria-pressed={filter.device === x.label}
                      className={cx(
                        "h-7 rounded-full border px-2.5 text-[12px] font-medium transition-[border-color,color,transform] active:scale-[0.96]",
                        filter.device === x.label ? "border-brand text-ink" : "border-line text-ink-2 hover:border-line-strong hover:text-ink",
                      )}
                    >
                      Solo {x.label.toLowerCase()}
                    </button>
                  ))}
              </div>
            </Panel>
            <Panel title="Referidos" hint="De dónde vino la visita" key={`r${stats.range}`}>
              <BarList data={stats.referrers} kind="domain" tone="violet" onSelect={pick("referrer")} selected={filter.referrer} />
            </Panel>
            <Panel title="Navegadores" key={`b${stats.range}`}>
              <BarList data={stats.browsers} tone="success" onSelect={pick("browser")} selected={filter.browser} />
            </Panel>
            <Panel title="Horas del día" hint="Tu zona horaria" key={`h${stats.range}`}>
              <Columns values={stats.hours} labels={HOURS} every={6} />
            </Panel>
            <Panel title="Días de la semana" key={`w${stats.range}`}>
              <Columns values={stats.weekdays} labels={WEEKDAYS} />
            </Panel>
          </div>

          <ClicksTable linkId={link.id} initial={clicks} timezone={timezone} />
        </div>

        {/* Columna lateral: QR + ficha */}
        <aside className="grid content-start gap-6">
          <Item className="rounded-xl border border-line bg-surface p-5">
            <h2 className="mb-4 text-base font-semibold">Código QR</h2>
            <QrStudio value={shortUrl} linkId={link.id} caption={`Apunta a ${host}/${link.slug}`} />
          </Item>
          <Item className="rounded-xl border border-line bg-surface p-5 text-sm">
            <h2 className="mb-3 text-base font-semibold">Ficha</h2>
            <dl className="grid gap-3">
              <Row k="Creado">{dateTime(link.createdAt, timezone)}</Row>
              <Row k="Última edición">{timeAgo(link.updatedAt)}</Row>
              <Row k="Clics de siempre">
                <span className="tnum">{fmt(link.clicks)}</span>
              </Row>
              <Row k="Redirección">
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-ink-2">302</span>
              </Row>
            </dl>
          </Item>
        </aside>
      </div>
    </Stagger>
  );
}

function ActionBtn({ children, icon, onClick }: { children: React.ReactNode; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-sm font-semibold transition-[border-color,transform] hover:border-line-strong active:scale-[0.97]">
      {icon}
      {children}
    </button>
  );
}

function Stat({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cx("min-w-0 p-4 sm:px-6 sm:py-5", className)}>
      <dt className="text-[13px] text-ink-3">{label}</dt>
      <dd className="mt-2 grid gap-1.5 text-[28px] leading-none font-semibold tracking-[-0.02em]">{children}</dd>
    </div>
  );
}

function Small({ children }: { children: React.ReactNode }) {
  return <span className="truncate font-sans text-xs font-normal tracking-normal text-ink-3 first-letter:uppercase">{children}</span>;
}

function Panel({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <Item as="section" className="min-w-0 rounded-xl border border-line bg-surface p-5">
      <div className="mb-4 flex items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold">{title}</h2>
        {hint && <span className="text-xs text-ink-3">{hint}</span>}
      </div>
      {children}
    </Item>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-ink-3">{k}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}

function DeviceIcon({ d }: { d: string | null }) {
  const cls = "size-4 text-ink-3";
  if (d === "Móvil") return <Smartphone className={cls} aria-hidden />;
  if (d === "Tablet") return <Tablet className={cls} aria-hidden />;
  return <Monitor className={cls} aria-hidden />;
}

function ClicksTable({ linkId, initial, timezone }: { linkId: string; initial: { items: ClickItem[]; hasMore: boolean }; timezone: string }) {
  const [items, setItems] = useState(initial.items);
  const [hasMore, setHasMore] = useState(initial.hasMore);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [seen, setSeen] = useState(initial);
  if (seen !== initial) {
    setSeen(initial);
    setItems(initial.items);
    setHasMore(initial.hasMore);
    setPage(1);
  }

  async function more() {
    setLoading(true);
    const res = await fetch(`/api/links/${linkId}/clicks?page=${page + 1}`).catch(() => null);
    if (res?.ok) {
      const data = await res.json();
      setItems((cur) => [...cur, ...data.items]);
      setHasMore(data.hasMore);
      setPage((p) => p + 1);
    }
    setLoading(false);
  }

  return (
    <Item as="section" className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
        <h2 className="text-base font-semibold">Últimos clics</h2>
        <span className="text-xs text-ink-3">Incluye bots, marcados aparte</span>
      </div>
      {items.length === 0 ? (
        <p className="px-6 py-12 text-center text-sm text-ink-3">Cuando alguien abra el enlace, cada visita aparecerá aquí.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[12px] text-ink-3">
                <th className="px-5 py-2.5 font-semibold sm:px-6">Cuándo</th>
                <th className="px-3 py-2.5 font-semibold">Ubicación</th>
                <th className="px-3 py-2.5 font-semibold">Dispositivo</th>
                <th className="px-3 py-2.5 font-semibold sm:pr-6">Referido</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c, i) => (
                <motion.tr
                  key={c.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: (i % 10) * 0.025 }}
                  className={cx("border-b border-line transition-colors last:border-b-0 hover:bg-surface-2/50", c.isBot && "text-ink-3")}
                >
                  <td className="px-5 py-3 whitespace-nowrap sm:px-6">
                    <span className="font-medium text-ink" suppressHydrationWarning>
                      {timeAgo(c.clickedAt)}
                    </span>
                    <span className="block text-xs text-ink-3 tnum">{dateTime(c.clickedAt, timezone)}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center gap-2">
                      <CountryCode code={c.country} />
                      <span>
                        {c.city ?? countryName(c.country)}
                        {c.city && <span className="text-ink-3">, {c.country}</span>}
                      </span>
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center gap-2">
                      <DeviceIcon d={c.device} />
                      <span>
                        {c.os} · {c.browser}
                      </span>
                      {c.isBot && <span className="rounded-full bg-warn-soft px-1.5 py-px text-[11px] font-semibold text-warn">Bot</span>}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-mono text-[13px] text-ink-2 sm:pr-6">{c.referrer}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {hasMore && (
        <div className="border-t border-line p-3 text-center">
          <button onClick={more} disabled={loading} className="inline-flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-brand transition-colors hover:bg-brand-soft">
            {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden />} Cargar más clics
          </button>
        </div>
      )}
    </Item>
  );
}


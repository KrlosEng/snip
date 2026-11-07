"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, BarChart3, Link2, Plus, Scissors } from "lucide-react";
import { ClicksChart } from "@/components/charts";
import { CopyButton, CountUp, EASE, Item, Stagger } from "@/components/motion";
import { useLinkModal } from "@/components/link-modal";
import { StatusBadge, cx } from "@/components/ui";
import { CountryCode } from "@/components/country";
import { countryName, delta, fmt, hostOf, pct, timeAgo } from "@/lib/format";
import type { DashboardStats } from "@/lib/clicks";
import type { LinkDTO } from "@/lib/links";

export function DashboardView({ name, stats, links, origin }: { name: string; stats: DashboardStats; links: LinkDTO[]; origin: string }) {
  const host = origin.replace(/^https?:\/\//, "");
  const { openCreate } = useLinkModal();
  const first = name.split(" ")[0];

  if (stats.links === 0) return <EmptyDashboard first={first} host={host} onCreate={openCreate} />;

  const d = delta(stats.today, stats.yesterday);

  return (
    <Stagger className="grid gap-6">
      <Item as="header" className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] tracking-[0.14em] text-ink-3 uppercase">
            <Today /> · últimos 30 días
          </p>
          <h1 className="mt-2 text-[2.2rem] leading-none font-bold tracking-[-0.045em] sm:text-[2.8rem]">Hola, {first}.</h1>
        </div>
      </Item>

      <Item>
        <dl className="receipt grid grid-cols-2 bg-surface py-2 lg:grid-cols-4">
          <Kpi label="Enlaces" className="border-r border-b border-dashed border-line-strong lg:border-b-0">
            <CountUp value={stats.links} />
            <Sub>{fmt(stats.active)} activos</Sub>
          </Kpi>
          <Kpi label="Clics totales" className="border-b border-dashed border-line-strong lg:border-r lg:border-b-0">
            <CountUp value={stats.total} />
            <Sub>{fmt(stats.last30)} en 30 días</Sub>
          </Kpi>
          <Kpi label="Clics de hoy" className="border-r border-dashed border-line-strong">
            <CountUp value={stats.today} className="text-brand" />
            <Sub>
              <span
                className={cx(
                  "rounded-full px-1.5 py-px text-[11px] font-semibold",
                  d.dir === "up" ? "bg-success-soft text-success" : d.dir === "down" ? "bg-danger-soft text-danger" : "bg-surface-2 text-ink-3",
                )}
              >
                {d.label}
              </span>{" "}
              vs. ayer
            </Sub>
          </Kpi>
          <Kpi label="País principal">
            {stats.topCountry ? (
              <>
                <span className="inline-flex items-center gap-2">
                  <CountryCode code={stats.topCountry.code} className="h-[22px] w-[30px] text-[11px]" />
                  <span className="truncate">{countryName(stats.topCountry.code)}</span>
                </span>
                <Sub>{pct(stats.topCountry.clicks, stats.total)} de los clics</Sub>
              </>
            ) : (
              <>
                <span className="text-ink-3">—</span>
                <Sub>Aún sin datos de país</Sub>
              </>
            )}
          </Kpi>
        </dl>
      </Item>

      <Item className="rounded-2xl border border-line bg-surface p-5 shadow-1 sm:p-6">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="font-mono text-[11px] font-normal tracking-[0.12em] text-ink-3 uppercase">Clics por día</h2>
            <p className="mt-2 font-display text-[1.6rem] leading-none font-bold tracking-tight tnum">
              {fmt(stats.last30)} <span className="font-sans text-sm font-normal tracking-normal text-ink-3">en 30 días</span>
            </p>
          </div>
        </div>
        <ClicksChart data={stats.series} height={280} />
      </Item>

      <Item className="overflow-hidden rounded-2xl border border-line bg-surface shadow-1">
        <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-6">
          <h2 className="font-mono text-[11px] font-normal tracking-[0.12em] text-ink-3 uppercase">Últimos enlaces</h2>
          <Link href="/links" className="group inline-flex items-center gap-1 text-sm font-semibold text-brand">
            Ver todos <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </div>
        <ul>
          {links.map((l, i) => (
            <motion.li
              key={l.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, ease: EASE, delay: 0.25 + i * 0.04 }}
              className="group relative flex items-center gap-4 border-b border-line px-5 py-3.5 transition-colors last:border-b-0 hover:bg-surface-2/60 sm:px-6"
            >
              <span className="hidden w-8 font-mono text-xs text-ink-3 tnum sm:block">{String(i + 1).padStart(2, "0")}</span>
              <div className="min-w-0 flex-1">
                <Link href={`/links/${l.id}`} className="block truncate font-mono text-sm font-medium after:absolute after:inset-0">
                  <span className="text-ink-3">{host}/</span>
                  <span className="text-ink">{l.slug}</span>
                </Link>
                <p className="mt-0.5 truncate text-[13px] text-ink-3">
                  {l.title ?? hostOf(l.url)} · {timeAgo(l.createdAt)}
                </p>
              </div>
              <span className="hidden sm:block">
                <StatusBadge status={l.status} />
              </span>
              <span className="w-16 text-right text-sm font-semibold tnum">{fmt(l.clicks)}</span>
              <span className="relative z-10 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                <CopyButton compact text={`${origin}/${l.slug}`} />
              </span>
            </motion.li>
          ))}
        </ul>
      </Item>
    </Stagger>
  );
}

function Kpi({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cx("min-w-0 px-4 py-5 sm:px-6", className)}>
      <dt className="font-mono text-[11px] tracking-[0.12em] text-ink-3 uppercase">{label}</dt>
      <dd className="mt-3 grid gap-2 font-display text-[2.1rem] leading-none font-bold tracking-[-0.04em] sm:text-[2.4rem]">{children}</dd>
    </div>
  );
}

function Today() {
  const [label] = useState(() => new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "short" }).format(new Date()));
  return <span suppressHydrationWarning>{label}</span>;
}

function Sub({ children }: { children: React.ReactNode }) {
  return <span className="font-sans text-[13px] font-normal tracking-normal text-ink-3">{children}</span>;
}

/* --------------------------- Estado vacío --------------------------- */

function EmptyDashboard({ first, host, onCreate }: { first: string; host: string; onCreate: () => void }) {
  const steps = [
    { icon: Link2, title: "Pega el enlace largo", body: "El de tu tienda, formulario, menú o publicación, con todos sus parámetros.", sample: "https://tutienda.com/oferta?utm_…" },
    { icon: Scissors, title: "Ponle un alias", body: "Uno fácil de dictar y recordar. O deja que generemos uno.", sample: `${host}/mi-tienda` },
    { icon: BarChart3, title: "Compártelo y mira los clics", body: "País, dispositivo, navegador y red social de cada visita.", sample: "MX 64% · móvil 71%" },
  ];
  return (
    <Stagger className="grid gap-8">
      <Item className="relative overflow-hidden rounded-3xl border border-line bg-surface px-6 py-14 text-center shadow-1 sm:px-10 sm:py-20">
        <div
          aria-hidden
          className="absolute inset-0 opacity-60 [background-image:radial-gradient(var(--line-strong)_1px,transparent_1px)] [background-size:20px_20px] [mask-image:radial-gradient(closest-side,black,transparent)]"
        />
        <div className="relative mx-auto mb-8 grid size-28 place-items-center" aria-hidden>
          <motion.span
            className="absolute inset-0 rounded-full border border-dashed border-brand/40"
            animate={{ rotate: 360 }}
            transition={{ duration: 28, ease: "linear", repeat: Infinity }}
          />
          <motion.span
            className="absolute inset-4 rounded-full border border-dashed border-brand/25"
            animate={{ rotate: -360 }}
            transition={{ duration: 22, ease: "linear", repeat: Infinity }}
          />
          <motion.span
            initial={{ scale: 0.6, opacity: 0, rotate: -20 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.2 }}
            className="grid size-14 place-items-center rounded-2xl bg-brand text-brand-ink shadow-2"
          >
            <Scissors className="size-6" />
          </motion.span>
        </div>
        <h1 className="relative text-[clamp(1.6rem,4vw,2.25rem)] font-bold">{first}, crea tu primer enlace</h1>
        <p className="relative mx-auto mt-3 max-w-[48ch] text-ink-2">
          En cuanto alguien haga clic, aquí verás cuántas visitas llegan, desde dónde y en qué dispositivo.
        </p>
        <button
          onClick={onCreate}
          className="relative mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-brand px-6 text-[15px] font-semibold text-brand-ink shadow-2 transition-[background-color,transform] hover:bg-brand-strong active:scale-[0.97]"
        >
          <Plus className="size-4" aria-hidden /> Crear mi primer enlace
        </button>
        <p className="relative mt-3 text-xs text-ink-3">
          Atajo: pulsa <kbd className="font-mono">C</kbd> en cualquier pantalla
        </p>
      </Item>

      <Item>
        <h2 className="mb-4 text-sm font-semibold text-ink-2">Cómo funciona</h2>
        <ol className="grid gap-4 md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title} className="flex flex-col rounded-2xl border border-line bg-surface p-5">
              <div className="flex items-center justify-between">
                <span className="grid size-9 place-items-center rounded-lg bg-brand-soft text-brand">
                  <s.icon className="size-[18px]" aria-hidden />
                </span>
                <span className="font-mono text-xs text-ink-3">Paso {i + 1}</span>
              </div>
              <h3 className="mt-4 text-base font-semibold">{s.title}</h3>
              <p className="mt-1 flex-1 text-sm text-ink-2">{s.body}</p>
              <p className="mt-4 truncate rounded-lg bg-surface-2 px-3 py-2 font-mono text-xs text-ink-2">{s.sample}</p>
            </li>
          ))}
        </ol>
      </Item>

    </Stagger>
  );
}

"use client";

import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { motion } from "motion/react";
import { EASE } from "./motion";
import { CountryCode } from "./country";
import { countryName, fmt, longDate, pct, shortDate } from "@/lib/format";
import { cx } from "./ui";

type Point = { date: string; clicks: number };

export function ClicksChart({ data, height = 260 }: { data: Point[]; height?: number }) {
  const every = data.length > 45 ? 14 : data.length > 20 ? 6 : 1;
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 4, left: -6, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 4" />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            interval={every - 1}
            tick={{ fill: "var(--ink-3)", fontSize: 11 }}
            tickFormatter={(d: string) => shortDate(d)}
            minTickGap={12}
          />
          <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={40} tick={{ fill: "var(--ink-3)", fontSize: 11 }} />
          <Tooltip
            cursor={{ stroke: "var(--line-strong)", strokeDasharray: "3 3" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as Point;
              return (
                <div className="rounded-lg border border-line bg-surface px-3 py-2 shadow-2">
                  <p className="text-xs text-ink-3 first-letter:uppercase">{longDate(p.date)}</p>
                  <p className="mt-0.5 font-display text-lg font-semibold tnum">
                    {fmt(p.clicks)} <span className="font-sans text-xs font-normal text-ink-3">clics</span>
                  </p>
                </div>
              );
            }}
          />
          <Area
            type="linear"
            dataKey="clicks"
            stroke="var(--chart)"
            strokeWidth={2}
            fill="var(--chart)"
            fillOpacity={0.1}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)", fill: "var(--chart)" }}
            animationDuration={900}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

const DONUT = ["var(--chart)", "var(--chart-2)", "var(--chart-3)", "var(--ink-3)", "var(--line-strong)"];

export function Donut({ data, label }: { data: { label: string; value: number }[]; label: string }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const top = data[0];
  if (!total) return <Empty />;
  return (
    <div className="flex items-center gap-6">
      <div className="relative size-[132px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="label" innerRadius={56} outerRadius={64} paddingAngle={1.5} stroke="none" animationDuration={800} startAngle={90} endAngle={-270}>
              {data.map((_, i) => (
                <Cell key={i} fill={DONUT[i % DONUT.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="font-display text-xl font-bold tnum">{pct(top.value, total)}</p>
            <p className="text-[11px] text-ink-3">{top.label}</p>
          </div>
        </div>
      </div>
      <ul className="grid flex-1 gap-2.5" aria-label={label}>
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center gap-2.5 text-sm">
            <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: DONUT[i % DONUT.length] }} />
            <span className="min-w-0 flex-1 truncate text-ink-2">{d.label}</span>
            <span className="font-medium tnum">{pct(d.value, total)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Lista con barras horizontales que crecen escalonadas (solo transform). */
export function BarList({
  data,
  kind = "plain",
  tone = "brand",
}: {
  data: { label: string; value: number }[];
  kind?: "plain" | "country" | "domain";
  tone?: "brand" | "violet" | "success";
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const max = Math.max(1, ...data.map((d) => d.value));
  if (!total) return <Empty />;
  const bar = tone === "violet" ? "bg-chart-2/40" : tone === "success" ? "bg-chart-3/50" : "bg-chart/15";
  return (
    <ul className="grid gap-1.5">
      {data.map((d, i) => (
        <li key={d.label} className="relative flex h-9 items-center gap-2.5 overflow-hidden rounded-lg px-2.5 text-sm">
          <motion.span
            aria-hidden
            className={cx("absolute inset-y-0 left-0 w-full origin-left rounded-lg", bar)}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: d.value / max }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.1 + i * 0.05 }}
          />
          {kind === "country" && <CountryCode code={d.label} className="relative" />}
          <span className={cx("relative min-w-0 flex-1 truncate", kind === "domain" && "font-mono text-[13px]")}>
            {kind === "country" ? countryName(d.label) : d.label}
          </span>
          <span className="relative text-ink-3 tnum">{fmt(d.value)}</span>
          <span className="relative w-11 text-right font-medium tnum">{pct(d.value, total)}</span>
        </li>
      ))}
    </ul>
  );
}

function Empty() {
  return <p className="py-6 text-center text-sm text-ink-3">Todavía no hay clics en este periodo.</p>;
}

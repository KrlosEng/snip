import Link from "next/link";
import { motion } from "motion/react";
import { Check, Minus } from "lucide-react";
import { cx } from "./ui";
import { EASE } from "./motion";

export type PlanSummary = {
  id: "free" | "pro";
  name: string;
  until: number | null;
  limits: { linksPerMonth: number; teams: number; membersPerTeam: number; apiKeys: number; csvImport: boolean; passwordLinks: boolean; statsDays: number };
  usage: { linksThisMonth: number; teams: number; apiKeys: number };
};

function Meter({ label, used, max }: { label: string; used: number; max: number }) {
  const ratio = Math.min(1, used / Math.max(1, max));
  const full = used >= max;
  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-ink-2">{label}</span>
        <span className={cx("tnum font-medium", full && "text-danger")}>
          {used.toLocaleString("es-MX")} de {max.toLocaleString("es-MX")}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-label={label} aria-valuenow={used} aria-valuemin={0} aria-valuemax={max}>
        <motion.div
          className={cx("h-full origin-left rounded-full", full ? "bg-danger" : ratio > 0.8 ? "bg-warn" : "bg-brand")}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: ratio }}
          transition={{ duration: 0.7, ease: EASE }}
        />
      </div>
    </div>
  );
}

function Perk({ on, children }: { on: boolean; children: React.ReactNode }) {
  return (
    <li className={cx("flex items-center gap-2 text-sm", on ? "text-ink" : "text-ink-3")}>
      {on ? <Check className="size-4 text-success" aria-hidden /> : <Minus className="size-4" aria-hidden />}
      {children}
      <span className="sr-only">{on ? "(incluido)" : "(solo Pro)"}</span>
    </li>
  );
}

/** Plan actual y cuánto se ha usado este mes. */
export function PlanCard({ plan }: { plan: PlanSummary }) {
  const nextMonth = new Date();
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1, 1);
  return (
    <div className="grid gap-6 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[13px] text-ink-3">Tu plan</p>
          <p className="text-xl font-semibold">
            {plan.name}
            {plan.id === "pro" && plan.until && (
              <span className="ml-2 text-sm font-normal text-ink-3">hasta el {new Date(plan.until).toLocaleDateString("es-MX", { dateStyle: "long" })}</span>
            )}
          </p>
        </div>
        <Link href="/planes" className="text-sm font-semibold text-brand underline-offset-4 hover:underline">
          {plan.id === "free" ? "Ver qué incluye Pro" : "Comparar planes"}
        </Link>
      </div>
      <div className="grid gap-4">
        <Meter label="Enlaces nuevos este mes" used={plan.usage.linksThisMonth} max={plan.limits.linksPerMonth} />
        <Meter label="Equipos propios" used={plan.usage.teams} max={plan.limits.teams} />
        <Meter label="Claves de API activas" used={plan.usage.apiKeys} max={plan.limits.apiKeys} />
        <p className="text-xs text-ink-3">El contador de enlaces se reinicia el {nextMonth.toLocaleDateString("es-MX", { day: "numeric", month: "long", timeZone: "UTC" })}.</p>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        <Perk on={plan.limits.csvImport}>Importar enlaces desde CSV</Perk>
        <Perk on={plan.limits.passwordLinks}>Enlaces con contraseña</Perk>
        <Perk on={plan.limits.statsDays >= 90}>Estadísticas de 90 días</Perk>
        <Perk on>Hasta {plan.limits.membersPerTeam} personas por equipo</Perk>
      </ul>
    </div>
  );
}

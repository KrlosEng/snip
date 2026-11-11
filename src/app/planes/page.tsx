import type { Metadata } from "next";
import Link from "next/link";
import { Check, Minus } from "lucide-react";
import { Logo } from "@/components/ui";
import { PLANS, type Limits } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Planes",
  description: "Snip es gratis para empezar. El plan Pro suma más enlaces, equipos más grandes, enlaces con contraseña e importación desde CSV.",
};

const n = (v: number) => v.toLocaleString("es-MX");

type Row = { label: string; value: (l: Limits) => string | boolean };

const ROWS: Row[] = [
  { label: "Enlaces nuevos al mes", value: (l) => n(l.linksPerMonth) },
  { label: "Equipos propios", value: (l) => n(l.teams) },
  { label: "Personas por equipo", value: (l) => n(l.membersPerTeam) },
  { label: "Claves de API", value: (l) => n(l.apiKeys) },
  { label: "Estadísticas", value: (l) => `Últimos ${l.statsDays} días` },
  { label: "Importar enlaces desde CSV", value: (l) => l.csvImport },
  { label: "Enlaces con contraseña", value: (l) => l.passwordLinks },
];

const BOTH = [
  "Clics, visitantes únicos y bots separados",
  "Carpetas, etiquetas y filtros",
  "Generador de parámetros UTM",
  "QR con tus colores, en PNG y SVG",
  "Exportar enlaces y clics a CSV",
  "Activación programada, límite de clics y aviso por correo",
  "API pública",
];

function Cell({ v }: { v: string | boolean }) {
  if (v === true) return <Check className="mx-auto size-5 text-success" aria-label="Incluido" />;
  if (v === false) return <Minus className="mx-auto size-5 text-ink-3" aria-label="No incluido" />;
  return <span className="tnum">{v}</span>;
}

export default function PlansPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:py-12">
      <Logo />
      <h1 className="mt-12 text-[2.25rem] leading-tight font-bold">Planes</h1>
      <p className="mt-3 max-w-[60ch] text-lg text-ink-2">
        Empieza gratis, sin tarjeta. Si tu equipo o tu negocio necesita más, el plan Pro sube los límites.
      </p>

      <div className="mt-10 overflow-x-auto rounded-xl border border-line">
        <table className="w-full table-fixed text-[13px] sm:text-sm [&_td]:px-2 [&_th]:px-2 sm:[&_td]:px-4 sm:[&_th]:px-4">
          <colgroup>
            <col />
            <col className="w-[30%] sm:w-[26%]" />
            <col className="w-[30%] sm:w-[26%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className="py-3 text-left font-medium text-ink-3">
                <span className="sr-only">Característica</span>
              </th>
              <th scope="col" className="py-3 text-center">
                <span className="block text-base font-semibold">{PLANS.free.name}</span>
                <span className="text-xs font-normal text-ink-3">$0</span>
              </th>
              <th scope="col" className="bg-brand-soft/40 py-3 text-center">
                <span className="block text-base font-semibold">{PLANS.pro.name}</span>
                <span className="text-xs font-normal text-ink-3">Por invitación</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.label} className="border-b border-line last:border-b-0">
                <th scope="row" className="py-3 text-left font-normal text-ink-2">
                  {r.label}
                </th>
                <td className="py-3 text-center">
                  <Cell v={r.value(PLANS.free.limits)} />
                </td>
                <td className="bg-brand-soft/40 py-3 text-center font-medium">
                  <Cell v={r.value(PLANS.pro.limits)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="mt-10 grid gap-3 border-t border-line pt-8">
        <h2 className="text-xl font-semibold">En los dos planes</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {BOTH.map((b) => (
            <li key={b} className="flex items-start gap-2 text-ink-2">
              <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
              {b}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10 grid gap-3 border-t border-line pt-8">
        <h2 className="text-xl font-semibold">¿Cómo consigo Pro?</h2>
        <p className="max-w-[62ch] text-ink-2">
          Todavía no cobramos en línea: por ahora activamos Pro a mano. Escríbenos desde el repositorio del proyecto y te lo activamos. Si bajas de plan, no se borra nada: solo no podrás crear más allá del límite.
        </p>
        <a href="https://github.com/KrlosEng/snip/issues" className="w-fit text-sm font-semibold text-brand underline-offset-4 hover:underline">
          Pedir el plan Pro
        </a>
      </section>

      <p className="mt-12 flex flex-wrap gap-6 text-sm">
        <Link href="/" className="font-semibold text-brand">
          Volver al inicio
        </Link>
        <Link href="/register" className="font-semibold text-brand">
          Crear cuenta gratis
        </Link>
      </p>
    </div>
  );
}

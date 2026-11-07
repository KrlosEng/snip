import { QrPreview } from "../qr";

/**
 * Piezas reales de la interfaz de Snip, a tamaño de uso, que llenan los
 * mosaicos del tablero. Los datos de muestra son coherentes: los totales
 * salen de las filas. Cada raíz lleva data-ui (conserva sus propias líneas).
 */

export const HOST = "snip-acortador.vercel.app";

const DAYS = [41, 38, 52, 47, 44, 61, 58, 49, 55, 63, 70, 66, 59, 72];
const TOTAL = DAYS.reduce((a, b) => a + b, 0);
const COUNTRIES: [string, string, number][] = [
  ["MX", "México", 289],
  ["US", "Estados Unidos", 171],
  ["ES", "España", 92],
  ["CO", "Colombia", 81],
];

const ROWS = [
  ["6 nov 18:42", "MX", "Guadalajara", "Móvil", "instagram.com"],
  ["6 nov 18:37", "MX", "Monterrey", "Móvil", "whatsapp.com"],
  ["6 nov 18:21", "CO", "Medellín", "Escritorio", "Directo"],
  ["6 nov 17:58", "US", "Austin", "Móvil", "t.co"],
  ["6 nov 17:44", "ES", "Madrid", "Escritorio", "google.com"],
  ["6 nov 17:30", "MX", "Puebla", "Tablet", "facebook.com"],
  ["6 nov 17:12", "AR", "Córdoba", "Móvil", "instagram.com"],
];

const RULE = "border-t border-[#dfe3df]"; // taste-skill-ignore: líneas propias de la tabla del producto

const paper = "rounded-[8px] bg-[#f4f5f2] text-[#1c1c1c]";

export function TileTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-[22px] leading-tight font-bold tracking-[-0.02em] ${className}`}>{children}</p>;
}

export function ClicksFragment() {
  const max = Math.max(...DAYS);
  return (
    <div data-ui className={`${paper} mt-4 p-5 lg:-mr-10 lg:-mb-24`}>
      <p className="text-[15px] text-[#5b666e]">menu-tacos · últimos 14 días, sin bots</p>
      <p className="mt-1 text-[40px] leading-none font-bold tracking-[-0.03em] tnum">{TOTAL.toLocaleString("es-MX")} clics</p>
      <div className="mt-5 flex h-24 items-end gap-1.5" role="img" aria-label="Clics por día, con el último día en verde oscuro">
        {DAYS.map((d, i) => (
          <span key={i} className={`flex-1 rounded-t-[3px] ${i === DAYS.length - 1 ? "bg-[#2c3620]" : "bg-[#b7c8be]"}`} style={{ height: `${(d / max) * 100}%` }} />
        ))}
      </div>
      <div className="mt-5">
        {COUNTRIES.map(([cc, name, n]) => (
          <div key={cc} className={`flex items-center gap-3 ${RULE} py-2.5 text-[15px]`}>
            <span className="w-7 text-[13px] text-[#5b666e]">{cc}</span>
            <span className="flex-1">{name}</span>
            <span className="tnum">{n}</span>
            <span className="w-12 text-right text-[#5b666e] tnum">{Math.round((n / TOTAL) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function QrFragment() {
  return (
    <div data-ui className="mt-4">
      <QrPreview value={`https://${HOST}/menu-tacos`} className="w-[200px] max-w-full" />
      <p className="mt-3 text-[15px] leading-snug">PNG de 1024 px o SVG para imprenta.</p>
    </div>
  );
}

export function DevicesFragment() {
  const parts: [string, number, string][] = [
    ["Móvil", 61, "#2c3620"],
    ["Escritorio", 33, "#f4f5f2"],
    ["Tablet", 6, "#d6c4b8"],
  ];
  const r = 44;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div data-ui className="mt-5">
      <svg viewBox="0 0 120 120" className="size-[148px]" role="img" aria-label="Móvil 61%, escritorio 33%, tablet 6%">
        <g transform="rotate(-90 60 60)" fill="none" strokeWidth="16">
          {parts.map(([name, pct, color]) => {
            const len = (pct / 100) * c;
            const el = <circle key={name} cx="60" cy="60" r={r} stroke={color} strokeDasharray={`${Math.max(len - 2, 0)} ${c}`} strokeDashoffset={-offset} />;
            offset += len;
            return el;
          })}
        </g>
      </svg>
      <ul className="mt-4 grid gap-1.5 text-[15px]">
        {parts.map(([name, pct, color]) => (
          <li key={name} className="flex items-center gap-2.5">
            <span className="size-3 rounded-[3px]" style={{ background: color }} />
            <span className="flex-1">{name}</span>
            <span className="tnum">{pct}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ChannelsFragment() {
  const rows: [string, number][] = [
    ["instagram.com", 38],
    ["whatsapp.com", 24],
    ["Directo", 20],
  ];
  return (
    <ul data-ui className="mt-4 grid gap-2">
      {rows.map(([name, pct]) => (
        <li key={name} className="relative flex h-8 items-center overflow-hidden rounded-[6px] px-3 text-[15px]">
          <span className="absolute inset-y-0 left-0 bg-[#b7c8be]" style={{ width: `${pct * 2.2}%` }} />
          <span className="relative flex-1">{name}</span>
          <span className="relative tnum">{pct}%</span>
        </li>
      ))}
    </ul>
  );
}

export function CsvFragment() {
  return (
    <div data-ui className={`${paper} mt-4 p-5 lg:-mr-10 lg:-mb-24`}>
      <p className="text-[15px] text-[#5b666e]">snip-menu-tacos-clics.csv</p>
      <table className="mt-3 w-full text-left text-[15px]">
        <thead>
          <tr className="text-[13px] text-[#5b666e]">
            <th className="pb-2 font-normal">Fecha</th>
            <th className="pb-2 font-normal">País</th>
            <th className="pb-2 font-normal">Ciudad</th>
            <th className="hidden pb-2 font-normal sm:table-cell">Dispositivo</th>
            <th className="hidden pb-2 font-normal md:table-cell">Referido</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((r) => (
            <tr key={r[0] + r[2]} className={RULE}>
              <td className="py-2.5 pr-2 tnum">{r[0]}</td>
              <td className="py-2.5 pr-2">{r[1]}</td>
              <td className="py-2.5 pr-2">{r[2]}</td>
              <td className="hidden py-2.5 pr-2 sm:table-cell">{r[3]}</td>
              <td className="hidden py-2.5 md:table-cell">{r[4]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AliasFragment() {
  return (
    <div data-ui className={`${paper} mt-3 flex items-center overflow-hidden text-[16px]`}>
      <span className="hidden bg-[#e3e6e2] px-3 py-3 text-[#5b666e] xl:inline">…vercel.app/</span>
      <span className="px-3 py-3 font-medium">mi-tienda</span>
      <span className="mr-2 ml-auto rounded-full bg-[#dfe9e1] px-2.5 py-0.5 text-[13px] text-[#2f5a3c]">libre</span>
    </div>
  );
}

export function GoneFragment() {
  return (
    <div data-ui className="mt-3">
      <span className="inline-block rounded-full bg-[#f3dfd9] px-2.5 py-0.5 text-[13px] text-[#8a3a26]">410 · enlace vencido</span>
      <p className="mt-2 text-[15px] leading-snug text-[#38424a]">Venció el 27 de septiembre de 2026.</p>
    </div>
  );
}

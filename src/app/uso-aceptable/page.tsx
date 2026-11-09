import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/ui";

export const metadata: Metadata = {
  title: "Uso aceptable",
  description: "Qué se puede y qué no se puede acortar con Snip, y qué pasa si alguien abusa del servicio.",
};

const ITEMS = [
  [
    "Para qué es Snip",
    "Para compartir enlaces cortos y saber si funcionaron: campañas, redes sociales, tareas de clase, menús, currículums. Puedes usarlo gratis, con o sin cuenta.",
  ],
  [
    "Qué no se permite",
    "Enlaces a phishing o páginas que piden contraseñas o datos bancarios haciéndose pasar por otra marca; malware o descargas engañosas; estafas y fraudes; contenido sexual con menores; contenido que incite a la violencia o al odio; y cualquier destino ilegal en México o en el país de quien lo visita.",
  ],
  [
    "Tampoco se permite",
    "Usar Snip para enviar spam masivo, ocultar el destino real para engañar, saltarse los límites de uso con muchas cuentas o automatizar la creación de enlaces sin permiso.",
  ],
  [
    "Cómo lo revisamos",
    "Cada destino se compara con listas de sitios peligrosos antes de crear el enlace, y hay límites de uso por persona. Los enlaces sin cuenta vencen a los 7 días.",
  ],
  [
    "Qué pasa si se rompe una regla",
    "Podemos desactivar el enlace sin aviso previo y, si se repite, cerrar la cuenta. Cuando la ley lo exija, colaboramos con las autoridades.",
  ],
  [
    "Reportar un enlace",
    "Si encuentras un enlace de Snip que lleva a algo de esta lista, abre un reporte en GitHub con el enlace corto y una breve descripción. Lo revisamos lo antes posible.",
  ],
];

export default function AcceptableUsePage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-8 sm:py-12">
      <Logo />
      <h1 className="mt-12 text-[2.25rem] leading-tight font-bold">Uso aceptable</h1>
      <p className="mt-3 text-lg text-ink-2">Un enlace corto debe llevar a donde dice. Estas son las reglas para que Snip siga siendo confiable para todos.</p>
      <dl className="mt-10 grid gap-8">
        {ITEMS.map(([k, v]) => (
          <div key={k} className="grid gap-2 border-t border-line pt-6">
            <dt className="font-display text-lg font-semibold">{k}</dt>
            <dd className="max-w-[62ch] text-ink-2">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-12 flex gap-6 text-sm text-ink-3">
        <Link href="/" className="font-semibold text-brand">
          Volver al inicio
        </Link>
        <Link href="/privacy" className="font-semibold text-brand">
          Privacidad
        </Link>
        <a href="https://github.com/KrlosEng/snip/issues" className="font-semibold text-brand">
          Reportar un enlace
        </a>
      </p>
    </div>
  );
}

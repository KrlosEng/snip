import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/ui";

export const metadata: Metadata = { title: "Privacidad" };

const ITEMS = [
  ["Qué guardamos de cada clic", "La fecha y hora, el país y la ciudad aproximados (según las cabeceras de nuestro proveedor de hosting), el tipo de dispositivo, navegador y sistema operativo, y solo el dominio del sitio desde el que llegó la visita."],
  ["Qué no guardamos", "Tu dirección IP. La convertimos en un código irreversible (hash con sal) que solo sirve para contar visitantes únicos. No usamos cookies de rastreo en la redirección."],
  ["Bots y vistas previas", "Cuando WhatsApp, Slack o X generan la vista previa de un enlace, ese acceso se marca como bot y no cuenta en tus métricas."],
  ["Tu cuenta", "Guardamos tu nombre, correo y una versión cifrada de tu contraseña (o tu identificador de Google). Puedes borrar tu cuenta desde Configuración; eso elimina todos tus enlaces y sus clics."],
  ["Enlaces sin cuenta", "Los enlaces creados sin cuenta vencen a los 7 días. Revisamos los destinos contra listas de sitios peligrosos para evitar phishing."],
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-8 sm:py-12">
      <Logo />
      <h1 className="mt-12 text-[2.25rem] leading-tight font-bold">Privacidad, en corto</h1>
      <p className="mt-3 text-lg text-ink-2">Snip mide clics para que sepas si tu enlace funcionó, no para seguir a las personas.</p>
      <dl className="mt-10 grid gap-8">
        {ITEMS.map(([k, v]) => (
          <div key={k} className="grid gap-2 border-t border-line pt-6">
            <dt className="font-display text-lg font-semibold">{k}</dt>
            <dd className="max-w-[62ch] text-ink-2">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-12 text-sm text-ink-3">
        <Link href="/" className="font-semibold text-brand">
          Volver al inicio
        </Link>
      </p>
    </div>
  );
}

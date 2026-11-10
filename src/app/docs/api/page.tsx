import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/ui";
import { getOrigin } from "@/lib/http";

export const metadata: Metadata = {
  title: "API para desarrolladores",
  description: "Crea enlaces cortos y consulta sus estadísticas desde tu propio programa con la API de Snip.",
};

type Endpoint = { method: "GET" | "POST" | "PATCH" | "DELETE"; path: string; does: string };

const ENDPOINTS: Endpoint[] = [
  { method: "GET", path: "/api/v1/me", does: "Comprueba que tu clave funciona." },
  { method: "GET", path: "/api/v1/links", does: "Lista tus enlaces. Filtros: q, folder, tag, status, sort, page, per_page (máx. 100)." },
  { method: "POST", path: "/api/v1/links", does: "Crea un enlace." },
  { method: "GET", path: "/api/v1/links/{id}", does: "Muestra un enlace." },
  { method: "PATCH", path: "/api/v1/links/{id}", does: "Cambia solo los campos que envíes." },
  { method: "DELETE", path: "/api/v1/links/{id}", does: "Borra el enlace y sus clics (responde 204)." },
  { method: "GET", path: "/api/v1/links/{id}/stats", does: "Estadísticas sin bots. range=7d|30d|90d y filtros country, device, browser, referrer." },
];

const FIELDS: [string, string][] = [
  ["url", "Destino (obligatorio al crear). Solo http o https."],
  ["alias", "Alias propio de 3 a 32 letras, números o guiones. Si no lo envías, se genera uno."],
  ["title", "Nombre para reconocerlo."],
  ["folder", "Carpeta (texto). null la quita."],
  ["tags", "Lista de etiquetas, por ejemplo [\"promo\", \"verano\"]. Máximo 10."],
  ["expires_at", "Fecha de vencimiento en ISO 8601. null la quita."],
  ["starts_at", "Desde cuándo funciona, en ISO 8601. null la quita."],
  ["max_clicks", "Vence tras ese número de clics. null lo quita."],
  ["notify_at", "Te avisa por correo al llegar a esos clics. null lo quita."],
  ["password", "Contraseña para abrirlo (mínimo 4 caracteres). \"\" o null la quita."],
  ["is_active", "Solo al editar: false lo pausa, true lo activa."],
];

const ERRORS: [string, string][] = [
  ["400 invalid_request", "Algún campo no es válido. Revisa error.field y error.message."],
  ["401 missing_key / invalid_key", "Falta la clave, está mal escrita o fue revocada."],
  ["403 read_only", "La cuenta demo no puede cambiar nada."],
  ["404 not_found", "El enlace no existe o no es tuyo."],
  ["409 conflict", "Ese alias ya está ocupado."],
  ["422 invalid_request", "El destino está marcado como peligroso."],
  ["429 rate_limited", "Pasaste el límite. Espera los segundos que indica Retry-After."],
];

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-xl border border-line bg-surface-2 p-4 text-[13px] leading-relaxed">
      <code className="font-mono">{children}</code>
    </pre>
  );
}

const methodTone: Record<Endpoint["method"], string> = {
  GET: "text-success",
  POST: "text-brand",
  PATCH: "text-warn",
  DELETE: "text-danger",
};

export default async function ApiDocsPage() {
  const origin = await getOrigin();
  const create = `curl -X POST ${origin}/api/v1/links -H "Authorization: Bearer snip_TU_CLAVE" -H "Content-Type: application/json" -d '{"url": "https://tutienda.mx/promo", "alias": "promo-otono", "tags": ["promo"]}'`;
  const response = `{
  "data": {
    "id": "8f0c…",
    "slug": "promo-otono",
    "short_url": "${origin}/promo-otono",
    "url": "https://tutienda.mx/promo",
    "status": "active",
    "clicks": 0,
    "tags": ["promo"],
    "created_at": "2026-11-10T18:00:00.000Z"
  }
}`;
  const js = `const res = await fetch("${origin}/api/v1/links", {
  method: "POST",
  headers: {
    Authorization: "Bearer " + process.env.SNIP_API_KEY,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ url: "https://tutienda.mx/promo" }),
});
const { data, error } = await res.json();
console.log(data?.short_url ?? error?.message);`;

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:py-12">
      <Logo />
      <h1 className="mt-12 text-[2.25rem] leading-tight font-bold">API para desarrolladores</h1>
      <p className="mt-3 max-w-[62ch] text-lg text-ink-2">
        Crea enlaces y consulta sus clics desde tu sitio, tu tienda o una automatización. Mismas reglas que la app: alias libres, destinos seguros y bots
        fuera de las cuentas.
      </p>

      <section className="mt-10 grid gap-3 border-t border-line pt-8">
        <h2 className="text-xl font-semibold">1. Crea una clave</h2>
        <p className="max-w-[62ch] text-ink-2">
          Entra a{" "}
          <Link href="/settings" className="font-semibold text-brand underline-offset-4 hover:underline">
            Configuración → Claves de API
          </Link>{" "}
          y crea una. Se muestra una sola vez: guárdala como una contraseña y nunca la pongas en código que corre en el navegador.
        </p>
      </section>

      <section className="mt-10 grid gap-3 border-t border-line pt-8">
        <h2 className="text-xl font-semibold">2. Envíala en cada petición</h2>
        <Code>{`Authorization: Bearer snip_TU_CLAVE`}</Code>
        <p className="max-w-[62ch] text-ink-2">
          Límite: 120 peticiones por minuto por clave, y 100 enlaces nuevos por hora por cuenta. Cada respuesta trae X-RateLimit-Remaining.
        </p>
      </section>

      <section className="mt-10 grid gap-3 border-t border-line pt-8">
        <h2 className="text-xl font-semibold">3. Crea tu primer enlace</h2>
        <Code>{create}</Code>
        <p className="text-ink-2">Respuesta (201):</p>
        <Code>{response}</Code>
        <p className="text-ink-2">Lo mismo en JavaScript:</p>
        <Code>{js}</Code>
      </section>

      <section className="mt-10 grid gap-4 border-t border-line pt-8">
        <h2 className="text-xl font-semibold">Rutas</h2>
        <ul className="grid gap-3">
          {ENDPOINTS.map((e) => (
            <li key={e.method + e.path} className="grid gap-1 sm:grid-cols-[72px_minmax(0,1fr)] sm:gap-3">
              <span className={`font-mono text-[13px] font-semibold ${methodTone[e.method]}`}>{e.method}</span>
              <div className="min-w-0">
                <code className="font-mono text-[14px] break-all">{e.path}</code>
                <p className="text-sm text-ink-2">{e.does}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10 grid gap-4 border-t border-line pt-8">
        <h2 className="text-xl font-semibold">Campos de un enlace</h2>
        <dl className="grid gap-3">
          {FIELDS.map(([k, v]) => (
            <div key={k} className="grid gap-1 sm:grid-cols-[120px_minmax(0,1fr)] sm:gap-3">
              <dt className="font-mono text-[13px] font-semibold">{k}</dt>
              <dd className="text-sm text-ink-2">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-10 grid gap-4 border-t border-line pt-8">
        <h2 className="text-xl font-semibold">Errores</h2>
        <p className="text-ink-2">Siempre con la misma forma:</p>
        <Code>{`{ "error": { "code": "conflict", "message": "Ese alias ya está ocupado. Prueba otra variante.", "field": "alias" } }`}</Code>
        <dl className="grid gap-3">
          {ERRORS.map(([k, v]) => (
            <div key={k} className="grid gap-1 sm:grid-cols-[220px_minmax(0,1fr)] sm:gap-3">
              <dt className="font-mono text-[13px] font-semibold">{k}</dt>
              <dd className="text-sm text-ink-2">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <p className="mt-12 flex flex-wrap gap-6 text-sm">
        <Link href="/" className="font-semibold text-brand">
          Volver al inicio
        </Link>
        <Link href="/uso-aceptable" className="font-semibold text-brand">
          Uso aceptable
        </Link>
      </p>
    </div>
  );
}

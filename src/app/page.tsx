import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getUser } from "@/lib/auth";
import { Shortener } from "@/components/shortener";
import { LiveFeed } from "@/components/live-feed";
import { SnipStrip } from "@/components/snip-strip";
import { Item, Reveal, Stagger } from "@/components/motion";
import { ButtonLink, Logo } from "@/components/ui";
import { DemoButton } from "@/components/demo-button";

const BENEFITS = [
  {
    n: "01",
    title: "Corto, y con tu nombre",
    body: "Convierte un enlace lleno de parámetros en snip.to/mi-tienda. Fácil de dictar, de imprimir y de recordar.",
    sample: (
      <p className="font-mono text-[13px]">
        <span className="text-ink-3">snip.to/</span>
        <span className="text-brand">menu-tacos</span>
      </p>
    ),
  },
  {
    n: "02",
    title: "Cada clic, con contexto",
    body: "Ve cuándo llegó cada visita, desde qué país y ciudad, en qué dispositivo y de qué red social vino.",
    sample: (
      <p className="flex flex-wrap gap-1.5 text-xs">
        {["México 34%", "Móvil 61%", "instagram.com"].map((t) => (
          <span key={t} className="rounded-full border border-line bg-surface px-2 py-0.5 text-ink-2">
            {t}
          </span>
        ))}
      </p>
    ),
  },
  {
    n: "03",
    title: "Un QR listo para imprimir",
    body: "Cada enlace trae su código QR en PNG y SVG para volantes, menús, tarjetas o el stand de un evento.",
    sample: (
      <svg viewBox="0 0 21 21" className="size-10 text-ink" aria-hidden>
        <path
          fill="currentColor"
          d="M0 0h7v7H0zM1 1v5h5V1zM2 2h3v3H2zM14 0h7v7h-7zM15 1v5h5V1zM16 2h3v3h-3zM0 14h7v7H0zM1 15v5h5v-5zM2 16h3v3H2zM9 0h2v2H9zM9 3h1v3H9zM11 4h2v2h-2zM8 8h3v1H8zM12 9h2v2h-2zM9 10h2v2H9zM15 9h3v1h-3zM19 8h2v3h-2zM16 11h2v2h-2zM9 14h2v3H9zM12 13h1v4h-1zM14 15h3v2h-3zM18 14h3v1h-3zM19 16h2v3h-2zM14 18h2v3h-2zM10 19h3v2h-3zM8 12h1v1H8zM0 9h3v2H0zM4 8h2v3H4z"
        />
      </svg>
    ),
  },
];

export default async function Home() {
  const user = await getUser();

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-clip">
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Logo />
        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Cuenta">
          {user ? (
            <ButtonLink href="/dashboard" size="md" icon={<ArrowRight className="order-last size-4" aria-hidden />}>
              Ir a mi panel
            </ButtonLink>
          ) : (
            <>
              <ButtonLink href="/login" variant="ghost" size="md">
                Iniciar sesión
              </ButtonLink>
              <ButtonLink href="/register" size="md">
                Crear cuenta
              </ButtonLink>
            </>
          )}
        </nav>
      </header>

      <main className="relative z-10 flex-1">
        <section className="mx-auto grid w-full max-w-6xl gap-14 px-5 pt-8 pb-20 sm:px-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-14 lg:pt-16 lg:pb-28">
          <Stagger className="min-w-0">
            <Item>
              <p className="mb-6 font-mono text-xs tracking-[0.14em] text-ink-3 uppercase">
                Acortador de enlaces · <span className="text-ink">con analíticas</span>
              </p>
            </Item>
            <Item>
              <h1 className="text-[clamp(2.9rem,5.6vw,5.2rem)] leading-[0.9] font-bold tracking-[-0.055em]">
                Corta el enlace.
                <br />
                <span className="relative inline-block text-brand">
                  Mira quién llega.
                  <span aria-hidden className="cutline absolute right-0 -bottom-1.5 left-0 h-[3px] [background-image:linear-gradient(90deg,var(--brand)_55%,transparent_0)] [background-size:12px_3px]" />
                </span>
              </h1>
            </Item>
            <Item>
              <p className="mt-8 max-w-[46ch] text-[17px] leading-relaxed text-ink-2">
                Pega un enlace largo y llévate uno corto, su código QR y un registro de cada visita: país, dispositivo y de
                dónde vino.
              </p>
            </Item>
            <Item className="mt-9">
              <Shortener loggedIn={Boolean(user)} />
            </Item>
          </Stagger>

          <Reveal delay={0.25} className="min-w-0 lg:pt-10">
            <div className="crop rounded-xl border border-line bg-surface-2 p-6 sm:p-8 [background-image:linear-gradient(var(--line)_1px,transparent_1px),linear-gradient(90deg,var(--line)_1px,transparent_1px)] [background-size:28px_28px]">
              <SnipStrip />
            </div>
            <p className="mt-4 font-mono text-[11px] tracking-wide text-ink-3 uppercase">Fig. 1 — Lo que hace Snip, en 4 segundos.</p>
          </Reveal>
        </section>

        <section aria-labelledby="clics" className="border-t border-line">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] lg:gap-20 lg:py-28">
            <Reveal>
              <p className="font-mono text-xs tracking-[0.14em] text-brand uppercase">Después del corte</p>
              <h2 id="clics" className="mt-4 text-[clamp(2rem,4.4vw,3.2rem)] leading-[0.98] font-bold tracking-[-0.045em]">
                Cada clic deja huella.
              </h2>
              <p className="mt-5 max-w-[42ch] text-[16px] leading-relaxed text-ink-2">
                Snip redirige en milisegundos y anota la visita sin hacer esperar a nadie. Tú ves de dónde llegan, en qué
                dispositivo y qué canal funcionó.
              </p>
              <dl className="mt-10 grid grid-cols-3 gap-6 border-t border-line pt-6">
                {[
                  ["302", "redirección sin caché del navegador"],
                  ["0", "IPs guardadas: solo un hash"],
                  ["7", "caracteres por enlace generado"],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="font-display text-[1.9rem] leading-none font-bold tracking-tight tnum">{k}</dt>
                    <dd className="mt-2 text-[13px] leading-snug text-ink-3">{v}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
            <Reveal delay={0.15}>
              <LiveFeed />
            </Reveal>
          </div>
        </section>

        <section aria-labelledby="beneficios" className="border-y border-line bg-surface">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-20">
            <Reveal>
              <h2 id="beneficios" className="max-w-[22ch] text-[clamp(1.6rem,3.4vw,2.3rem)] leading-tight font-bold">
                Hecho para quien necesita saber si su enlace funcionó.
              </h2>
            </Reveal>
            <div className="mt-14 grid gap-10 md:grid-cols-3 md:gap-0 md:divide-x md:divide-dashed md:divide-line-strong">
              {BENEFITS.map((b, i) => (
                <Reveal key={b.n} delay={i * 0.08} className="md:px-8 md:first:pl-0 md:last:pr-0">
                  <p className="font-display text-[3.2rem] leading-none font-bold tracking-tight text-brand">{b.n}</p>
                  <h3 className="mt-5 text-xl font-semibold">{b.title}</h3>
                  <p className="mt-2 max-w-[38ch] text-[15px] text-ink-2">{b.body}</p>
                  <div className="mt-5 flex min-h-10 items-center">{b.sample}</div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
          <Reveal className="crop grid items-center gap-8 rounded-2xl bg-ink p-8 text-bg sm:p-12 lg:grid-cols-[1fr_auto]">
            <div>
              <h2 className="max-w-[20ch] text-[clamp(1.6rem,3.6vw,2.5rem)] leading-tight font-bold">
                Prueba el panel completo, con datos de ejemplo.
              </h2>
              <p className="mt-3 max-w-[50ch] text-[15px] opacity-75">
                Entra a una cuenta demo con varios enlaces y miles de clics. Sin registrarte, en un clic.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <DemoButton variant="primary" />
              {!user && (
                <ButtonLink href="/register" variant="ghost" size="lg" className="text-bg hover:bg-bg/10 hover:text-bg">
                  Crear cuenta gratis
                </ButtonLink>
              )}
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="relative z-10 border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-6 text-[13px] text-ink-3 sm:px-8">
          <p>Snip · Acortador de enlaces con analíticas</p>
          <nav className="flex gap-5" aria-label="Legal">
            <Link href="/privacy" className="hover:text-ink">
              Privacidad
            </Link>
            <Link href="/login" className="hover:text-ink">
              Iniciar sesión
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

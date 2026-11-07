import Link from "next/link";
import type { ReactNode } from "react";
import { getUser } from "@/lib/auth";
import { DemoButton } from "@/components/demo-button";
import { RiseObserver } from "@/components/landing/rise";
import { Constellation } from "@/components/landing/constellation";
import { CtaForm, HeroForm, ResultSection, ShortenProvider } from "@/components/landing/void-shorten";
import { pill } from "@/components/landing/styles";
import { ClicksVisual, FactsVisual, QrVisual } from "@/components/landing/visuals";

/**
 * Landing de Snip, siguiendo el modelo de diseño "Dala" (DESIGN.md): vacío negro
 * puro, un solo violeta para la acción, ámbar como chispa, titulares enormes en
 * peso 400 y texto ultraligero. Sin tarjetas ni bordes. La imagen de marca es una
 * constelación de triángulos que forma el logo de Snip; cada chispa ámbar que
 * llega es un clic aterrizando.
 */

const label = "text-[14px] leading-[1.2] font-semibold tracking-[0.025em] uppercase";
const h2 = "mt-5 text-[clamp(2.5rem,5.4vw,4.875rem)] leading-[1.02] font-normal tracking-[-0.04em]";
const body = "mt-6 max-w-[480px] text-[18px] leading-[1.5] font-extralight";

function Mark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <g fill="none" stroke="#8052ff" strokeWidth="2.6" strokeLinecap="round">
        <circle cx="11" cy="21.5" r="3.2" />
        <circle cx="21" cy="21.5" r="3.2" />
        <path d="M13 19 L22 8M19 19 L10 8" />
      </g>
    </svg>
  );
}

/** Dos columnas que se alternan: texto y visual, como el modelo. */
function Block({ id, kicker, title, text, visual, flip }: { id: string; kicker: string; title: string; text: string; visual: ReactNode; flip?: boolean }) {
  return (
    <section id={id} aria-labelledby={`${id}-t`} className="mx-auto max-w-[1280px] px-6 py-24 md:py-[120px]">
      <div className="grid items-center gap-14 md:grid-cols-2 md:gap-20">
        <div data-rise className={flip ? "md:order-2" : ""}>
          <p className={`${label} text-saffron`}>{kicker}</p>
          <h2 id={`${id}-t`} className={h2}>
            {title}
          </h2>
          <p className={body}>{text}</p>
        </div>
        <div data-rise style={{ ["--i" as string]: 1 }} className={`flex ${flip ? "md:order-1 md:justify-start" : "md:justify-end"}`}>
          {visual}
        </div>
      </div>
    </section>
  );
}

export default async function Home() {
  const user = await getUser();

  return (
    <div className="void min-h-dvh overflow-x-clip">
      <RiseObserver />
      <ShortenProvider>
        {/* ---------- Navegación: transparente sobre el vacío ---------- */}
        <header className="mx-auto flex h-20 max-w-[1280px] items-center justify-between px-6">
          <Link href="/" aria-label="Snip, inicio" className="flex items-center gap-2.5">
            <Mark />
            <span className="text-[22px] leading-none font-semibold tracking-[-0.02em]">Snip</span>
          </Link>
          <nav aria-label="Principal" className="hidden items-center gap-9 md:flex">
            {[
              ["Clics", "#clics"],
              ["QR", "#qr"],
              ["Privacidad", "#privacidad"],
            ].map(([t, h]) => (
              <a key={h} href={h} className={`${label} text-ash transition-colors hover:text-white`}>
                {t}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-6">
            {!user && (
              <Link href="/login" className={`${label} hidden text-ash transition-colors hover:text-white sm:block`}>
                Entrar
              </Link>
            )}
            <Link href={user ? "/dashboard" : "/register"} className={`${pill} h-11`}>
              {user ? "Mi panel" : "Empezar"}
            </Link>
          </div>
        </header>

        <main>
          {/* ---------- Hero: titular a la izquierda, la constelación a la derecha ---------- */}
          <section aria-labelledby="titulo" className="mx-auto grid max-w-[1280px] items-center gap-6 px-6 pt-4 pb-16 md:min-h-[calc(100svh-5rem)] md:grid-cols-[1.1fr_0.9fr] md:gap-10 md:pb-20">
            <div>
              <h1 id="titulo" className="text-[clamp(2.35rem,5vw,4.25rem)] leading-[1.02] font-normal tracking-[-0.045em]">
                <span className="mask-line">
                  <span>Corta el enlace.</span>
                </span>
                <span className="mask-line">
                  <span>Mira quién llega.</span>
                </span>
              </h1>
              <p className={`${label} mt-10 text-saffron`}>Acortador de enlaces con analíticas</p>
              <p className="mt-4 max-w-[480px] text-[18px] leading-[1.5] font-extralight">
                Pega un enlace largo y llévate uno corto, su código QR y el registro de cada visita: país, dispositivo y de dónde vino.
              </p>
              <div className="mt-10 max-w-[560px]">
                <HeroForm loggedIn={Boolean(user)} />
              </div>
            </div>
            <div className="relative h-[52svh] min-h-[340px] md:h-[min(76svh,700px)]">
              <Constellation />
            </div>
          </section>

          <ResultSection />

          <Block
            id="clics"
            kicker="Cada visita"
            title="Cada clic deja una luz."
            text="País, ciudad, dispositivo, navegador y el sitio de donde llegó la visita, en un panel que se llena con cada clic. Los bots no cuentan."
            visual={<ClicksVisual />}
          />

          <Block
            id="qr"
            kicker="Para imprimir"
            title="Tu enlace, en papel."
            text="Cada enlace trae su código QR en PNG y SVG: para volantes, menús, tarjetas o el stand de un evento. Se escanea y se cuenta igual que un clic."
            visual={<QrVisual />}
            flip
          />

          <Block
            id="privacidad"
            kicker="Sin rastrearte"
            title="Rápido, y sin guardar tu IP."
            text="Te mandamos al destino de inmediato y guardamos el clic después, para que la analítica nunca haga esperar a nadie."
            visual={<FactsVisual />}
          />

          {/* ---------- Cierre ---------- */}
          <section id="empezar" aria-labelledby="empezar-t" className="mx-auto max-w-[1280px] px-6 py-24 md:py-[120px]">
            <div className="grid items-center gap-14 md:grid-cols-2 md:gap-20">
              <div data-rise>
                <p className={`${label} text-saffron`}>Empieza ahora</p>
                <h2 id="empezar-t" className={h2}>
                  Pega tu primer enlace.
                </h2>
                <p className={body}>Sin cuenta dura 7 días; con una cuenta gratis es permanente y ves cada clic.</p>
                <div className="mt-10 max-w-[560px]">
                  <CtaForm />
                </div>
              </div>
              <div data-rise style={{ ["--i" as string]: 1 }} className="relative h-[320px] md:h-[440px]">
                <Constellation shape="none" />
              </div>
            </div>
          </section>
        </main>

        {/* ---------- Pie ---------- */}
        <footer className="mx-auto max-w-[1280px] px-6 pt-10 pb-12">
          <div className="grid gap-12 md:grid-cols-2">
            <div>
              <div className="flex items-center gap-2.5">
                <Mark />
                <span className="text-[22px] leading-none font-semibold tracking-[-0.02em]">Snip</span>
              </div>
              <p className="mt-4 max-w-[36ch] text-[18px] leading-[1.5] font-extralight text-mist">Enlaces cortos, QR y cada clic contado.</p>
            </div>
            <ul className={`${label} flex flex-wrap content-start gap-x-9 gap-y-4 text-ash md:justify-end`}>
              <li>
                <Link href="/login" className="transition-colors hover:text-white">Entrar</Link>
              </li>
              <li>
                <Link href="/register" className="transition-colors hover:text-white">Crear cuenta</Link>
              </li>
              <li>
                <DemoButton variant="ghost" size="md" label="Demo" className="!h-auto !gap-2 !p-0 !text-[14px] !font-semibold uppercase tracking-[0.025em] !text-ash hover:!bg-transparent hover:!text-white" />
              </li>
              <li>
                <Link href="/privacy" className="transition-colors hover:text-white">Privacidad</Link>
              </li>
              <li>
                <a href="https://github.com/KrlosEng/snip" className="transition-colors hover:text-white">GitHub</a>
              </li>
            </ul>
          </div>
          <p className="mt-16 text-[14px] text-ash">© 2026 Snip</p>
        </footer>
      </ShortenProvider>
    </div>
  );
}

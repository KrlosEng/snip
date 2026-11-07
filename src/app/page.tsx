import Link from "next/link";
import { getUser } from "@/lib/auth";
import { Shortener } from "@/components/shortener";
import { DemoButton } from "@/components/demo-button";
import { OutputIndex } from "@/components/landing/outputs";
import { CtaSentence } from "@/components/landing/cta-sentence";
import { RiseObserver } from "@/components/landing/rise";

/**
 * Landing de Snip. Dirección "Colour chapters" (taste-skill, semilla 1627843826):
 * la página es una fila de carteles pegados en la calle, que es donde viven los
 * enlaces cortos impresos de los negocios. Cada capítulo es un campo de color plano.
 */

const PHOTOS = {
  wall: { src: "/media/condesa-wall-copa-playstation.jpg", w: 1024, h: 683, alt: "Carteles pegados y despegados en un muro de la colonia Condesa, Ciudad de México" },
  flyer: { src: "/media/sugar-shack-bus-trip.jpg", w: 1023, h: 828, alt: "Volante amarillo en un cristal con tiras para arrancar que llevan el teléfono" },
  market: { src: "/media/stallshidalgomkt.jpg", w: 1920, h: 1285, alt: "Puestos de comida y ropa vistos desde arriba en el Mercado Hidalgo de Guanajuato" },
  menu: { src: "/media/menu-american-coffee-qr-codes-the-hague.jpg", w: 1920, h: 3413, alt: "Menú impreso de una cafetería con dos códigos QR para ver la carta e Instagram" },
};

const CREDITS = [
  ["Condesa Wall (Copa Playstation)", "Carl Campbell", "CC BY-SA 2.0", "https://www.flickr.com/photos/10404073@N05/8104110543"],
  ["Sugar Shack Bus Trip", "Indrid__Cold", "CC BY-SA 2.0", "https://www.flickr.com/photos/29442760@N00/25005834983"],
  ["StallsHidalgoMkt", "AlejandroLinaresGarcia", "CC BY-SA 4.0", "https://commons.wikimedia.org/w/index.php?curid=11581203"],
  ["Menu American Coffee QR Codes, The Hague (2023) 01", "Donald Trung Quoc Don", "CC BY-SA 4.0", "https://commons.wikimedia.org/w/index.php?curid=132776869"],
];

const STAGES = [
  { grow: 12, color: "bg-field-1", time: "cinco segundos", text: "Primero pegas el enlace largo y eliges un alias, si quieres." },
  { grow: 30, color: "bg-field-2", time: "una tarde", text: "Luego lo imprimes en el volante o el menú, o lo mandas por WhatsApp." },
  { grow: 58, color: "bg-field-4 text-field-4-ink", time: "las semanas que dure", text: "Después cada visita llega a tu panel con país, dispositivo y canal." },
];

const CHANNELS = ["instagram.com", "whatsapp.com", "t.co", "google.com", "facebook.com", "linkedin.com"];

function Photo({ p, className, priority }: { p: (typeof PHOTOS)[keyof typeof PHOTOS]; className?: string; priority?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- fotos ya optimizadas, recortadas por CSS
    <img
      src={p.src}
      width={p.w}
      height={p.h}
      alt={p.alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={`h-full w-full object-cover grayscale contrast-[1.05] ${className ?? ""}`}
    />
  );
}

export default async function Home() {
  const user = await getUser();

  return (
    <div className="poster min-h-dvh overflow-x-clip">
      <RiseObserver />

      {/* ---------- Masthead: la pared ---------- */}
      <header className="relative">
        <nav aria-label="Principal" className="absolute inset-x-0 top-0 z-10 flex h-14 items-stretch text-[16px] md:h-16">
          <Link href="/" className="flex items-center gap-2 bg-[#1c1c1c] px-5 font-bold tracking-[-0.02em] text-[#e3e2da] md:px-8">
            <svg viewBox="0 0 32 32" className="size-6" aria-hidden>
              <g fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                <circle cx="11" cy="21.5" r="3.2" />
                <circle cx="21" cy="21.5" r="3.2" />
                <path d="M13 19 L22 8M19 19 L10 8" />
              </g>
            </svg>
            <span className="text-[22px]">snip</span>
          </Link>
          <div className="hidden items-center gap-7 bg-field-4 px-7 text-field-4-ink md:flex md:w-[calc(42%-118px)]">
            <a href="#salidas" className="transition-opacity hover:opacity-75">qué te llevas</a>
            <a href="#pasos" className="transition-opacity hover:opacity-75">cómo funciona</a>
            <a href="#canales" className="transition-opacity hover:opacity-75">de dónde llegan</a>
          </div>
          <div className="ml-auto flex items-center bg-[#1c1c1c] px-5 text-[#e3e2da] md:px-8">
            {user ? (
              <Link href="/dashboard" className="font-bold hover:underline">mi panel</Link>
            ) : (
              <Link href="/login" className="font-bold hover:underline">entrar</Link>
            )}
          </div>
        </nav>

        <div className="grid h-[38svh] grid-cols-3 grid-rows-2 md:h-[46svh] md:grid-cols-6">
          <div className="col-span-2 overflow-hidden">
            <Photo p={PHOTOS.wall} priority className="drift" />
          </div>
          <div className="bg-field-3" />
          <div className="hidden overflow-hidden md:block">
            <Photo p={PHOTOS.flyer} priority />
          </div>
          <div className="hidden bg-field-2 md:row-span-2 md:block" />
          <div className="hidden overflow-hidden md:block">
            <Photo p={PHOTOS.menu} priority className="object-[50%_40%]" />
          </div>
          <div className="bg-field-4" />
          <div className="overflow-hidden md:col-span-2">
            <Photo p={PHOTOS.market} priority />
          </div>
          <div className="bg-field-2 md:hidden" />
          <div className="hidden bg-field-3 md:block" />
          <div className="hidden bg-[#1c1c1c] md:block" />
        </div>
      </header>

      <main>
        {/* ---------- Hero: título en el eje y el acortador ---------- */}
        <section aria-labelledby="titulo" className="grid gap-10 px-4 pt-10 pb-24 md:grid-cols-[42%_1fr] md:gap-0 md:px-8 md:pt-14 md:pb-32">
          <h1 id="titulo" className="order-1 text-[13vw] leading-[0.9] font-bold tracking-[-0.06em] md:order-2 md:text-[clamp(4rem,8.3vw,8rem)]">
            <span className="mask-line">
              <span>enlaces cortos</span>
            </span>
            <span className="mask-line">
              <span>que cuentan</span>
            </span>
          </h1>
          <div className="after-title order-2 max-w-[560px] md:order-1 md:pt-3 md:pr-12">
            <p className="max-w-[30ch] text-[22px] leading-snug">
              Pega un enlace largo y llévate uno corto, su código QR y cada clic contado: país, dispositivo y de dónde vino.
            </p>
            <div className="mt-8">
              <Shortener loggedIn={Boolean(user)} />
            </div>
          </div>
        </section>

        {/* ---------- Capítulo salvia: lo que sale de Snip ---------- */}
        <section id="salidas" aria-labelledby="salidas-t" className="bg-field-2 px-4 py-24 text-field-ink md:px-8 md:py-36">
          <h2 id="salidas-t" data-rise className="mb-12 text-[11vw] leading-[0.95] font-bold tracking-[-0.05em] md:mb-16 md:text-[clamp(3rem,6.4vw,6.5rem)]">
            lo que te llevas
          </h2>
          <div data-rise style={{ ["--i" as string]: 1 }}>
            <OutputIndex />
          </div>
        </section>

        {/* ---------- Capítulo rubor: cómo funciona, como una barra de avance ---------- */}
        <section id="pasos" aria-labelledby="pasos-t" className="bg-field-3 px-4 py-24 text-field-ink md:px-8 md:py-36">
          <h2 id="pasos-t" data-rise className="mb-16 text-[11vw] leading-[0.95] font-bold tracking-[-0.05em] md:text-[clamp(3rem,6.4vw,6.5rem)]">
            de la tienda al clic
          </h2>
          <ol data-ui className="flex flex-col gap-1.5 md:flex-row" aria-label="Cuánto tarda cada paso">
            {STAGES.map((s, i) => (
              <li key={s.time} data-rise style={{ ["--i" as string]: i, flexGrow: s.grow }} className="flex min-w-0 flex-col md:basis-0">
                <div className={`${s.color} flex min-h-[96px] items-start rounded-[14px] p-5 md:h-[22vh] md:min-h-0`}>
                  <span className="text-[22px] leading-tight font-bold tracking-[-0.03em] lg:text-[30px]">{s.time}</span>
                </div>
                <p className="mt-4 max-w-[22ch] text-[17px] leading-snug md:pr-4">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ---------- Capítulo pizarra: de dónde llegan ---------- */}
        <section id="canales" aria-labelledby="canales-t" className="bg-field-1 px-4 py-24 text-field-ink md:px-8 md:py-36">
          <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-4 lg:gap-2">
            <div data-rise className="col-span-2 flex min-h-[200px] flex-col justify-between gap-6 rounded-[14px] bg-field-4 p-6 text-field-4-ink lg:aspect-[3/1] lg:min-h-0 md:p-8">
              <h2 id="canales-t" className="text-[clamp(2rem,3.4vw,3rem)] leading-[0.95] font-bold tracking-[-0.05em]">de dónde llegan tus clics</h2>
              <p className="max-w-[42ch] text-[17px] leading-snug">
                Snip lee el sitio de origen de cada visita. Así sabes si funcionó la historia de Instagram, el grupo de WhatsApp o el volante impreso.
              </p>
            </div>
            {CHANNELS.map((c, i) => (
              <div key={c} data-rise style={{ ["--i" as string]: i + 1 }} className="flex aspect-[3/2] items-start rounded-[14px] bg-[#b4c0c8] p-5 md:p-6">
                <span className="min-w-0 text-[22px] leading-tight font-bold tracking-[-0.03em] break-words lg:text-[30px]">{c}</span>
              </div>
            ))}
            <div data-rise className="col-span-2 flex items-start rounded-[14px] bg-[#b4c0c8] p-5 md:p-6 lg:col-span-4">
              <p className="max-w-[60ch] text-[17px] leading-snug">
                Cuando la visita no trae origen, como al escanear un QR en la calle, el clic cuenta como directo. Las vistas previas de WhatsApp, Slack o X se marcan como bot y no inflan tus números.
              </p>
            </div>
          </div>
        </section>

        {/* ---------- Capítulo oliva: la frase con hueco ---------- */}
        <section aria-labelledby="cierre" className="bg-field-4 px-4 py-24 text-field-4-ink md:px-8 md:py-36">
          <div data-rise className="md:w-11/12">
            <CtaSentence />
          </div>
        </section>
      </main>

      {/* ---------- Pie: el nombre primero ---------- */}
      <footer className="bg-[#1c1c1c] px-4 pt-10 pb-8 text-[#e3e2da] md:px-8">
        <div aria-hidden className="h-[0.74em] overflow-hidden text-[34vw] leading-[0.9] font-bold tracking-[-0.07em]">
          snip
        </div>
        <div className="mt-16 grid gap-12 md:grid-cols-12">
          <ul className="grid content-start gap-3 md:col-span-5">
            <li>
              <DemoButton
                variant="ghost"
                size="lg"
                label="entra a la demo"
                className="!h-auto !gap-3 !rounded-none !bg-transparent !p-0 text-[clamp(1.6rem,2.4vw,2.25rem)] !font-bold tracking-[-0.03em] !text-field-2 hover:underline"
              />
            </li>
            <li>
              <Link href="/register" className="text-[clamp(1.6rem,2.4vw,2.25rem)] font-bold tracking-[-0.03em] text-field-2 hover:underline">
                crea tu cuenta
              </Link>
            </li>
            <li>
              <a href="https://github.com/KrlosEng/snip" className="text-[clamp(1.6rem,2.4vw,2.25rem)] font-bold tracking-[-0.03em] text-field-2 hover:underline">
                el código en github
              </a>
            </li>
          </ul>
          <div className="grid grid-cols-2 gap-8 text-[15px] md:col-span-7 md:grid-cols-3">
            <ul className="grid content-start gap-2">
              <li><Link href="/login" className="hover:underline">Iniciar sesión</Link></li>
              <li><Link href="/register" className="hover:underline">Crear cuenta</Link></li>
              <li><Link href="/privacy" className="hover:underline">Privacidad</Link></li>
            </ul>
            <ul className="grid content-start gap-2">
              <li><a href="#salidas" className="hover:underline">Qué te llevas</a></li>
              <li><a href="#pasos" className="hover:underline">Cómo funciona</a></li>
              <li><a href="#canales" className="hover:underline">De dónde llegan</a></li>
            </ul>
            <p className="col-span-2 leading-relaxed break-words text-[#b9b8b1] md:col-span-1">
              Fotos:{" "}
              {CREDITS.map(([t, a, l, href], i) => (
                <span key={href}>
                  <a href={href} className="underline underline-offset-2 hover:text-[#e3e2da]">{t}</a> de {a}, {l}
                  {i < CREDITS.length - 1 ? "; " : "."}
                </span>
              ))}
            </p>
          </div>
        </div>
        <div className="mt-24 flex flex-wrap justify-between gap-4 text-[13px] text-[#b9b8b1]">
          <p>Snip · acortador de enlaces con analíticas</p>
          <a href="#titulo" className="hover:text-[#e3e2da]">volver arriba</a>
        </div>
      </footer>
    </div>
  );
}

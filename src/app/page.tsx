import Link from "next/link";
import { getUser } from "@/lib/auth";
import { DemoButton } from "@/components/demo-button";
import { QrPreview } from "@/components/qr";
import { RiseObserver } from "@/components/landing/rise";
import { ActionTile, CtaTile, ResultRow, ShortenProvider } from "@/components/landing/shorten-board";
import { DepartureBoard } from "@/components/landing/departure-board";
import {
  AliasFragment,
  ChannelsFragment,
  ClicksFragment,
  CsvFragment,
  DevicesFragment,
  GoneFragment,
  HOST,
  QrFragment,
  TileTitle,
} from "@/components/landing/fragments";

/**
 * Landing de Snip. Dirección "The well-kept board" (taste-skill, semilla 1713703384):
 * la página es un tablero de mosaicos pegados con 8px de separación, como las páginas
 * de funciones de Apple o Figma, pero con una pieza real del producto en cada mosaico.
 * Idea: lo que sale de un enlace corto (su QR, sus clics, su reporte, su aviso de
 * vencido) se vuelve una pieza del tablero.
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
  { grow: 58, color: "bg-[#1c1c1c] text-[#e3e2da]", time: "las semanas que dure", text: "Después cada visita llega a tu panel con país, dispositivo y canal." },
];

const LETTERS = [
  { ch: "s", h: "78%", bg: "bg-field-2", grow: 5 },
  { ch: "n", h: "96%", bg: "bg-field-3", grow: 5 },
  { ch: "i", h: "88%", bg: "bg-field-1", grow: 3 },
  { ch: "p", h: "100%", bg: "bg-field-4 text-field-4-ink", grow: 5 },
];

type Photo = (typeof PHOTOS)[keyof typeof PHOTOS];

function Pic({ p, priority, className = "" }: { p: Photo; priority?: boolean; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- fotos ya optimizadas, recortadas por CSS
    <img
      src={p.src}
      width={p.w}
      height={p.h}
      alt={p.alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={`h-full w-full object-cover grayscale contrast-[1.05] ${className}`}
    />
  );
}

/** Un mosaico: rectángulo plano, un solo radio, texto arriba a la izquierda. */
const tile = "relative overflow-hidden rounded-lg p-6";

export default async function Home() {
  const user = await getUser();

  return (
    <div className="poster min-h-dvh overflow-x-clip p-2 md:p-3">
      <RiseObserver />
      <ShortenProvider>
        {/* ---------- Barra superior hecha de mosaicos ---------- */}
        <header>
          <nav aria-label="Principal" className="grid h-[60px] grid-cols-[60px_1fr_auto] gap-2 text-[17px] font-semibold">
            <Link href="/" aria-label="Snip, inicio" className="grid place-items-center rounded-lg bg-[#1c1c1c] text-[#e3e2da]">
              <svg viewBox="0 0 32 32" className="size-7" aria-hidden>
                <g fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                  <circle cx="11" cy="21.5" r="3.2" />
                  <circle cx="21" cy="21.5" r="3.2" />
                  <path d="M13 19 L22 8M19 19 L10 8" />
                </g>
              </svg>
            </Link>
            <div className="flex items-center gap-6 rounded-lg bg-surface px-5 lg:pl-[calc(50vw-80px)]">
              <a href="#tablero" className="hidden transition-opacity hover:opacity-60 lg:inline">tablero</a>
              <a href="#salidas" className="hidden transition-opacity hover:opacity-60 lg:inline">qué te llevas</a>
              <a href="#pasos" className="hidden transition-opacity hover:opacity-60 lg:inline">cómo funciona</a>
              <a href="#empezar" className="transition-opacity hover:opacity-60">empezar</a>
            </div>
            <Link href={user ? "/dashboard" : "/login"} className="grid place-items-center rounded-lg bg-[#1c1c1c] px-6 text-[#e3e2da] transition-colors hover:bg-black">
              {user ? "mi panel" : "entrar"}
            </Link>
          </nav>
        </header>

        <main className="mt-2 grid gap-2">
          {/* ---------- Hero: tablero de dos por dos ---------- */}
          <section aria-labelledby="titulo" className="grid gap-2 sm:grid-cols-2 lg:h-[calc(100svh-5.5rem)] lg:min-h-[600px] lg:grid-rows-2">
            <div className={`${tile} flex min-h-[34svh] items-end bg-surface lg:min-h-0`}>
              <h1 id="titulo" className="text-[clamp(5.5rem,22vw,6.5rem)] leading-[0.88] font-extrabold tracking-[-0.05em] md:text-[clamp(6rem,12.5vw,11.875rem)]">
                <span className="mask-line">
                  <span>snip</span>
                </span>
                <span className="sr-only"> · acortador de enlaces con analíticas</span>
              </h1>
            </div>

            <div className="shutter aspect-[4/3] overflow-hidden rounded-lg sm:aspect-auto">
              <Pic p={PHOTOS.market} priority className="object-[50%_60%]" />
            </div>

            <div className="hidden overflow-hidden rounded-lg lg:block">
              <Pic p={PHOTOS.wall} priority className="drift" />
            </div>

            <div className="grid gap-2 sm:col-span-2 sm:grid-cols-2 lg:col-span-1">
              <div className={`${tile} bg-[#1c1c1c] text-[#e3e2da]`}>
                <p className="max-w-[16ch] text-[24px] leading-[1.08] sm:text-[28px] font-bold tracking-[-0.03em]">Acorta enlaces, imprime su QR y mira quién hizo cada clic.</p>
              </div>
              <div className={`${tile} min-h-[300px] bg-field-4 text-field-4-ink`}>
                <ActionTile loggedIn={Boolean(user)} />
              </div>
            </div>
          </section>

          <ResultRow />

          {/* ---------- Tablero de enlaces (lista principal del producto) ---------- */}
          <section id="tablero" aria-labelledby="tablero-t" className="rounded-lg bg-[#1c1c1c] p-4 text-[#e3e2da] md:p-6">
            <h2 id="tablero-t" data-rise className="mb-6 max-w-[18ch] px-2 text-[40px] leading-[0.98] font-bold tracking-[-0.04em] md:mb-8 md:text-[clamp(2.5rem,5vw,4.75rem)] md:leading-[0.92]">
              tus enlaces, en un tablero
            </h2>
            <div data-rise style={{ ["--i" as string]: 1 }}>
              <DepartureBoard />
            </div>
          </section>

          {/* ---------- Mosaicos: lo que sale de cada enlace ---------- */}
          <section id="salidas" aria-labelledby="salidas-t" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-12 lg:auto-rows-[88px]">
            <div data-rise className={`${tile} flex flex-col justify-end bg-field-4 text-field-4-ink sm:col-span-2 lg:col-span-6 lg:row-span-2`}>
              <h2 id="salidas-t" className="max-w-[16ch] text-[40px] leading-[0.98] font-bold tracking-[-0.04em]">
                lo que te llevas de cada enlace
              </h2>
            </div>

            <div data-rise style={{ ["--i" as string]: 1 }} className={`${tile} bg-field-3 lg:col-span-3 lg:row-span-4`}>
              <TileTitle>el código qr</TileTitle>
              <QrFragment />
            </div>

            <div data-rise style={{ ["--i" as string]: 2 }} className={`${tile} bg-field-2 lg:col-span-3 lg:row-span-4`}>
              <TileTitle>por dispositivo</TileTitle>
              <DevicesFragment />
            </div>

            <div data-rise style={{ ["--i" as string]: 1 }} className={`${tile} bg-field-1 sm:col-span-2 lg:col-span-6 lg:row-span-4`}>
              <TileTitle>los clics, día por día</TileTitle>
              <ClicksFragment />
            </div>

            <div data-rise style={{ ["--i" as string]: 2 }} className={`${tile} bg-surface sm:col-span-2 lg:col-span-6 lg:row-span-2`}>
              <TileTitle>de dónde llegan</TileTitle>
              <ChannelsFragment />
            </div>

            <div data-rise className={`${tile} bg-field-1 sm:col-span-2 lg:col-span-6 lg:row-span-4`}>
              <TileTitle>el reporte para Excel</TileTitle>
              <CsvFragment />
            </div>

            <div data-rise style={{ ["--i" as string]: 1 }} className="aspect-[3/4] overflow-hidden rounded-lg lg:col-span-3 lg:row-span-4 lg:aspect-auto">
              <Pic p={PHOTOS.menu} className="object-[40%_30%]" />
            </div>

            <div data-rise style={{ ["--i" as string]: 2 }} className={`${tile} bg-surface lg:col-span-3 lg:row-span-2`}>
              <TileTitle>tu propio alias</TileTitle>
              <AliasFragment />
            </div>

            <div data-rise style={{ ["--i" as string]: 3 }} className={`${tile} bg-field-3 lg:col-span-3 lg:row-span-2`}>
              <TileTitle>el aviso de vencido</TileTitle>
              <GoneFragment />
            </div>
          </section>

          {/* ---------- Cómo funciona: la barra de avance ---------- */}
          <section id="pasos" aria-labelledby="pasos-t" className="rounded-lg bg-field-3 p-6 text-field-ink md:p-12">
            <h2 id="pasos-t" data-rise className="mb-12 text-[40px] leading-[0.98] font-bold tracking-[-0.04em] md:mb-16 md:text-[clamp(3rem,6.4vw,6.5rem)] md:leading-[0.92]">
              de la tienda al clic
            </h2>
            <ol data-ui className="flex flex-col gap-1.5 lg:flex-row" aria-label="Cuánto tarda cada paso">
              {STAGES.map((s, i) => (
                <li key={s.time} data-rise style={{ ["--i" as string]: i, flexGrow: s.grow }} className="flex min-w-0 flex-col lg:basis-0">
                  <div className={`${s.color} flex min-h-[96px] items-start rounded-lg p-5 lg:h-[22vh] lg:min-h-0`}>
                    <span className="text-[22px] leading-tight font-bold tracking-[-0.02em] lg:text-[28px]">{s.time}</span>
                  </div>
                  <p className="mt-4 mb-4 max-w-[24ch] text-[17px] leading-snug lg:mb-0 lg:pr-4">{s.text}</p>
                </li>
              ))}
            </ol>
          </section>

          {/* ---------- Cierre: el mosaico de acción, recortado de una fila más larga ---------- */}
          <section id="empezar" aria-labelledby="empezar-t" className="-mx-2 grid gap-2 md:-mx-3 md:grid-cols-12">
            <div className="hidden overflow-hidden rounded-r-lg md:col-span-2 md:block">
              <Pic p={PHOTOS.flyer} className="object-[50%_40%]" />
            </div>
            <div data-rise className={`${tile} mx-2 grid gap-8 bg-field-4 p-6 text-field-4-ink md:col-span-8 md:mx-0 md:min-h-[360px] md:p-10 lg:grid-cols-[1fr_auto]`}>
              <CtaTile />
              <div className="hidden lg:block">
                <QrPreview value={`https://${HOST}`} className="w-[176px]" />
                <p className="mt-3 max-w-[176px] text-[15px] leading-snug">Escanéalo con tu celular: es un QR de Snip hacia esta misma página.</p>
              </div>
            </div>
            <div className="hidden rounded-l-lg bg-field-2 md:col-span-2 md:block" />
          </section>
        </main>

        {/* ---------- Pie: el nombre, construido con bloques ---------- */}
        <footer className="mt-2 rounded-lg bg-[#1c1c1c] p-4 text-[#e3e2da] md:p-8">
          <div aria-hidden className="flex h-[26svh] min-h-[170px] items-end gap-1 md:h-[34svh]">
            {LETTERS.map((l) => (
              <div
                key={l.ch}
                className={`${l.bg} flex min-w-0 items-end justify-start overflow-hidden rounded-lg px-[1.4vw] pb-[0.16em] text-[min(24vw,30svh)] font-extrabold tracking-[-0.05em] ${l.bg.includes("text-") ? "" : "text-[#1c1c1c]"}`}
                style={{ height: l.h, flexGrow: l.grow, flexBasis: 0 }}
              >
                <span className="block leading-[0.78]">{l.ch}</span>
              </div>
            ))}
          </div>
          <div className="mt-12 grid gap-12 md:grid-cols-12">
            <ul className="grid content-start gap-3 md:col-span-5">
              <li>
                <DemoButton
                  variant="ghost"
                  size="lg"
                  label="entra a la demo"
                  className="!h-auto !gap-3 !rounded-none !bg-transparent !p-0 text-[28px] !font-bold tracking-[-0.03em] !text-field-2 hover:underline"
                />
              </li>
              <li>
                <Link href="/register" className="text-[28px] font-bold tracking-[-0.03em] text-field-2 hover:underline">
                  crea tu cuenta
                </Link>
              </li>
              <li>
                <a href="https://github.com/KrlosEng/snip" className="text-[28px] font-bold tracking-[-0.03em] text-field-2 hover:underline">
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
                <li><a href="#tablero" className="hover:underline">Tablero</a></li>
                <li><a href="#salidas" className="hover:underline">Qué te llevas</a></li>
                <li><a href="#pasos" className="hover:underline">Cómo funciona</a></li>
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
          <div className="mt-16 flex flex-wrap justify-between gap-4 text-[13px] text-[#b9b8b1]">
            <p>Snip · acortador de enlaces con analíticas</p>
            <a href="#titulo" className="hover:text-[#e3e2da]">volver arriba</a>
          </div>
        </footer>
      </ShortenProvider>
    </div>
  );
}

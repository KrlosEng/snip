import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const mono = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: { default: "Snip · Enlaces cortos que te dicen quién hizo clic", template: "%s · Snip" },
  description:
    "Acorta enlaces largos, crea alias propios y códigos QR, y mira cada clic: país, dispositivo, navegador y de dónde vino la visita.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#a6b3bc" },
    { media: "(prefers-color-scheme: dark)", color: "#141414" },
  ],
};

/** Aplica el tema antes de pintar para evitar el parpadeo. */
const themeScript = `(function(){try{var t=localStorage.getItem('snip-theme')||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';document.documentElement.classList.add('js');}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" suppressHydrationWarning className={mono.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link rel="preconnect" href="https://cdn.fontshare.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- Fontshare no está en next/font */}
        <link href="https://api.fontshare.com/v2/css?f[]=pilcrow-rounded@400,500,700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-dvh">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

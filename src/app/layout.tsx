import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const sans = Inter({ variable: "--font-inter", subsets: ["latin"], weight: ["200", "400", "600", "700"] });
const mono = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: { default: "Snip · Enlaces cortos que te dicen quién hizo clic", template: "%s · Snip" },
  description:
    "Acorta enlaces largos, crea alias propios y códigos QR, y mira cada clic: país, dispositivo, navegador y de dónde vino la visita.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#000000" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

/** Aplica el tema antes de pintar para evitar el parpadeo. */
const themeScript = `(function(){try{var t=localStorage.getItem('snip-theme')||'dark';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';document.documentElement.classList.add('js');}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" suppressHydrationWarning className={`${sans.variable} ${mono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

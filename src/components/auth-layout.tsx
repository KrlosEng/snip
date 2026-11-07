import type { ReactNode } from "react";
import { Logo } from "./ui";
import { LiveFeed } from "./live-feed";
import { Reveal } from "./motion";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex flex-col px-5 py-6 sm:px-10">
        <Logo />
        <main className="mx-auto flex w-full max-w-[400px] flex-1 items-center py-10">{children}</main>
      </div>
      <aside className="relative hidden overflow-hidden border-l border-line bg-field-2 text-field-ink lg:flex lg:items-center lg:justify-center lg:p-12">
        <Reveal delay={0.2} className="relative w-full max-w-[440px]">
          <p className="mb-5 max-w-[30ch] font-display text-2xl leading-snug font-semibold tracking-tight">
            Mira llegar cada clic: de dónde, en qué dispositivo y por qué canal.
          </p>
          <LiveFeed />
        </Reveal>
      </aside>
    </div>
  );
}

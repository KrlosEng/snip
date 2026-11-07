import type { ReactNode } from "react";
import { Logo } from "./ui";
import { Constellation } from "./landing/constellation";

/** Acceso: el mismo vacío negro de la landing, con la constelación al lado. */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="void grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex flex-col px-6 py-6 sm:px-10">
        <Logo />
        <main className="mx-auto flex w-full max-w-[400px] flex-1 items-center py-10">{children}</main>
      </div>
      <aside className="relative hidden lg:block" aria-hidden>
        <div className="absolute inset-8">
          <Constellation />
        </div>
      </aside>
    </div>
  );
}

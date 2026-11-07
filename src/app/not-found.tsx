import Link from "next/link";
import { Logo } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex justify-center px-5 py-7">
        <Logo />
      </header>
      <main className="grid flex-1 place-items-center px-5 pb-16">
        <div className="max-w-md text-center">
          <p className="font-mono text-sm text-danger">404</p>
          <h1 className="mt-3 text-[2rem] leading-tight font-bold">No encontramos esta página.</h1>
          <p className="mt-3 text-ink-2">Puede que el enlace esté incompleto o que lo que buscas ya no exista.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/" className="inline-flex h-11 items-center rounded-[10px] bg-brand px-5 font-semibold text-brand-ink transition-colors hover:bg-brand-strong">
              Ir al inicio
            </Link>
            <Link href="/dashboard" className="inline-flex h-11 items-center rounded-[10px] border border-line bg-surface px-5 font-semibold hover:border-line-strong">
              Mi panel
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

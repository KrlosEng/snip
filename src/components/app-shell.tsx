"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { LayoutGrid, Link2, LogOut, Plus, Search, Settings } from "lucide-react";
import { Kbd, Logo, cx } from "./ui";
import { LinkModalProvider, useLinkModal } from "./link-modal";

const NAV = [
  { href: "/dashboard", label: "Panel", icon: LayoutGrid },
  { href: "/links", label: "Mis enlaces", icon: Link2 },
  { href: "/settings", label: "Configuración", icon: Settings },
];

type ShellUser = { name: string; email: string };

export function AppShell({ user, host, children }: { user: ShellUser; host: string; children: ReactNode }) {
  return (
    <LinkModalProvider host={host}>
      <div className="min-h-dvh lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
        <Sidebar user={user} />
        <div className="flex min-w-0 flex-col pb-[calc(env(safe-area-inset-bottom)+4.5rem)] lg:pb-0">
          <Topbar />
          <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 pt-4 pb-10 sm:px-6 lg:px-8 lg:pt-6">{children}</main>
        </div>
        <BottomNav />
      </div>
    </LinkModalProvider>
  );
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Sidebar({ user }: { user: ShellUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const { openCreate } = useLinkModal();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-surface px-4 py-5 lg:flex">
      <Logo href="/dashboard" className="px-2" />
      <button
        onClick={openCreate}
        className="mt-7 flex h-10 items-center justify-between rounded-lg bg-brand px-3 text-sm font-semibold text-brand-ink transition-[background-color,transform] hover:bg-brand-strong active:scale-[0.98]"
      >
        <span className="inline-flex items-center gap-2">
          <Plus className="size-4" aria-hidden /> Crear enlace
        </span>
        <kbd className="rounded bg-brand-ink/15 px-1.5 font-mono text-[11px]">C</kbd>
      </button>
      <nav className="mt-6 grid gap-0.5" aria-label="Principal">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cx(
                "relative flex h-10 items-center gap-3 rounded-lg px-3 text-[14px] font-medium transition-colors",
                active ? "text-brand" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
              )}
            >
              {active && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-0 rounded-lg bg-brand-soft"
                  transition={{ type: "spring", stiffness: 520, damping: 46 }}
                />
              )}
              <Icon className="relative size-[18px]" aria-hidden />
              <span className="relative">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto">
        <div className="flex min-w-0 items-center gap-2.5 rounded-xl border border-line bg-bg/60 p-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-soft font-display text-sm font-bold text-brand">
            {user.name.trim().charAt(0).toUpperCase() || "S"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-ink-3" title={user.email}>
              {user.email}
            </p>
          </div>
          <button
            onClick={logout}
            className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

function Topbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { openCreate } = useLinkModal();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !(e.target as HTMLElement).closest("input, textarea, select")) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!pathname.startsWith("/links")) setQ("");
  }, [pathname]);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur-sm supports-[backdrop-filter]:bg-bg/80">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Logo href="/dashboard" className="lg:hidden" />
        <form
          role="search"
          className="ml-auto flex max-w-md flex-1 items-center lg:ml-0"
          onSubmit={(e) => {
            e.preventDefault();
            router.push(`/links${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`);
          }}
        >
          <label className={cx("group relative hidden w-full items-center", !pathname.startsWith("/links") && "sm:flex")}>
            <span className="sr-only">Buscar enlaces</span>
            <Search className="pointer-events-none absolute left-3 size-4 text-ink-3" aria-hidden />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por alias, destino o nombre"
              className="h-9 w-full rounded-lg border border-line bg-surface pr-10 pl-9 text-sm text-ink outline-none transition-[border-color,box-shadow] placeholder:text-ink-3 hover:border-line-strong focus:border-brand focus:shadow-[0_0_0_3px_var(--ring)]"
            />
            <span className="pointer-events-none absolute right-2.5">
              <Kbd>/</Kbd>
            </span>
          </label>
        </form>
        <button
          onClick={openCreate}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3 text-sm font-semibold text-brand-ink transition-[background-color,transform] hover:bg-brand-strong active:scale-[0.97] lg:hidden"
        >
          <Plus className="size-4" aria-hidden /> Crear
        </button>
      </div>
    </header>
  );
}

function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm lg:hidden"
    >
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cx("relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors", active ? "text-brand" : "text-ink-3")}
          >
            {active && <motion.span layoutId="bottom-active" className="absolute top-0 h-0.5 w-10 rounded-full bg-brand" transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} />}
            <Icon className="size-5" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

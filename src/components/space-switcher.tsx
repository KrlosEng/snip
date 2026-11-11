"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronsUpDown, Plus, User, Users } from "lucide-react";
import { cx } from "./ui";
import { EASE } from "./motion";

export type SpaceRole = "owner" | "editor" | "viewer";
export type Space = { id: string | null; name: string; role: SpaceRole };
export type TeamOption = { id: string; name: string; role: SpaceRole };

const ROLE: Record<SpaceRole, string> = { owner: "Dueño", editor: "Editor", viewer: "Lector" };

/** Selector del espacio activo: personal o uno de tus equipos. */
export function SpaceSwitcher({ space, teams, compact = false }: { space: Space; teams: TeamOption[]; compact?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function pick(id: string | null) {
    if (id === space.id) return setOpen(false);
    setBusy(id ?? "personal");
    const res = await fetch("/api/workspaces", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }).catch(() => null);
    setBusy(null);
    setOpen(false);
    if (!res?.ok) return;
    // El detalle de un enlace puede no existir en el otro espacio.
    if (pathname.startsWith("/links/")) router.push("/links");
    router.refresh();
  }

  const options: (TeamOption | { id: null; name: string; role: SpaceRole })[] = [{ id: null, name: "Personal", role: "owner" }, ...teams];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`Espacio: ${space.name}. Cambiar de espacio`}
        className={cx(
          "flex items-center gap-2 rounded-lg border border-line bg-surface text-left text-sm transition-[border-color,transform] hover:border-line-strong active:scale-[0.98]",
          compact ? "h-9 max-w-[150px] px-2.5" : "h-11 w-full px-3",
        )}
      >
        {space.id ? <Users className="size-4 shrink-0 text-ink-3" aria-hidden /> : <User className="size-4 shrink-0 text-ink-3" aria-hidden />}
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{space.name}</span>
          {!compact && <span className="block truncate text-[11px] text-ink-3">{space.id ? ROLE[space.role] : "Solo tú"}</span>}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-ink-3" aria-hidden />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: EASE }}
            className={cx("absolute z-50 mt-1.5 min-w-[240px] origin-top overflow-hidden rounded-xl border border-line bg-surface shadow-3", compact ? "right-0" : "inset-x-0")}
          >
            <ul aria-label="Espacios" className="max-h-[50dvh] overflow-y-auto p-1">
              {options.map((o) => {
                const on = o.id === space.id;
                return (
                  <li key={o.id ?? "personal"}>
                    <button
                      type="button"
                      aria-current={on ? "true" : undefined}

                      onClick={() => pick(o.id)}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-surface-2"
                    >
                      {o.id ? <Users className="size-4 shrink-0 text-ink-3" aria-hidden /> : <User className="size-4 shrink-0 text-ink-3" aria-hidden />}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{o.name}</span>
                        <span className="block text-[11px] text-ink-3">{o.id ? ROLE[o.role] : "Solo tú"}</span>
                      </span>
                      {busy === (o.id ?? "personal") ? (
                        <span className="size-4 animate-spin rounded-full border-2 border-ink-3 border-t-transparent" aria-hidden />
                      ) : on ? (
                        <Check className="size-4 text-brand" aria-hidden />
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="border-t border-line p-1">
              <Link href="/team" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-brand hover:bg-surface-2">
                <Plus className="size-4" aria-hidden /> Crear o administrar equipos
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

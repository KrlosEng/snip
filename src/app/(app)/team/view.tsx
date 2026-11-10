"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Mail, UserMinus, Users, X } from "lucide-react";
import { Button, Field, Input, cx } from "@/components/ui";
import { EASE, Item, Stagger } from "@/components/motion";
import { useToast } from "@/components/providers";
import { timeAgo } from "@/lib/format";

type Role = "owner" | "editor" | "viewer";
type Team = { id: string; name: string; role: Role; members: number };
type Member = { userId: string; name: string; email: string; role: Role; joinedAt: number };
type Invite = { id: string; email: string; role: Role; expiresAt: number };

const ROLE: Record<Role, string> = { owner: "Dueño", editor: "Editor", viewer: "Lector" };
const ROLE_HINT: Record<Role, string> = {
  owner: "Todo, incluido invitar y borrar el equipo.",
  editor: "Crea, edita y borra enlaces del equipo.",
  viewer: "Solo ve enlaces y estadísticas.",
};

const card = "rounded-xl border border-line bg-surface";
const select = "h-9 rounded-lg border border-line bg-surface px-2 text-[13px] outline-none hover:border-line-strong focus:border-brand";

async function call(url: string, method: string, body?: unknown) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).catch(() => null);
  const data = await res?.json().catch(() => null);
  return { ok: Boolean(res?.ok), error: (data?.error as string | undefined) ?? (res ? "No se pudo completar." : "Sin conexión. Intenta de nuevo."), data };
}

export function TeamView({
  me,
  isDemo,
  space,
  teams,
  members,
  invites,
}: {
  me: string;
  isDemo: boolean;
  space: { id: string | null; name: string; role: Role };
  teams: Team[];
  members: Member[];
  invites: Invite[];
}) {
  const router = useRouter();
  const toast = useToast();
  const isOwner = space.id !== null && space.role === "owner";

  async function open(id: string | null) {
    const r = await call("/api/workspaces", "PUT", { id });
    if (!r.ok) return toast({ tone: "error", title: r.error });
    router.refresh();
  }

  return (
    <Stagger className="grid max-w-3xl gap-6">
      <Item as="header">
        <h1 className="text-[24px] leading-tight font-semibold tracking-[-0.02em]">{space.id ? space.name : "Equipos"}</h1>
        <p className="mt-1 text-ink-2">
          {space.id
            ? `Tu rol: ${ROLE[space.role]}. ${ROLE_HINT[space.role]}`
            : "Comparte enlaces con otras personas. Cada equipo tiene sus propios enlaces, carpetas y estadísticas."}
        </p>
      </Item>

      {space.id && (
        <>
          {isOwner && <RenameCard id={space.id} name={space.name} />}
          <Item as="section" className={card}>
            <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
              <h2 className="text-base font-semibold">Personas</h2>
              <span className="text-xs text-ink-3 tnum">{members.length}</span>
            </div>
            <ul className="divide-y divide-line">
              {members.map((m) => (
                <MemberRow key={m.userId} wsId={space.id!} m={m} me={me} isOwner={isOwner} />
              ))}
            </ul>
          </Item>
          {isOwner && <InviteCard wsId={space.id} invites={invites} disabled={isDemo} />}
          <Item as="section" className={cx(card, "border-danger/30")}>
            <DangerZone wsId={space.id} name={space.name} isOwner={isOwner} me={me} />
          </Item>
        </>
      )}

      <Item as="section" className={card}>
        <div className="border-b border-line px-5 py-4 sm:px-6">
          <h2 className="text-base font-semibold">{space.id ? "Tus espacios" : "Tus equipos"}</h2>
        </div>
        <ul className="divide-y divide-line">
          {space.id && (
            <li className="flex items-center gap-3 px-5 py-3 sm:px-6">
              <span className="min-w-0 flex-1 text-sm font-medium">Personal</span>
              <button type="button" onClick={() => open(null)} className="text-[13px] font-semibold text-brand">
                Abrir
              </button>
            </li>
          )}
          {teams.length === 0 && <li className="px-5 py-4 text-sm text-ink-3 sm:px-6">Aún no tienes equipos.</li>}
          {teams.map((t) => (
            <li key={t.id} className="flex items-center gap-3 px-5 py-3 sm:px-6">
              <Users className="size-4 text-ink-3" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{t.name}</p>
                <p className="text-xs text-ink-3">
                  {ROLE[t.role]} · {t.members} {t.members === 1 ? "persona" : "personas"}
                </p>
              </div>
              {t.id === space.id ? (
                <span className="text-[13px] text-ink-3">Abierto</span>
              ) : (
                <button type="button" onClick={() => open(t.id)} className="text-[13px] font-semibold text-brand">
                  Abrir
                </button>
              )}
            </li>
          ))}
        </ul>
        <CreateTeam disabled={isDemo} />
      </Item>
    </Stagger>
  );
}

function CreateTeam({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError("Ponle un nombre, por ejemplo “Marketing” o “Tienda”.");
    setBusy(true);
    setError(null);
    const r = await call("/api/workspaces", "POST", { name });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setName("");
    toast({ tone: "success", title: `Creaste “${r.data.item.name}”`, body: "Ya estás dentro. Invita a tu equipo abajo." });
    router.refresh();
  }

  if (disabled) {
    return <p className="border-t border-line px-5 py-4 text-[13px] text-ink-2 sm:px-6">La cuenta demo no puede crear equipos. Crea tu cuenta gratis para probarlo.</p>;
  }
  return (
    <form onSubmit={submit} noValidate className="flex flex-wrap items-end gap-3 border-t border-line px-5 py-4 sm:px-6">
      <div className="min-w-[200px] flex-1">
        <Field label="Crear un equipo" htmlFor="team-name" error={error}>
          <Input id="team-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Marketing" maxLength={40} autoComplete="off" invalid={Boolean(error)} />
        </Field>
      </div>
      <Button type="submit" loading={busy}>
        Crear equipo
      </Button>
    </form>
  );
}

function RenameCard({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const toast = useToast();
  const [value, setValue] = useState(name);
  const [busy, setBusy] = useState(false);
  const dirty = value.trim() !== name && value.trim() !== "";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await call(`/api/workspaces/${id}`, "PATCH", { action: "rename", name: value });
    setBusy(false);
    if (!r.ok) return toast({ tone: "error", title: r.error });
    toast({ tone: "success", title: "Nombre actualizado" });
    router.refresh();
  }

  return (
    <Item as="section" className={card}>
      <form onSubmit={save} className="flex flex-wrap items-end gap-3 p-5 sm:p-6">
        <div className="min-w-[200px] flex-1">
          <Field label="Nombre del equipo" htmlFor="rename">
            <Input id="rename" value={value} onChange={(e) => setValue(e.target.value)} maxLength={40} />
          </Field>
        </div>
        <Button type="submit" variant="secondary" loading={busy} disabled={!dirty}>
          Guardar
        </Button>
      </form>
    </Item>
  );
}

function MemberRow({ wsId, m, me, isOwner }: { wsId: string; m: Member; me: string; isOwner: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    if (!confirm) return;
    const t = setTimeout(() => setConfirm(false), 3500);
    return () => clearTimeout(t);
  }, [confirm]);

  async function setRole(role: Role) {
    const r = await call(`/api/workspaces/${wsId}`, "PATCH", { action: "role", userId: m.userId, role });
    if (!r.ok) return toast({ tone: "error", title: r.error });
    toast({ tone: "success", title: `${m.name} ahora es ${ROLE[role].toLowerCase()}` });
    router.refresh();
  }

  async function remove() {
    if (!confirm) return setConfirm(true);
    const r = await call(`/api/workspaces/${wsId}`, "PATCH", { action: "remove", userId: m.userId });
    if (!r.ok) return toast({ tone: "error", title: r.error });
    toast({ tone: "success", title: `Quitaste a ${m.name}`, body: "Los enlaces que creó se quedan en el equipo." });
    router.refresh();
  }

  const editable = isOwner && m.role !== "owner";
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3 sm:px-6">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-soft text-sm font-bold">{m.name.trim().charAt(0).toUpperCase() || "?"}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {m.name} {m.userId === me && <span className="font-normal text-ink-3">(tú)</span>}
        </p>
        <p className="truncate text-xs text-ink-3">
          {m.email} · se unió {timeAgo(m.joinedAt)}
        </p>
      </div>
      {editable ? (
        <>
          <label className="sr-only" htmlFor={`role-${m.userId}`}>
            Rol de {m.name}
          </label>
          <select id={`role-${m.userId}`} value={m.role} onChange={(e) => setRole(e.target.value as Role)} className={select}>
            <option value="editor">Editor</option>
            <option value="viewer">Lector</option>
          </select>
          <button
            type="button"
            onClick={remove}
            className={cx(
              "inline-flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-[13px] font-semibold transition-[background-color,border-color,color,transform] active:scale-[0.97]",
              confirm ? "border-danger bg-danger text-brand-ink" : "border-line text-danger hover:border-danger/50",
            )}
            aria-label={`Quitar a ${m.name}`}
          >
            <UserMinus className="size-4" aria-hidden /> {confirm ? "¿Quitar?" : <span className="sr-only sm:not-sr-only">Quitar</span>}
          </button>
        </>
      ) : (
        <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-ink-2">{ROLE[m.role]}</span>
      )}
    </li>
  );
}

function InviteCard({ wsId, invites, disabled }: { wsId: string; invites: Invite[]; disabled: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("editor");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("Escribe un correo válido.");
    setBusy(true);
    setError(null);
    const r = await call(`/api/workspaces/${wsId}`, "PATCH", { action: "invite", email, role });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    toast({ tone: "success", title: "Invitación enviada", body: `Le llegó un correo a ${email.trim().toLowerCase()}. Vence en 7 días.` });
    setEmail("");
    router.refresh();
  }

  async function cancel(id: string) {
    const r = await call(`/api/workspaces/${wsId}`, "PATCH", { action: "cancel-invite", inviteId: id });
    if (!r.ok) return toast({ tone: "error", title: r.error });
    router.refresh();
  }

  return (
    <Item as="section" className={card}>
      <div className="border-b border-line px-5 py-4 sm:px-6">
        <h2 className="text-base font-semibold">Invitar</h2>
        <p className="mt-1 text-sm text-ink-3">Le llega un correo con un enlace. Solo funciona con ese correo.</p>
      </div>
      <form onSubmit={send} noValidate className="flex flex-wrap items-end gap-3 p-5 sm:p-6">
        <div className="min-w-[200px] flex-[2]">
          <Field label="Correo" htmlFor="inv-email" error={error}>
            <Input id="inv-email" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ana@tuempresa.mx" autoComplete="off" invalid={Boolean(error)} disabled={disabled} />
          </Field>
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="inv-role" className="text-[13px] font-medium">
            Rol
          </label>
          <select id="inv-role" value={role} onChange={(e) => setRole(e.target.value as Role)} className={cx(select, "h-10")} disabled={disabled}>
            <option value="editor">Editor</option>
            <option value="viewer">Lector</option>
          </select>
        </div>
        <Button type="submit" loading={busy} disabled={disabled}>
          <Mail className="size-4" aria-hidden /> Enviar invitación
        </Button>
      </form>
      <AnimatePresence initial={false}>
        {invites.length > 0 && (
          <motion.ul initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: EASE }} className="divide-y divide-line border-t border-line">
            {invites.map((i) => (
              <li key={i.id} className="flex items-center gap-3 px-5 py-3 sm:px-6">
                <Mail className="size-4 text-ink-3" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{i.email}</p>
                  <p className="text-xs text-ink-3">
                    Pendiente · {ROLE[i.role]}
                  </p>
                </div>
                <button type="button" onClick={() => cancel(i.id)} className="grid size-8 place-items-center rounded-lg text-ink-3 hover:bg-surface-2 hover:text-ink" aria-label={`Cancelar invitación a ${i.email}`}>
                  <X className="size-4" />
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </Item>
  );
}

function DangerZone({ wsId, name, isOwner, me }: { wsId: string; name: string; isOwner: boolean; me: string }) {
  const router = useRouter();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!confirm) return;
    const t = setTimeout(() => setConfirm(false), 4000);
    return () => clearTimeout(t);
  }, [confirm]);

  async function go() {
    if (!confirm) return setConfirm(true);
    setBusy(true);
    const r = isOwner ? await call(`/api/workspaces/${wsId}`, "DELETE") : await call(`/api/workspaces/${wsId}`, "PATCH", { action: "remove", userId: me });
    setBusy(false);
    if (!r.ok) return toast({ tone: "error", title: r.error });
    toast({
      tone: "success",
      title: isOwner ? `Borraste “${name}”` : `Saliste de “${name}”`,
      body: isOwner ? "Sus enlaces pasaron a tu espacio personal." : undefined,
    });
    router.push("/team");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
      <div>
        <h2 className="text-base font-semibold text-danger">{isOwner ? "Borrar equipo" : "Salir del equipo"}</h2>
        <p className="mt-1 max-w-[52ch] text-sm text-ink-3">
          {isOwner
            ? "Las personas pierden el acceso. Los enlaces no se borran: pasan a tu espacio personal con sus clics."
            : "Dejas de ver los enlaces del equipo. Los que creaste se quedan en el equipo."}
        </p>
      </div>
      <button
        type="button"
        onClick={go}
        disabled={busy}
        className={cx(
          "inline-flex h-10 items-center rounded-lg border px-4 text-sm font-semibold transition-[background-color,border-color,color,transform] active:scale-[0.97]",
          confirm ? "border-danger bg-danger text-brand-ink" : "border-danger/40 text-danger hover:border-danger",
        )}
      >
        {confirm ? "Pulsa otra vez para confirmar" : isOwner ? "Borrar equipo" : "Salir del equipo"}
      </button>
    </div>
  );
}

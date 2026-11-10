"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { LogOut, Monitor, Moon, Sun } from "lucide-react";
import { Button, Field, Input, cx } from "@/components/ui";
import { EASE, Item, Stagger } from "@/components/motion";
import { useToast } from "@/components/providers";
import { applyTheme, currentTheme, type Theme } from "@/components/theme";
import type { PublicUser } from "@/lib/auth";
import { ApiKeys } from "@/components/api-keys";

type DeleteMethod = "password" | "code" | "email";

export function SettingsView({ user, isDemo, providers, deleteMethod }: { user: PublicUser; isDemo: boolean; providers: string[]; deleteMethod: DeleteMethod }) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState(user.name);
  const [tz, setTz] = useState(user.timezone);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);
  const dirty = name.trim() !== user.name || tz !== user.timezone;

  const zones = useMemo(() => {
    try {
      return Intl.supportedValuesOf("timeZone");
    } catch {
      return [user.timezone];
    }
  }, [user.timezone]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, timezone: tz }),
    }).catch(() => null);
    setSaving(false);
    if (!res?.ok) {
      const data = await res?.json().catch(() => ({}));
      setError({ field: data?.field, message: data?.error ?? "No pudimos guardar los cambios." });
      return;
    }
    toast({ tone: "success", title: "Perfil actualizado" });
    router.refresh();
  }

  return (
    <Stagger className="grid max-w-3xl gap-6">
      <Item as="header">
        <h1 className="text-[24px] leading-tight font-semibold tracking-[-0.02em]">Configuración</h1>
        <p className="mt-1 text-ink-2">Tu perfil, cómo se ve Snip y tu cuenta.</p>
      </Item>

      <Item as="section" className="rounded-xl border border-line bg-surface">
        <form onSubmit={save}>
          <div className="border-b border-line px-5 py-4 sm:px-6">
            <h2 className="text-base font-semibold">Perfil</h2>
          </div>
          <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
            <Field label="Nombre" htmlFor="name" error={error?.field === "name" ? error.message : null}>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" />
            </Field>
            <Field label="Correo" htmlFor="email" hint={providers.length ? `Entras también con ${providers.map((p) => ({ google: "Google", apple: "Apple", github: "GitHub" })[p] ?? p).join(", ")}.` : "No se puede cambiar por ahora."}>
              <Input id="email" value={user.email} readOnly disabled className="opacity-70" />
            </Field>
            <div className="sm:col-span-2">
              <Field
                label="Zona horaria"
                htmlFor="tz"
                error={error?.field === "timezone" ? error.message : null}
                hint="Define cuándo empieza cada día en tus gráficas de clics."
              >
                <select
                  id="tz"
                  value={tz}
                  onChange={(e) => setTz(e.target.value)}
                  className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-[15px] outline-none hover:border-line-strong focus:border-brand"
                >
                  {zones.map((z) => (
                    <option key={z} value={z}>
                      {z.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-line px-5 py-3.5 sm:px-6">
            {error && !error.field && <p className="mr-auto text-[13px] text-danger">{error.message}</p>}
            <motion.span animate={{ opacity: dirty ? 1 : 0 }} className="text-[13px] text-ink-3" aria-hidden={!dirty}>
              Cambios sin guardar
            </motion.span>
            <Button type="submit" loading={saving} disabled={!dirty}>
              Guardar
            </Button>
          </div>
        </form>
      </Item>

      <Item as="section" className="rounded-xl border border-line bg-surface">
        <div className="border-b border-line px-5 py-4 sm:px-6">
          <h2 className="text-base font-semibold">Apariencia</h2>
        </div>
        <div className="p-5 sm:p-6">
          <ThemePicker />
        </div>
      </Item>

      <Item as="section" className="rounded-xl border border-line bg-surface">
        <div className="border-b border-line px-5 py-4 sm:px-6">
          <h2 className="text-base font-semibold">Claves de API</h2>
        </div>
        <ApiKeys isDemo={isDemo} />
      </Item>

      <Item as="section" className="rounded-xl border border-line bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
          <div>
            <h2 className="text-base font-semibold">Cerrar sesión</h2>
            <p className="mt-1 text-sm text-ink-3">Sales de {user.email} en este dispositivo.</p>
          </div>
          <LogoutButton />
        </div>
      </Item>

      <Item as="section" className="rounded-xl border border-danger/30 bg-surface">
        <div className="border-b border-danger/20 px-5 py-4 sm:px-6">
          <h2 className="text-base font-semibold text-danger">Borrar cuenta</h2>
        </div>
        <DeleteAccount isDemo={isDemo} method={deleteMethod} email={user.email} />
      </Item>
    </Stagger>
  );
}

function ThemePicker() {
  const [theme, setTheme] = useState<Theme>("system");
  useEffect(() => setTheme(currentTheme()), []);
  const opts: { v: Theme; label: string; desc: string; icon: typeof Sun }[] = [
    { v: "light", label: "Claro", desc: "Ideal de día", icon: Sun },
    { v: "dark", label: "Oscuro", desc: "Menos brillo de noche", icon: Moon },
    { v: "system", label: "Sistema", desc: "Sigue a tu dispositivo", icon: Monitor },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Tema">
      {opts.map((o) => {
        const on = theme === o.v;
        return (
          <button
            key={o.v}
            role="radio"
            aria-checked={on}
            onClick={() => {
              applyTheme(o.v);
              setTheme(o.v);
            }}
            className={cx(
              "relative flex items-center gap-3 rounded-xl border p-4 text-left transition-[border-color,transform] active:scale-[0.98]",
              on ? "border-brand" : "border-line hover:border-line-strong",
            )}
          >
            {on && <motion.span layoutId="theme-ring" className="absolute inset-0 rounded-xl ring-2 ring-brand/25" transition={{ duration: 0.3, ease: EASE }} />}
            <span className={cx("grid size-9 shrink-0 place-items-center rounded-lg", on ? "bg-brand text-brand-ink" : "bg-surface-2 text-ink-2")}>
              <o.icon className="size-[18px]" aria-hidden />
            </span>
            <span>
              <span className="block text-sm font-semibold">{o.label}</span>
              <span className="block text-xs text-ink-3">{o.desc}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      type="button"
      variant="secondary"
      loading={busy}
      icon={<LogOut className="size-4" aria-hidden />}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
        router.push("/login");
        router.refresh();
      }}
    >
      Cerrar sesión
    </Button>
  );
}

function DeleteAccount({ isDemo, method, email }: { isDemo: boolean; method: DeleteMethod; email: string }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ready = method === "password" ? secret.length > 0 : method === "code" ? /^\d{6}$/.test(secret) && Boolean(codeSentTo) : secret.trim().toLowerCase() === email;

  async function sendCode() {
    setSending(true);
    setError(null);
    const res = await fetch("/api/me/delete-code", { method: "POST" }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setSending(false);
    if (!res?.ok) return setError(data?.error ?? "No pudimos enviar el código.");
    setCodeSentTo(data.email);
  }

  async function remove(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setBusy(true);
    setError(null);
    const body = method === "password" ? { password: secret } : method === "code" ? { code: secret } : { confirmEmail: secret };
    const res = await fetch("/api/me", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    if (!res?.ok) {
      const data = await res?.json().catch(() => ({}));
      setBusy(false);
      setError(data?.error ?? "No se pudo borrar la cuenta.");
      return;
    }
    toast({ tone: "success", title: "Tu cuenta se borró", body: "Gracias por probar Snip." });
    router.push("/");
    router.refresh();
  }

  if (isDemo) {
    return <p className="p-5 text-sm text-ink-2 sm:p-6">Estás en la cuenta demo; no se puede borrar. Crea tu propia cuenta para probar esta opción.</p>;
  }

  return (
    <div className="p-5 sm:p-6">
      <p className="max-w-[60ch] text-sm text-ink-2">
        Se eliminan para siempre tu cuenta, todos tus enlaces y sus clics. Los enlaces dejarán de funcionar de inmediato y no hay forma de recuperarlos.
      </p>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 inline-flex h-9 items-center rounded-lg border border-danger/40 px-4 text-sm font-semibold text-danger transition-colors hover:bg-danger-soft"
        >
          Quiero borrar mi cuenta
        </button>
      )}
      <div className={cx("grid transition-[grid-template-rows] duration-300 ease-out", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        <div className="overflow-hidden">
          <form onSubmit={remove} className="mt-5 grid gap-4 rounded-xl border border-dashed border-danger/40 bg-danger-soft/40 p-4">
            {method === "password" && (
              <Field label="Confirma con tu contraseña" htmlFor="del-pass" error={error}>
                <Input id="del-pass" type="password" autoComplete="current-password" value={secret} onChange={(e) => setSecret(e.target.value)} tabIndex={open ? 0 : -1} invalid={Boolean(error)} />
              </Field>
            )}
            {method === "code" && (
              <div className="grid gap-3">
                <p className="text-sm text-ink-2">Tu cuenta entra con Google, Apple o GitHub, así que confirmamos con un código enviado a tu correo.</p>
                {!codeSentTo ? (
                  <Button type="button" variant="secondary" onClick={sendCode} loading={sending} className="w-fit" tabIndex={open ? 0 : -1}>
                    Enviarme un código
                  </Button>
                ) : (
                  <Field label={`Código enviado a ${codeSentTo}`} htmlFor="del-code" error={error}>
                    <Input id="del-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={secret} onChange={(e) => setSecret(e.target.value.replace(/\D/g, ""))} className="max-w-[12rem] font-mono tracking-[0.3em]" invalid={Boolean(error)} />
                  </Field>
                )}
                {error && !codeSentTo && <p className="text-[13px] text-danger">{error}</p>}
              </div>
            )}
            {method === "email" && (
              <Field label={`Escribe tu correo (${email}) para confirmar`} htmlFor="del-email" error={error}>
                <Input id="del-email" type="email" autoComplete="off" value={secret} onChange={(e) => setSecret(e.target.value)} tabIndex={open ? 0 : -1} invalid={Boolean(error)} />
              </Field>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                tabIndex={open ? 0 : -1}
                onClick={() => {
                  setOpen(false);
                  setSecret("");
                  setError(null);
                }}
              >
                Mejor no
              </Button>
              <Button type="submit" variant="danger" disabled={!ready} loading={busy} tabIndex={open ? 0 : -1}>
                Borrar para siempre
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

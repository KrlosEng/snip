"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Button, Field, Input } from "./ui";
import { DemoButton } from "./demo-button";
import { Item, Stagger } from "./motion";

type Provider = "google" | "apple" | "github";
const LABEL: Record<Provider, string> = { google: "Google", apple: "Apple", github: "GitHub" };

function ProviderIcon({ p }: { p: Provider }) {
  if (p === "google")
    return (
      <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden>
        <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.8Z" />
        <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z" />
        <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z" />
        <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z" />
      </svg>
    );
  if (p === "apple")
    return (
      <svg viewBox="0 0 24 24" className="size-[18px]" fill="currentColor" aria-hidden>
        <path d="M16.4 12.6c0-2.4 2-3.6 2.1-3.6-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-1.9-.9-3.2-.8-1.6 0-3.1 1-4 2.4-1.7 3-.4 7.4 1.2 9.8.8 1.2 1.8 2.5 3 2.4 1.2 0 1.7-.8 3.1-.8 1.5 0 1.9.8 3.2.8 1.3 0 2.2-1.2 3-2.4.9-1.4 1.3-2.7 1.3-2.8 0 0-2.5-1-2.5-4ZM14 5.4c.7-.8 1.1-1.9 1-3-1 0-2.1.7-2.8 1.5-.6.7-1.2 1.8-1 2.9 1.1.1 2.1-.6 2.8-1.4Z" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" fill="currentColor" aria-hidden>
      <path d="M12 .5a11.5 11.5 0 0 0-3.6 22.4c.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.4 11.4 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.9 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.2c0 .3.2.7.8.6A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  );
}

export function AuthForm({ mode, providers, initialError }: { mode: "login" | "register"; providers: Provider[]; initialError?: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [error, setError] = useState<{ field?: string; message: string } | null>(initialError ? { message: initialError } : null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const body: Record<string, string> = Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]));
    if (mode === "register") body.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError({ field: data.field, message: data.error ?? "Algo salió mal. Intenta de nuevo." });
        setBusy(false);
        return;
      }
      if (data.verify) {
        router.push(`/login/verify?e=${encodeURIComponent(data.email ?? "")}`);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError({ message: "Sin conexión. Revisa tu internet e intenta de nuevo." });
      setBusy(false);
    }
  }

  const fieldError = (f: string) => (error?.field === f ? error.message : null);
  const generalError = error && !["name", "email", "password"].includes(error.field ?? "") ? error.message : null;

  return (
    <Stagger className="w-full">
      <Item>
        <h1 className="text-[2rem] leading-tight font-bold">{mode === "login" ? "Qué bueno verte" : "Crea tu cuenta"}</h1>
        <p className="mt-2 text-ink-2">
          {mode === "login" ? "Entra para ver cómo van tus enlaces." : "Enlaces permanentes, alias propios y analíticas de cada clic. Gratis."}
        </p>
      </Item>

      {providers.length > 0 && (
        <Item className="mt-7">
          <div className={providers.length > 1 ? "grid gap-2.5" : ""}>
            {providers.map((p) => (
              /* eslint-disable-next-line @next/next/no-html-link-for-pages -- ruta de API (redirección OAuth), no una página */
              <a
                key={p}
                href={`/api/auth/${p}`}
                className={
                  p === "apple"
                    ? "flex h-11 w-full items-center justify-center gap-2.5 rounded-[10px] bg-ink text-[15px] font-semibold text-bg transition-[opacity,transform] hover:opacity-90 active:scale-[0.98]"
                    : "flex h-11 w-full items-center justify-center gap-2.5 rounded-[10px] border border-line bg-surface text-[15px] font-semibold text-ink transition-[border-color,transform] hover:border-line-strong active:scale-[0.98]"
                }
              >
                <ProviderIcon p={p} /> Continuar con {LABEL[p]}
              </a>
            ))}
          </div>
          <div className="my-6 flex items-center gap-3 text-xs text-ink-3">
            <span className="h-px flex-1 bg-line" /> o con tu correo <span className="h-px flex-1 bg-line" />
          </div>
        </Item>
      )}

      <Item className={providers.length ? "" : "mt-7"}>
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          {mode === "register" && (
            <Field label="Nombre" htmlFor="name" error={fieldError("name")}>
              <Input id="name" name="name" autoComplete="name" required invalid={Boolean(fieldError("name"))} />
            </Field>
          )}
          <Field label="Correo" htmlFor="email" error={fieldError("email")}>
            <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required invalid={Boolean(fieldError("email"))} />
          </Field>
          <Field
            label="Contraseña"
            htmlFor="password"
            error={fieldError("password")}
            hint={mode === "register" ? "Al menos 8 caracteres." : undefined}
          >
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={show ? "text" : "password"}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
                minLength={mode === "register" ? 8 : undefined}
                invalid={Boolean(fieldError("password"))}
                className="pr-11"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute inset-y-0 right-1 my-auto grid size-8 place-items-center rounded-md text-ink-3 transition-colors hover:text-ink"
                aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </Field>

          {generalError && (
            <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2.5 text-[13px] text-danger">
              {generalError}
            </p>
          )}

          <Button type="submit" size="lg" loading={busy} className="mt-1 w-full">
            {mode === "login" ? "Entrar" : "Crear cuenta"}
          </Button>
        </form>
      </Item>

      <Item className="mt-6 grid gap-5">
        <p className="text-center text-sm text-ink-2">
          {mode === "login" ? (
            <>
              ¿No tienes cuenta?{" "}
              <Link href="/register" className="font-semibold text-brand underline-offset-4 hover:underline">
                Créala gratis
              </Link>
            </>
          ) : (
            <>
              ¿Ya tienes cuenta?{" "}
              <Link href="/login" className="font-semibold text-brand underline-offset-4 hover:underline">
                Inicia sesión
              </Link>
            </>
          )}
        </p>
        <div className="rounded-xl border border-dashed border-line-strong p-4 text-center">
          <p className="mb-3 text-[13px] text-ink-2">¿Solo quieres ver cómo funciona?</p>
          <DemoButton size="md" className="w-full" />
        </div>
      </Item>
    </Stagger>
  );
}

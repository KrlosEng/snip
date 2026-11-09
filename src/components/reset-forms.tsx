"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, MailCheck } from "lucide-react";
import { Button, Field, Input } from "./ui";

const h1 = "text-[2.5rem] leading-[1.05] font-normal tracking-[-0.04em]";
const lead = "mt-3 text-[18px] leading-[1.5] font-extralight";

export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/forgot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) }).catch(() => null);
    setBusy(false);
    if (!res) return setError("Sin conexión. Revisa tu internet e intenta de nuevo.");
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return setError(data.error ?? "Revisa el correo e intenta de nuevo.");
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="w-full" role="status">
        <MailCheck className="size-8 text-brand" aria-hidden />
        <h1 className={`mt-5 ${h1}`}>Revisa tu correo</h1>
        <p className={lead}>
          Si hay una cuenta con <span className="font-normal">{email}</span>, te enviamos un enlace para crear una contraseña nueva. Vence en 30 minutos.
        </p>
        <p className="mt-6 text-sm text-ink-3">¿No llega? Revisa la carpeta de spam o vuelve a intentarlo en unos minutos.</p>
        <Link href="/login" className="mt-8 inline-block text-sm font-semibold text-brand">
          Volver a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h1 className={h1}>Recupera tu cuenta</h1>
      <p className={lead}>Escribe tu correo y te enviamos un enlace para crear una contraseña nueva.</p>
      <form onSubmit={submit} noValidate className="mt-7 grid gap-4">
        <Field label="Correo" htmlFor="email" error={error}>
          <Input id="email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Button type="submit" size="lg" loading={busy} className="mt-1 w-full">
          Enviarme el enlace
        </Button>
      </form>
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="font-semibold text-brand underline-offset-4 hover:underline">
          Volver a iniciar sesión
        </Link>
      </p>
    </div>
  );
}

export function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setError("La contraseña necesita al menos 8 caracteres.");
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) }).catch(() => null);
    if (!res?.ok) {
      const data = res ? await res.json().catch(() => ({})) : {};
      setBusy(false);
      return setError(data.error ?? "Sin conexión. Intenta de nuevo.");
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="w-full">
      <h1 className={h1}>Crea una contraseña nueva</h1>
      <p className={lead}>Al guardarla se cierran las sesiones abiertas en otros dispositivos.</p>
      <form onSubmit={submit} noValidate className="mt-7 grid gap-4">
        <Field label="Contraseña nueva" htmlFor="password" error={error} hint="Al menos 8 caracteres.">
          <div className="relative">
            <Input
              id="password"
              type={show ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
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
        <Button type="submit" size="lg" loading={busy} className="mt-1 w-full">
          Guardar y entrar
        </Button>
      </form>
      <p className="mt-6 text-center text-sm">
        <Link href="/forgot" className="font-semibold text-brand underline-offset-4 hover:underline">
          Pedir otro enlace
        </Link>
      </p>
    </div>
  );
}

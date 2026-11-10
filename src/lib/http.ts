import "server-only";
import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { currentScope, WS_COOKIE, type Scope } from "./workspaces";
import { getUser, type PublicUser } from "./auth";
import { DEMO_EMAIL } from "./seed";

export function json(data: unknown, init?: number | ResponseInit) {
  return NextResponse.json(data, typeof init === "number" ? { status: init } : init);
}

export function fail(status: number, error: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error, ...extra }, { status });
}

/** Devuelve el usuario o una respuesta 401 lista para retornar. */
export async function apiUser(): Promise<PublicUser | NextResponse> {
  const user = await getUser();
  return user ?? fail(401, "Inicia sesión para continuar.");
}

/**
 * La cuenta demo es pública (se entra sin contraseña), así que no puede crear,
 * editar ni borrar nada: si pudiera, cualquiera podría cambiar el destino de sus
 * enlaces y usarlos para phishing con nuestro dominio.
 */
export function demoReadOnly(user: PublicUser | null): NextResponse | null {
  if (user?.email !== DEMO_EMAIL) return null;
  return fail(403, "La cuenta demo es de solo lectura. Crea una cuenta gratis para crear y editar tus propios enlaces.", { demo: true });
}

/** Espacio activo (personal o equipo) según la cookie, validando que siga siendo miembro. */
export async function scopeOf(userId: string): Promise<Scope> {
  return currentScope(userId, (await cookies()).get(WS_COOKIE)?.value);
}

export const READ_ONLY_ROLE = "Tu rol en este equipo es de lector: puedes ver los enlaces y sus estadísticas, pero no cambiarlos.";

export function clientIp(h: Headers): string {
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    h.get("cf-connecting-ip") ||
    "127.0.0.1"
  );
}

/** Origen público de la app (para armar los enlaces cortos). */
export async function getOrigin(): Promise<string> {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function ownHosts(): Promise<string[]> {
  const origin = await getOrigin();
  const hosts = [new URL(origin).host];
  if (process.env.SHORT_DOMAIN) hosts.push(process.env.SHORT_DOMAIN);
  return hosts;
}

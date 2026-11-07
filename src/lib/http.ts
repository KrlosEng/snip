import "server-only";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getUser, type PublicUser } from "./auth";

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

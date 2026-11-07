import "server-only";
import { createRemoteJWKSet, importPKCS8, jwtVerify, SignJWT } from "jose";

/**
 * Inicio de sesión con proveedores externos (OAuth / OpenID Connect).
 * Cada botón aparece solo si sus variables de entorno están configuradas.
 */

export type Provider = "google" | "apple" | "github";
export const PROVIDERS: Provider[] = ["google", "apple", "github"];
export const PROVIDER_LABEL: Record<Provider, string> = { google: "Google", apple: "Apple", github: "GitHub" };

export type OAuthProfile = { id: string; email: string; emailVerified: boolean; name: string | null };

const env = (k: string) => process.env[k] || "";

export function providerEnabled(p: Provider): boolean {
  if (p === "google") return Boolean(env("GOOGLE_CLIENT_ID") && env("GOOGLE_CLIENT_SECRET"));
  if (p === "github") return Boolean(env("GITHUB_CLIENT_ID") && env("GITHUB_CLIENT_SECRET"));
  return Boolean(env("APPLE_CLIENT_ID") && env("APPLE_TEAM_ID") && env("APPLE_KEY_ID") && env("APPLE_PRIVATE_KEY"));
}

export function enabledProviders(): Provider[] {
  return PROVIDERS.filter(providerEnabled);
}

export function isProvider(p: string): p is Provider {
  return (PROVIDERS as string[]).includes(p);
}

const callback = (origin: string, p: Provider) => `${origin}/api/auth/${p}/callback`;

export function authorizationUrl(p: Provider, origin: string, state: string): string {
  if (p === "google") {
    return `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
      client_id: env("GOOGLE_CLIENT_ID"),
      redirect_uri: callback(origin, p),
      response_type: "code",
      scope: "openid email profile",
      state,
      prompt: "select_account",
    })}`;
  }
  if (p === "github") {
    return `https://github.com/login/oauth/authorize?${new URLSearchParams({
      client_id: env("GITHUB_CLIENT_ID"),
      redirect_uri: callback(origin, p),
      scope: "read:user user:email",
      state,
      allow_signup: "true",
    })}`;
  }
  return `https://appleid.apple.com/auth/authorize?${new URLSearchParams({
    client_id: env("APPLE_CLIENT_ID"),
    redirect_uri: callback(origin, p),
    response_type: "code",
    response_mode: "form_post",
    scope: "name email",
    state,
  })}`;
}

async function appleClientSecret(): Promise<string> {
  const key = await importPKCS8(env("APPLE_PRIVATE_KEY").replace(/\\n/g, "\n"), "ES256");
  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: env("APPLE_KEY_ID") })
    .setIssuer(env("APPLE_TEAM_ID"))
    .setSubject(env("APPLE_CLIENT_ID"))
    .setAudience("https://appleid.apple.com")
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(key);
}

const appleJwks = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

/** Cambia el código de autorización por el perfil del usuario. */
export async function fetchProfile(p: Provider, origin: string, params: URLSearchParams): Promise<OAuthProfile | null> {
  const code = params.get("code");
  if (!code) return null;

  if (p === "google") {
    const tok = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: env("GOOGLE_CLIENT_ID"),
        client_secret: env("GOOGLE_CLIENT_SECRET"),
        redirect_uri: callback(origin, p),
        grant_type: "authorization_code",
      }),
    });
    if (!tok.ok) return null;
    const { access_token } = (await tok.json()) as { access_token: string };
    const info = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${access_token}` } });
    if (!info.ok) return null;
    const u = (await info.json()) as { sub: string; email: string; email_verified: boolean; name?: string };
    return { id: u.sub, email: u.email, emailVerified: Boolean(u.email_verified), name: u.name ?? null };
  }

  if (p === "github") {
    const tok = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: env("GITHUB_CLIENT_ID"), client_secret: env("GITHUB_CLIENT_SECRET"), code, redirect_uri: callback(origin, p) }),
    });
    if (!tok.ok) return null;
    const { access_token } = (await tok.json()) as { access_token?: string };
    if (!access_token) return null;
    const headers = { Authorization: `Bearer ${access_token}`, "User-Agent": "Snip", Accept: "application/vnd.github+json" };
    const [userRes, emailsRes] = await Promise.all([fetch("https://api.github.com/user", { headers }), fetch("https://api.github.com/user/emails", { headers })]);
    if (!userRes.ok || !emailsRes.ok) return null;
    const user = (await userRes.json()) as { id: number; name: string | null; login: string };
    const emails = (await emailsRes.json()) as { email: string; primary: boolean; verified: boolean }[];
    const primary = emails.find((e) => e.primary && e.verified) ?? emails.find((e) => e.verified);
    if (!primary) return null;
    return { id: String(user.id), email: primary.email, emailVerified: true, name: user.name ?? user.login };
  }

  // Apple: el código se cambia por un id_token firmado que verificamos con sus llaves públicas.
  const tok = await fetch("https://appleid.apple.com/auth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env("APPLE_CLIENT_ID"),
      client_secret: await appleClientSecret(),
      code,
      grant_type: "authorization_code",
      redirect_uri: callback(origin, p),
    }),
  });
  if (!tok.ok) return null;
  const { id_token } = (await tok.json()) as { id_token?: string };
  if (!id_token) return null;
  const { payload } = await jwtVerify(id_token, appleJwks, { issuer: "https://appleid.apple.com", audience: env("APPLE_CLIENT_ID") });
  const email = typeof payload.email === "string" ? payload.email : null;
  if (!email || !payload.sub) return null;
  // Apple solo manda el nombre la primera vez, en el campo "user" del formulario.
  let name: string | null = null;
  try {
    const u = JSON.parse(params.get("user") ?? "null") as { name?: { firstName?: string; lastName?: string } } | null;
    name = [u?.name?.firstName, u?.name?.lastName].filter(Boolean).join(" ") || null;
  } catch {
    /* sin nombre */
  }
  return { id: payload.sub, email, emailVerified: payload.email_verified === true || payload.email_verified === "true", name };
}

import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { get, run, type UserRow } from "@/lib/db";
import { getOrigin } from "@/lib/http";
import { uuid } from "@/lib/ids";
import { fetchProfile, isProvider, providerEnabled, type Provider } from "@/lib/oauth";
import { completeLogin, trustDevice, deviceLabel } from "@/lib/verify";
import { createSession } from "@/lib/auth";

async function handle(req: NextRequest, provider: string, params: URLSearchParams) {
  const origin = await getOrigin();
  const back = (e = "oauth") => NextResponse.redirect(`${origin}/login?error=${e}`, 303);
  if (!isProvider(provider) || !providerEnabled(provider)) return back();

  const jar = await cookies();
  const saved = jar.get("snip_oauth_state")?.value;
  jar.delete("snip_oauth_state");
  if (params.get("error")) return back("cancelled");
  if (!saved || saved !== `${provider}:${params.get("state")}`) return back();

  let profile;
  try {
    profile = await fetchProfile(provider as Provider, origin, params);
  } catch (e) {
    console.error("OAuth", provider, e);
  }
  if (!profile) return back();
  const email = profile.email.toLowerCase();

  // 1) ¿Ya tiene esta cuenta vinculada?
  let user = await get<UserRow>(
    "SELECT u.* FROM accounts a JOIN users u ON u.id = a.user_id WHERE a.provider = ? AND a.provider_id = ?",
    provider,
    profile.id,
  );
  // 2) ¿Existe alguien con ese correo verificado? Vinculamos.
  if (!user) {
    if (!profile.emailVerified) return back("unverified");
    user = await get<UserRow>("SELECT * FROM users WHERE email = ?", email);
    if (user) {
      await run("INSERT INTO accounts (provider, provider_id, user_id, created_at) VALUES (?, ?, ?, ?)", provider, profile.id, user.id, Date.now());
    }
  }
  // 3) Usuario nuevo: se crea y este dispositivo queda de confianza.
  if (!user) {
    const id = uuid();
    await run(
      "INSERT INTO users (id, email, name, created_at) VALUES (?, ?, ?, ?)",
      id, email, profile.name?.trim() || email.split("@")[0], Date.now(),
    );
    await run("INSERT INTO accounts (provider, provider_id, user_id, created_at) VALUES (?, ?, ?, ?)", provider, profile.id, id, Date.now());
    await trustDevice(id, deviceLabel(req.headers));
    await createSession(id);
    return NextResponse.redirect(`${origin}/dashboard`, 303);
  }

  const result = await completeLogin(user, req.headers);
  if ("error" in result) return back("code");
  return NextResponse.redirect(`${origin}${result.verify ? "/login/verify" : "/dashboard"}`, 303);
}

export async function GET(req: NextRequest, ctx: RouteContext<"/api/auth/[provider]/callback">) {
  return handle(req, (await ctx.params).provider, req.nextUrl.searchParams);
}

/** Apple responde con form_post. */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/auth/[provider]/callback">) {
  const form = await req.formData();
  const params = new URLSearchParams();
  for (const [k, v] of form.entries()) if (typeof v === "string") params.set(k, v);
  return handle(req, (await ctx.params).provider, params);
}

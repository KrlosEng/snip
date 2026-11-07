import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getOrigin } from "@/lib/http";
import { randomToken } from "@/lib/ids";
import { authorizationUrl, isProvider, providerEnabled } from "@/lib/oauth";

export async function GET(_req: Request, ctx: RouteContext<"/api/auth/[provider]">) {
  const { provider } = await ctx.params;
  const origin = await getOrigin();
  if (!isProvider(provider) || !providerEnabled(provider)) return NextResponse.redirect(`${origin}/login?error=oauth`);
  const state = randomToken(16);
  // Apple vuelve con un POST entre sitios: la cookie necesita SameSite=None.
  (await cookies()).set("snip_oauth_state", `${provider}:${state}`, {
    httpOnly: true,
    sameSite: provider === "apple" ? "none" : "lax",
    secure: provider === "apple" || process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  });
  return NextResponse.redirect(authorizationUrl(provider, origin, state));
}

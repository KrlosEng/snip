import { cookies } from "next/headers";
import { z } from "zod";
import { createSession } from "@/lib/auth";
import { clientIp, fail, json } from "@/lib/http";
import { rateLimit } from "@/lib/cache";
import { CHALLENGE_COOKIE, checkChallenge, deviceLabel, trustDevice } from "@/lib/verify";

const schema = z.object({ code: z.string().regex(/^\d{6}$/, "Escribe los 6 dígitos del código."), trust: z.boolean().optional() });

export async function POST(req: Request) {
  const limit = await rateLimit(`verify:${clientIp(req.headers)}`, 30, 900);
  if (!limit.ok) return fail(429, "Demasiados intentos. Espera unos minutos.");
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail(400, parsed.error.issues[0].message);
  const jar = await cookies();
  const res = await checkChallenge(jar.get(CHALLENGE_COOKIE)?.value, parsed.data.code, "login");
  if (!res.ok) {
    if (res.expired) jar.delete(CHALLENGE_COOKIE);
    return fail(400, res.error, { expired: Boolean(res.expired) });
  }
  jar.delete(CHALLENGE_COOKIE);
  if (parsed.data.trust !== false) await trustDevice(res.userId, deviceLabel(req.headers));
  await createSession(res.userId);
  return json({ ok: true });
}

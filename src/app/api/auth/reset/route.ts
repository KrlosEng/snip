import { z } from "zod";
import { createSession } from "@/lib/auth";
import { rateLimit } from "@/lib/cache";
import { clientIp, fail, json } from "@/lib/http";
import { completePasswordReset } from "@/lib/password-reset";
import { deviceLabel, trustDevice } from "@/lib/verify";

const schema = z.object({
  token: z.string().min(20).max(200),
  password: z.string().min(8, "La contraseña necesita al menos 8 caracteres.").max(200),
});

export async function POST(req: Request) {
  const limit = await rateLimit(`reset-use:${clientIp(req.headers)}`, 20, 900);
  if (!limit.ok) return fail(429, "Demasiados intentos. Espera unos minutos.");
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail(400, parsed.error.issues[0].message, { field: "password" });
  const result = await completePasswordReset(parsed.data.token, parsed.data.password);
  if (!result.ok) return fail(400, result.error);
  // Quien abrió el enlace demostró que controla el correo: este dispositivo queda de confianza.
  await trustDevice(result.userId, deviceLabel(req.headers));
  await createSession(result.userId);
  return json({ ok: true });
}

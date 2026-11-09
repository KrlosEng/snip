import { z } from "zod";
import { clientIp, fail, getOrigin, json } from "@/lib/http";
import { requestPasswordReset } from "@/lib/password-reset";

const schema = z.object({ email: z.string().trim().email("Ese correo no parece válido.") });

/** Siempre responde igual, exista o no la cuenta, para no revelar qué correos están registrados. */
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail(400, parsed.error.issues[0].message, { field: "email" });
  try {
    await requestPasswordReset(parsed.data.email, await getOrigin(), clientIp(req.headers));
  } catch (e) {
    console.error("forgot: no se pudo procesar la solicitud", e);
  }
  return json({ ok: true });
}

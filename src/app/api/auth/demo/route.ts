import { ensureDemoData } from "@/lib/seed";
import { createSession } from "@/lib/auth";
import { fail, json } from "@/lib/http";

export const maxDuration = 60;

export async function POST() {
  try {
    const id = await ensureDemoData();
    await createSession(id);
    return json({ ok: true });
  } catch (e) {
    console.error("No se pudo preparar la demo", e);
    return fail(500, "No pudimos preparar la demo. Intenta de nuevo.");
  }
}

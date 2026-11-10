import { z } from "zod";
import { apiUser, demoReadOnly, fail, json } from "@/lib/http";
import { rateLimit } from "@/lib/cache";
import { createKey, listKeys } from "@/lib/api-keys";

export async function GET() {
  const user = await apiUser();
  if (user instanceof Response) return user;
  return json({ items: await listKeys(user.id) });
}

const schema = z.object({ name: z.string().trim().min(1, "Ponle un nombre a la clave para reconocerla.").max(40, "Usa un nombre de hasta 40 caracteres.") });

/** Crea una clave. La respuesta trae la clave completa una sola vez. */
export async function POST(req: Request) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const blocked = demoReadOnly(user);
  if (blocked) return blocked;
  const limit = await rateLimit(`keys:${user.id}`, 10, 3600);
  if (!limit.ok) return fail(429, "Creaste muchas claves en poco tiempo. Intenta en un rato.");
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail(400, parsed.error.issues[0].message, { field: "name" });
  const r = await createKey(user.id, parsed.data.name);
  if (!r.ok) return fail(400, r.error, { field: "name" });
  return json({ key: r.key, item: r.item }, { status: 201, headers: { "Cache-Control": "no-store" } });
}

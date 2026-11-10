import { z } from "zod";
import { rateLimit } from "@/lib/cache";
import { apiUser, demoReadOnly, fail, json, ownHosts, READ_ONLY_ROLE, scopeOf } from "@/lib/http";
import { canEdit } from "@/lib/workspaces";
import { ImportError, importLinks } from "@/lib/links-import";

const schema = z.object({ csv: z.string().min(1, "El archivo está vacío.").max(300_000, "El archivo es demasiado grande (máximo 300 KB).") });

export async function POST(req: Request) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const blocked = demoReadOnly(user);
  if (blocked) return blocked;
  const limit = await rateLimit(`import:u:${user.id}`, 5, 3600);
  if (!limit.ok) return fail(429, `Ya importaste 5 archivos en la última hora. Intenta de nuevo en ${Math.ceil(limit.resetIn / 60)} min.`);

  const scope = await scopeOf(user.id);
  if (!canEdit(scope.role)) return fail(403, READ_ONLY_ROLE);
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail(400, parsed.error.issues[0].message);
  try {
    return json(await importLinks(user.id, parsed.data.csv, await ownHosts(), scope.workspaceId));
  } catch (e) {
    if (e instanceof ImportError) return fail(400, e.message);
    console.error("import: falló", e);
    return fail(500, "No pudimos leer el archivo. Revisa que sea un CSV.");
  }
}

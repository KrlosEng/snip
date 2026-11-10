import { apiUser, json, scopeOf } from "@/lib/http";
import { listFacets } from "@/lib/links";

/** Carpetas y etiquetas que ya se usan en el espacio activo (para sugerirlas en el formulario). */
export async function GET() {
  const user = await apiUser();
  if (user instanceof Response) return user;
  return json(await listFacets(await scopeOf(user.id)));
}

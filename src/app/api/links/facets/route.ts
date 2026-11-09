import { apiUser, json } from "@/lib/http";
import { listFacets } from "@/lib/links";

/** Carpetas y etiquetas que ya usa la persona (para sugerirlas en el formulario). */
export async function GET() {
  const user = await apiUser();
  if (user instanceof Response) return user;
  return json(await listFacets(user.id));
}

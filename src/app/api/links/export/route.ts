import { all, type LinkRow } from "@/lib/db";
import { apiUser, getOrigin } from "@/lib/http";
import { toCsv } from "@/lib/csv";
import { withTags } from "@/lib/links";

const STATUS = { active: "activo", paused: "pausado", expired: "vencido", scheduled: "programado" } as const;

/** Todos los enlaces de la persona en CSV (se puede volver a importar tal cual). */
export async function GET() {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const origin = await getOrigin();
  const links = await withTags(await all<LinkRow>("SELECT * FROM links WHERE user_id = ? ORDER BY created_at DESC", user.id));
  const iso = (ms: number | null) => (ms ? new Date(ms).toISOString() : "");
  const rows: unknown[][] = [["alias", "enlace_corto", "destino", "nombre", "carpeta", "etiquetas", "estado", "clics", "creado_utc", "vence_utc"]];
  for (const l of links) {
    rows.push([l.slug, `${origin}/${l.slug}`, l.url, l.title, l.folder, l.tags.join(", "), STATUS[l.status], l.clicks, iso(l.createdAt), iso(l.expiresAt)]);
  }
  const day = new Date().toISOString().slice(0, 10);
  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="snip-enlaces-${day}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

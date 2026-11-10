import "server-only";
import { parseCsv } from "./csv";
import { createLink, isUnsafe, slugExists } from "./links";
import { aliasSchema, checkDestination, cleanTags, folderSchema } from "./validation";

export const IMPORT_MAX_ROWS = 500;

type Col = "url" | "alias" | "title" | "folder" | "tags";

/** Nombres de columna aceptados (sin acentos, en minúsculas). */
const HEADERS: Record<string, Col> = {
  url: "url",
  destino: "url",
  enlace: "url",
  link: "url",
  destination_url: "url",
  enlace_largo: "url",
  alias: "alias",
  slug: "alias",
  nombre: "title",
  titulo: "title",
  title: "title",
  name: "title",
  carpeta: "folder",
  folder: "folder",
  etiquetas: "tags",
  tags: "tags",
};

const norm = (h: string) =>
  h
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

export type ImportResult = { created: number; total: number; errors: { row: number; error: string }[] };

export class ImportError extends Error {}

/**
 * Crea enlaces a partir de un CSV. Revisa cada fila igual que el formulario
 * (destino válido, alias libre, sitio seguro) y reporta las que no se pudieron crear.
 */
export async function importLinks(userId: string, csv: string, ownHosts: string[], workspaceId: string | null = null): Promise<ImportResult> {
  const rows = parseCsv(csv);
  if (!rows.length) throw new ImportError("El archivo está vacío.");

  const head = rows[0].map((h) => HEADERS[norm(h)]);
  const hasHeader = head.includes("url");
  // Sin encabezado: url, alias, nombre, carpeta, etiquetas (en ese orden).
  const order: (Col | undefined)[] = hasHeader ? head : ["url", "alias", "title", "folder", "tags"];
  const data = hasHeader ? rows.slice(1) : rows;
  if (!data.length) throw new ImportError("El archivo solo tiene encabezados.");
  if (data.length > IMPORT_MAX_ROWS) throw new ImportError(`Puedes importar hasta ${IMPORT_MAX_ROWS} enlaces por archivo; este tiene ${data.length}.`);

  const result: ImportResult = { created: 0, total: data.length, errors: [] };
  const seen = new Set<string>();

  for (let i = 0; i < data.length; i++) {
    const rowNum = i + (hasHeader ? 2 : 1);
    const get = (c: Col) => {
      const idx = order.indexOf(c);
      return idx === -1 ? "" : (data[i][idx] ?? "").trim();
    };
    const fail = (error: string) => result.errors.push({ row: rowNum, error });

    const raw = get("url");
    if (!raw) {
      fail("Falta el enlace de destino.");
      continue;
    }
    const dest = checkDestination(raw, ownHosts);
    if (!dest.ok) {
      fail(dest.error);
      continue;
    }

    const alias = get("alias") || null;
    if (alias) {
      const a = aliasSchema.safeParse(alias);
      if (!a.success) {
        fail(`Alias “${alias}”: ${a.error.issues[0].message}`);
        continue;
      }
      if (seen.has(alias.toLowerCase())) {
        fail(`El alias “${alias}” se repite en el archivo.`);
        continue;
      }
      if (await slugExists(alias)) {
        fail(`El alias “${alias}” ya está ocupado.`);
        continue;
      }
      seen.add(alias.toLowerCase());
    }

    const folder = folderSchema.safeParse(get("folder") || null);
    if (!folder.success) {
      fail(folder.error.issues[0].message);
      continue;
    }

    if (await isUnsafe(dest.url)) {
      fail("Google marcó ese sitio como peligroso.");
      continue;
    }

    try {
      await createLink({
        userId,
        workspaceId,
        url: dest.url,
        slug: alias,
        expiresAt: null,
        title: get("title").slice(0, 200) || null,
        folder: folder.data,
        tags: cleanTags(get("tags").split(/[,;|]/)),
      });
      result.created++;
    } catch {
      fail(alias ? `El alias “${alias}” acaba de ser ocupado.` : "No se pudo crear este enlace.");
    }
  }
  return result;
}

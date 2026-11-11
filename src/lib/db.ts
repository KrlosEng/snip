import "server-only";
import { neon } from "@neondatabase/serverless";

/**
 * Capa de datos con dos motores y el mismo SQL:
 * - PostgreSQL (Neon) cuando existe DATABASE_URL — producción en Vercel.
 * - SQLite embebido en Node (node:sqlite) en local, sin configurar nada.
 * Las consultas se escriben con `?`; para Postgres se traducen a `$1, $2…`.
 * Para que el SQL sirva en ambos: conteos con CAST(... AS INTEGER),
 * búsquedas con LOWER(...) LIKE y fechas como milisegundos (número).
 */

type Param = string | number | null;

const PG_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
export const dialect: "pg" | "sqlite" = PG_URL ? "pg" : "sqlite";

const SCHEMA_PG = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT,
  google_id TEXT UNIQUE,
  timezone TEXT NOT NULL DEFAULT 'America/Mexico_City',
  created_at DOUBLE PRECISION NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at DOUBLE PRECISION NOT NULL
);
CREATE TABLE IF NOT EXISTS links (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  destination_url TEXT NOT NULL,
  title TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  expires_at DOUBLE PRECISION,
  click_count INTEGER NOT NULL DEFAULT 0,
  created_at DOUBLE PRECISION NOT NULL,
  updated_at DOUBLE PRECISION NOT NULL
);
CREATE INDEX IF NOT EXISTS links_user_idx ON links(user_id, created_at);
CREATE TABLE IF NOT EXISTS clicks (
  id SERIAL PRIMARY KEY,
  link_id TEXT NOT NULL REFERENCES links(id) ON DELETE CASCADE,
  clicked_at DOUBLE PRECISION NOT NULL,
  country TEXT,
  city TEXT,
  device TEXT,
  browser TEXT,
  os TEXT,
  referrer TEXT,
  ip_hash TEXT,
  is_bot INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS clicks_link_time_idx ON clicks(link_id, clicked_at);
CREATE TABLE IF NOT EXISTS accounts (
  provider TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at DOUBLE PRECISION NOT NULL,
  PRIMARY KEY (provider, provider_id)
);
CREATE INDEX IF NOT EXISTS accounts_user_idx ON accounts(user_id);
CREATE TABLE IF NOT EXISTS trusted_devices (
  token_hash TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT,
  created_at DOUBLE PRECISION NOT NULL,
  PRIMARY KEY (token_hash, user_id)
);
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  window_start DOUBLE PRECISION NOT NULL,
  count INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS challenges (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at DOUBLE PRECISION NOT NULL,
  created_at DOUBLE PRECISION NOT NULL
);
`;

/**
 * Migraciones versionadas. Cada una se aplica una sola vez y queda anotada en
 * `schema_migrations`. Son idempotentes (IF NOT EXISTS) porque en Vercel pueden
 * arrancar varias instancias a la vez. Para cambiar el esquema: agrega una
 * migración nueva al final; nunca edites una que ya se aplicó en producción.
 */
export const MIGRATIONS: { version: number; name: string; sql: string }[] = [
  { version: 1, name: "esquema inicial", sql: SCHEMA_PG },
  {
    version: 2,
    name: "recuperación de contraseña e índice de sesiones",
    sql: `
CREATE TABLE IF NOT EXISTS password_resets (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at DOUBLE PRECISION NOT NULL,
  used_at DOUBLE PRECISION,
  created_at DOUBLE PRECISION NOT NULL
);
CREATE INDEX IF NOT EXISTS password_resets_user_idx ON password_resets(user_id);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
`,
  },
  {
    version: 3,
    name: "carpetas y etiquetas",
    sql: `
ALTER TABLE links ADD COLUMN IF NOT EXISTS folder TEXT;
CREATE INDEX IF NOT EXISTS links_user_folder_idx ON links(user_id, folder);
CREATE TABLE IF NOT EXISTS link_tags (
  link_id TEXT NOT NULL REFERENCES links(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  PRIMARY KEY (link_id, tag)
);
CREATE INDEX IF NOT EXISTS link_tags_user_tag_idx ON link_tags(user_id, tag);
`,
  },
  {
    version: 4,
    name: "controles de acceso",
    sql: `
ALTER TABLE links ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE links ADD COLUMN IF NOT EXISTS starts_at DOUBLE PRECISION;
ALTER TABLE links ADD COLUMN IF NOT EXISTS max_clicks INTEGER;
ALTER TABLE links ADD COLUMN IF NOT EXISTS notify_at INTEGER;
ALTER TABLE links ADD COLUMN IF NOT EXISTS notified_at DOUBLE PRECISION;
`,
  },
  {
    version: 5,
    name: "claves de API",
    sql: `
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  created_at DOUBLE PRECISION NOT NULL,
  last_used_at DOUBLE PRECISION,
  revoked_at DOUBLE PRECISION
);
CREATE INDEX IF NOT EXISTS api_keys_user_idx ON api_keys(user_id);
`,
  },
  {
    version: 6,
    name: "equipos y roles",
    sql: `
CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at DOUBLE PRECISION NOT NULL
);
CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  created_at DOUBLE PRECISION NOT NULL,
  PRIMARY KEY (workspace_id, user_id)
);
CREATE INDEX IF NOT EXISTS workspace_members_user_idx ON workspace_members(user_id);
CREATE TABLE IF NOT EXISTS workspace_invites (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  invited_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at DOUBLE PRECISION NOT NULL,
  accepted_at DOUBLE PRECISION,
  created_at DOUBLE PRECISION NOT NULL
);
CREATE INDEX IF NOT EXISTS workspace_invites_ws_idx ON workspace_invites(workspace_id);
ALTER TABLE links ADD COLUMN IF NOT EXISTS workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS links_workspace_idx ON links(workspace_id, created_at);
`,
  },
  {
    version: 7,
    name: "planes",
    sql: `
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_until DOUBLE PRECISION;
CREATE INDEX IF NOT EXISTS links_user_created_idx ON links(user_id, created_at);
`,
  },
];

/** Traduce el SQL de Postgres al dialecto de SQLite. */
export function toSqlite(sql: string): string {
  return sql
    .replace(/DOUBLE PRECISION/g, "INTEGER")
    .replace(/id SERIAL PRIMARY KEY/g, "id INTEGER PRIMARY KEY AUTOINCREMENT")
    .replace(/ADD COLUMN IF NOT EXISTS/g, "ADD COLUMN");
}

/* ------------------------------ Motores ------------------------------ */

type Engine = {
  all(sql: string, params: Param[]): Promise<Record<string, unknown>[]>;
  exec(sql: string): Promise<void>;
};

function pgEngine(): Engine {
  const sql = neon(PG_URL);
  const toPg = (q: string) => {
    let i = 0;
    return q.replace(/\?/g, () => `$${++i}`);
  };
  return {
    all: async (q, params) => (await sql.query(toPg(q), params)) as Record<string, unknown>[],
    exec: async (q) => {
      for (const stmt of q.split(";").map((s) => s.trim()).filter(Boolean)) await sql.query(stmt);
    },
  };
}

async function sqliteEngine(): Promise<Engine> {
  const [{ DatabaseSync }, fs, path] = await Promise.all([import("node:sqlite"), import("node:fs"), import("node:path")]);
  const file = process.env.DATABASE_FILE ?? path.join(process.cwd(), "data", "snip.db");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const d = new DatabaseSync(file);
  d.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 3000;");
  return {
    all: async (q, params) => d.prepare(q).all(...params) as Record<string, unknown>[],
    exec: async (q) => void d.exec(q),
  };
}

async function migrate(e: Engine): Promise<void> {
  const ddl = (sql: string) => (dialect === "pg" ? sql : toSqlite(sql));
  await e.exec(ddl("CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at DOUBLE PRECISION NOT NULL)"));
  const done = new Set((await e.all("SELECT version FROM schema_migrations", [])).map((r) => Number(r.version)));
  for (const m of MIGRATIONS) {
    if (done.has(m.version)) continue;
    await e.exec(ddl(m.sql));
    await e.all("INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?) ON CONFLICT (version) DO NOTHING", [m.version, m.name, Date.now()]);
  }
}

const g = globalThis as unknown as { __snipEngine?: Promise<Engine> };

function engine(): Promise<Engine> {
  g.__snipEngine ??= (async () => {
    const e = dialect === "pg" ? pgEngine() : await sqliteEngine();
    await migrate(e);
    return e;
  })().catch((err) => {
    g.__snipEngine = undefined;
    throw err;
  });
  return g.__snipEngine;
}

/* ------------------------------ API ------------------------------ */

export async function all<T>(sql: string, ...params: Param[]): Promise<T[]> {
  return (await (await engine()).all(sql, params)) as T[];
}

export async function get<T>(sql: string, ...params: Param[]): Promise<T | undefined> {
  return (await all<T>(sql, ...params))[0];
}

export async function run(sql: string, ...params: Param[]): Promise<void> {
  await (await engine()).all(sql, params);
}

/** Inserta muchas filas en lotes (para la demo). */
export async function insertMany(table: string, cols: string[], rows: Param[][], chunk = 400): Promise<void> {
  for (let i = 0; i < rows.length; i += chunk) {
    const part = rows.slice(i, i + chunk);
    const values = part.map(() => `(${cols.map(() => "?").join(", ")})`).join(", ");
    await run(`INSERT INTO ${table} (${cols.join(", ")}) VALUES ${values}`, ...part.flat());
  }
}

/* ------------------------------ Tipos ------------------------------ */

export type UserRow = {
  id: string;
  email: string;
  name: string;
  password_hash: string | null;
  google_id: string | null;
  timezone: string;
  created_at: number;
};

export type LinkRow = {
  id: string;
  user_id: string | null;
  slug: string;
  destination_url: string;
  title: string | null;
  is_active: number;
  expires_at: number | null;
  click_count: number;
  created_at: number;
  updated_at: number;
  folder?: string | null;
  password_hash?: string | null;
  starts_at?: number | null;
  max_clicks?: number | null;
  notify_at?: number | null;
  notified_at?: number | null;
  /** null = espacio personal de user_id; si no, el equipo dueño del enlace. */
  workspace_id?: string | null;
};

export type ClickRow = {
  id: number;
  link_id: string;
  clicked_at: number;
  country: string | null;
  city: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  referrer: string | null;
  ip_hash: string | null;
  is_bot: number;
};

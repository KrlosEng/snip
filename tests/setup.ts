import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Cada archivo de pruebas usa su propia base SQLite vacía.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "snip-test-"));
process.env.DATABASE_FILE = path.join(dir, "test.db");
(globalThis as { __snipEngine?: unknown }).__snipEngine = undefined;

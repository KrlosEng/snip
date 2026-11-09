import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Pruebas de la lógica crítica con SQLite temporal (nunca tocan la base de producción,
 * aunque .env.local tenga DATABASE_URL: aquí se vacía).
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./tests/empty.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    pool: "forks",
    env: { DATABASE_URL: "", POSTGRES_URL: "", UPSTASH_REDIS_REST_URL: "", RESEND_API_KEY: "", SMTP_URL: "", IP_HASH_SALT: "pruebas" },
  },
});

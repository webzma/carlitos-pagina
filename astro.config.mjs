// @ts-check
import { defineConfig, envField } from "astro/config";
import vercel from "@astrojs/vercel";

export default defineConfig({
  output: "server",
  adapter: vercel(),
  env: {
    schema: {
      ADMIN_PASSWORD: envField.string({ context: "server", access: "secret" }),
      SESSION_SECRET: envField.string({ context: "server", access: "secret" }),
      // Turso en producción; sin valor usa un archivo SQLite local (solo desarrollo)
      TURSO_DATABASE_URL: envField.string({ context: "server", access: "secret", default: "file:./data/rifa.db" }),
      TURSO_AUTH_TOKEN: envField.string({ context: "server", access: "secret", optional: true }),
    },
  },
});

// @ts-check
import { defineConfig, envField } from "astro/config";
import node from "@astrojs/node";

export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
  env: {
    schema: {
      ADMIN_PASSWORD: envField.string({ context: "server", access: "secret" }),
      SESSION_SECRET: envField.string({ context: "server", access: "secret" }),
      DATA_DIR: envField.string({ context: "server", access: "secret", default: "./data" }),
    },
  },
});

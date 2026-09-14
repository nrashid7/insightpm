import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig(({ command, mode }) => {
  if (command === "build") {
    const env = loadEnv(mode, process.cwd(), "VITE_");
    const missing = ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"]
      .filter((key) => !env[key]?.trim());
    if (missing.length) {
      throw new Error(`Missing required build environment: ${missing.join(", ")}. Set these in Vercel before deploying.`);
    }
  }
  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src"),
      },
    },
    server: {
      host: "::",
      port: 8080,
    },
  };
});

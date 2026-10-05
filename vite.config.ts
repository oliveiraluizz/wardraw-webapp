import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  server: { port: 3000 },
  build: {
    rollupOptions: {
      output: {
        // Long-lived vendor chunks: phones on 4G re-download only app code after a deploy (RNF-05).
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          data: ["@tanstack/react-query", "axios"],
          supabase: ["@supabase/supabase-js"],
          ui: ["lucide-react", "date-fns", "class-variance-authority", "clsx", "tailwind-merge"],
        },
      },
    },
  },
});

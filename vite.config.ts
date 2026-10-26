import path from "node:path"
import { fileURLToPath } from "node:url"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"
import sirv from "sirv"

const root = path.dirname(fileURLToPath(import.meta.url))

function serveFixtures(): Plugin {
  return {
    name: "serve-fixtures",
    configureServer(server) {
      server.middlewares.use(
        "/fixtures",
        sirv(path.join(root, "fixtures"), { dev: true, etag: true }),
      )
    },
    configurePreviewServer(server) {
      server.middlewares.use(
        "/fixtures",
        sirv(path.join(root, "fixtures"), { etag: true }),
      )
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), serveFixtures()],
  resolve: {
    alias: {
      "@": path.resolve(root, "./src"),
    },
  },
  // Reachable on the LAN (phone on same Wi‑Fi): http://<your-mac-ip>:5173
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
})

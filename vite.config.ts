import path from "node:path"
import { fileURLToPath } from "node:url"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv, type Plugin } from "vite"
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

function injectSiteUrl(siteUrl: string): Plugin {
  return {
    name: "inject-site-url",
    transformIndexHtml(html) {
      return html.replaceAll("__SITE_URL__", siteUrl)
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, root, "")
  // Absolute origin for Open Graph (no trailing slash). Set in .env / CI.
  const siteUrl = (env.VITE_SITE_URL || "").replace(/\/$/, "")

  return {
    plugins: [
      react(),
      tailwindcss(),
      serveFixtures(),
      injectSiteUrl(siteUrl),
    ],
    resolve: {
      alias: {
        "@": path.resolve(root, "./src"),
      },
    },
    build: {
      // Don't modulepreload heavy async chunks on first paint (Lighthouse).
      modulePreload: {
        resolveDependencies(_filename, deps) {
          return deps.filter(
            (dep) =>
              !dep.includes("maplibre") &&
              !dep.includes("recharts") &&
              !dep.includes("carousel") &&
              !dep.includes("MediaLightbox") &&
              !dep.includes("ElevationProfile") &&
              !dep.includes("StagePage") &&
              !dep.includes("MapView"),
          )
        },
      },
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules/maplibre-gl")) return "maplibre"
            if (id.includes("node_modules/recharts")) return "recharts"
            if (id.includes("node_modules/embla-carousel")) return "carousel"
          },
        },
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
  }
})

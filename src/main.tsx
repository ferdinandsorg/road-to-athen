import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./lib/maplibre-worker"
/* MapLibre base CSS first — our index.css overrides ctrl chrome after it. */
import "maplibre-gl/dist/maplibre-gl.css"
import "./index.css"
import App from "./App.tsx"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

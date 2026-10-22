// MapLibre GL JS v6 ships a separate worker module. Bundlers rename the main
// entry, so auto-detection fails and tiles stay stuck in "loading".
// See: https://maplibre.org/maplibre-gl-js/docs/ (Vite / setWorkerUrl)
import { setWorkerUrl } from "maplibre-gl"
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url"

setWorkerUrl(workerUrl)

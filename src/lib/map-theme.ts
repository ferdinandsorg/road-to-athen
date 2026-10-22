// Map colors as hex – MapLibre does not understand oklch().
// Must match tokens in src/index.css (see docs/DESIGN_SYSTEM.md).

/**
 * Map look & feel.
 *
 * Basemap (priority):
 * 1. Mapbox Studio „Outdoors“ (`public/styles/outdoors-mapbox.json`)
 *    if `VITE_MAPBOX_ACCESS_TOKEN` is set — your exported style.
 * 2. Else Carto Voyager / OpenFreeMap fallbacks below.
 *
 * Route + 3D terrain settings always come from `mapTheme` here.
 */
export const mapTheme = {
  /** Active stage line (also used for playhead / markers). */
  route: "#1f26f0",
  routeMuted: "rgba(31, 38, 240, 0.45)",
  routeCasing: "#ffffff",
  stageEnd: "#0a1a8c",
  finish: "#3d4cff",
  markerBorder: "#ffffff",
  hillshade: {
    shadow: "#1a2030",
    highlight: "#f5f0e6",
    accent: "#5a6a82",
    /** Used only when Mapbox Outdoors is NOT active. */
    exaggeration: 0.75,
  },
  /** 3D mesh height (stage view only, Mapterhorn DEM). Try 1.0–1.8. */
  terrainExaggeration: 1.25,
  /** Camera for stage 3D; overview stays pitch 0. */
  stageCamera: {
    pitch: 52,
    bearing: 18,
  },
  routeWidth: { active: 4, casing: 7, muted: 3 },
} as const

export const mapSources = {
  /** Fallback if no Mapbox token */
  baseStyle: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
  baseStyleFallback: "https://tiles.openfreemap.org/styles/liberty",
  demTileJson: "https://tiles.mapterhorn.com/tilejson.json",
  demEncoding: "terrarium" as const,
  demAttribution:
    '<a href="https://mapterhorn.com/attribution" target="_blank">© Mapterhorn</a>',
} as const

// Map colors as hex – MapLibre does not understand oklch().
// Oriented on Mapbox Light v11 (Day) — cool near-white land, gray water.

/**
 * Map look & feel.
 * Basemap mimics Mapbox Light 2D so brand route blue `#1f26f0` stays the accent.
 */
export const mapTheme = {
  /** Mapbox Light land ≈ hsl(220, 3%, 99%) */
  land: "#fcfcfd",
  /** Space around the globe (our choice — Light uses white fog; we keep space black). */
  space: "#050508",
  route: "#1f26f0",
  routeMuted: "rgba(31, 38, 240, 0.42)",
  routeCasing: "#ffffff",
  stageEnd: "#0a1a8c",
  finish: "#3d4cff",
  markerBorder: "#ffffff",
  /** Mapbox Light water ≈ hsl(220, 1%, 86%) */
  water: "#dbdbdc",
  waterDepth: "#d0d0d2",
  waterway: "#dbdbdc",
  /** Quiet Light-style roads */
  road: "#e8e8ea",
  roadCasing: "#fcfcfd",
  roadMajor: "#ffffff",
  /** admin-0 ≈ hsl(220, 0%, 70%) / halo 87% */
  countryBorder: "#b2b2b2",
  countryBorderHalo: "#dedede",
  /** Darker than Light’s 49% gray — HTML labels need more contrast on white land. */
  labelCountry: "#3f4450",
  labelCapital: "#4a5060",
  labelCity: "#6a7080",
  labelWater: "#7a8090",
  labelHalo: "#ffffff",
  /** Settlement marker (capital ring / city dot) */
  placeMarker: "#5a6070",
  hillshade: {
    shadow: "#b8bcc4",
    highlight: "#ffffff",
    accent: "#c5c8ce",
    exaggeration: 0.22,
  },
  terrainExaggeration: 0.9,
  stageCamera: {
    pitch: 40,
    bearing: 12,
  },
  routeWidth: { active: 4.5, casing: 7.5, muted: 3 },
} as const

export const mapSources = {
  openmaptilesUrl: "https://tiles.openfreemap.org/planet",
  glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
  baseStyleFallback: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  demTileJson: "https://tiles.mapterhorn.com/tilejson.json",
  demEncoding: "terrarium" as const,
  demAttribution:
    '<a href="https://mapterhorn.com/attribution" target="_blank">© Mapterhorn</a>',
  osmAttribution:
    '© <a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> © <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
} as const

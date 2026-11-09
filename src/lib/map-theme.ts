// Map colors as hex – MapLibre does not understand oklch().
// Basemap: OpenFreeMap Liberty (colors live in the remote style JSON).
// Tokens here are for route overlays, DEM hillshade, and loading fallback.

/**
 * Map look & feel.
 * Liberty paints land/water/roads; brand route blue `#1f26f0` stays the accent.
 */
export const mapTheme = {
  /** Matches OpenFreeMap Liberty background while style JSON loads. */
  land: "#f8f4f0",
  /** Space around the globe. */
  space: "#050508",
  route: "#1f26f0",
  routeMuted: "rgba(31, 38, 240, 0.42)",
  routeCasing: "#ffffff",
  stageEnd: "#0a1a8c",
  finish: "#3d4cff",
  markerBorder: "#ffffff",
  /** Approx Liberty water — only used if we paint custom water layers. */
  water: "rgb(158,189,255)",
  waterDepth: "rgb(140,172,240)",
  waterway: "rgb(158,189,255)",
  road: "#e8e8ea",
  roadCasing: "#f8f4f0",
  roadMajor: "#ffffff",
  countryBorder: "#9a9a9a",
  countryBorderHalo: "#dedede",
  labelCountry: "#3f4450",
  labelCapital: "#4a5060",
  labelCity: "#6a7080",
  labelWater: "#7a8090",
  labelHalo: "#ffffff",
  placeMarker: "#5a6070",
  hillshade: {
    shadow: "#b8bcc4",
    highlight: "#ffffff",
    accent: "#c5c8ce",
    exaggeration: 0.28,
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
  /** Self-hosted Uncut Sans SDF glyphs (see `npm run build:map-fonts`). */
  glyphs: "/fonts/{fontstack}/{range}.pbf",
  libertyStyleUrl: "https://tiles.openfreemap.org/styles/liberty",
  demTileJson: "https://tiles.mapterhorn.com/tilejson.json",
  demEncoding: "terrarium" as const,
  demAttribution:
    '<a href="https://mapterhorn.com/attribution" target="_blank">© Mapterhorn</a>',
  osmAttribution:
    '© <a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> © <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
} as const

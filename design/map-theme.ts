// Kartenfarben als Hex – MapLibre versteht kein oklch().
// Muss zu den Tokens in src/index.css passen (siehe docs/DESIGN_SYSTEM.md).
// Ziel im Projekt: src/lib/map-theme.ts

export const mapTheme = {
  route: "#cc5824",
  routeMuted: "rgba(204, 88, 36, 0.35)",
  routeCasing: "#ffffff",
  stageEnd: "#00537e",
  finish: "#e9ab2b",
  markerBorder: "#ffffff",
  hillshade: {
    shadow: "#4a3f35",
    highlight: "#ffffff",
    accent: "#6b5d50",
    exaggeration: 0.35,
  },
  routeWidth: { active: 4, casing: 7, muted: 3 },
} as const;

// Kartenquellen (kostenlos, ohne API-Key) – Attribution muss sichtbar bleiben.
export const mapSources = {
  baseStyle: "https://tiles.openfreemap.org/styles/positron",
  demTileJson: "https://tiles.mapterhorn.com/tilejson.json",
  demEncoding: "terrarium",
  demAttribution: '<a href="https://mapterhorn.com/attribution" target="_blank">© Mapterhorn</a>',
} as const;

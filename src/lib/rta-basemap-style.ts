import type { StyleSpecification } from "maplibre-gl"
import { mapSources, mapTheme } from "@/lib/map-theme"

const OMT = "openmaptiles"
/** Dedicated place source: maxzoom 8 so country/capital stay when zooming in. */
const OMT_PLACES = "openmaptiles-places"

type BuildOptions = {
  /** Explicit tile URLs from TileJSON — required for places maxzoom overzoom. */
  planetTiles: string[]
}

/**
 * Mapbox Light–inspired minimal basemap.
 * Pass `planetTiles` from TileJSON so the places source can force maxzoom 8
 * (TileJSON url alone overwrites maxzoom back to 14 and labels vanish after z8).
 */
export function buildRtaBasemapStyle(opts: BuildOptions): StyleSpecification {
  const { planetTiles } = opts

  return {
    version: 8,
    name: "rta-light",
    glyphs: mapSources.glyphs,
    sources: {
      [OMT]: {
        type: "vector",
        tiles: planetTiles,
        maxzoom: 14,
        attribution: mapSources.osmAttribution,
      },
      [OMT_PLACES]: {
        type: "vector",
        tiles: planetTiles,
        // Last zoom that still contains country + capital features in OFM tiles.
        maxzoom: 8,
        attribution: mapSources.osmAttribution,
      },
    },
    layers: [
      {
        id: "background",
        type: "background",
        paint: { "background-color": mapTheme.land },
      },
      {
        id: "water",
        type: "fill",
        source: OMT,
        "source-layer": "water",
        filter: ["==", ["geometry-type"], "Polygon"],
        paint: { "fill-color": mapTheme.water },
      },
      {
        id: "waterway",
        type: "line",
        source: OMT,
        "source-layer": "waterway",
        minzoom: 8,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": mapTheme.waterway,
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            8,
            0.5,
            14,
            1.5,
          ],
          "line-opacity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            8,
            0,
            8.5,
            1,
          ],
        },
      },
      {
        id: "road-minor",
        type: "line",
        source: OMT,
        "source-layer": "transportation",
        minzoom: 11,
        filter: [
          "all",
          ["!=", ["get", "brunnel"], "tunnel"],
          ["in", ["get", "class"], ["literal", ["secondary", "tertiary"]]],
        ],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": mapTheme.road,
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            11,
            0.4,
            16,
            2.5,
          ],
        },
      },
      {
        id: "road-major-casing",
        type: "line",
        source: OMT,
        "source-layer": "transportation",
        minzoom: 6,
        filter: [
          "all",
          ["!=", ["get", "brunnel"], "tunnel"],
          [
            "in",
            ["get", "class"],
            ["literal", ["motorway", "trunk", "primary"]],
          ],
        ],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": mapTheme.road,
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            6,
            1.2,
            14,
            5,
          ],
          "line-opacity": 0.5,
        },
      },
      {
        id: "road-major",
        type: "line",
        source: OMT,
        "source-layer": "transportation",
        minzoom: 5,
        filter: [
          "all",
          ["!=", ["get", "brunnel"], "tunnel"],
          [
            "in",
            ["get", "class"],
            ["literal", ["motorway", "trunk", "primary"]],
          ],
        ],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": mapTheme.roadMajor,
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            5,
            0.5,
            14,
            3,
          ],
        },
      },
      {
        id: "boundary_country_halo",
        type: "line",
        source: OMT,
        "source-layer": "boundary",
        minzoom: 3,
        filter: [
          "all",
          ["==", ["get", "admin_level"], 2],
          ["!=", ["get", "maritime"], 1],
        ],
        paint: {
          "line-color": mapTheme.countryBorderHalo,
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            3,
            2.5,
            12,
            5,
          ],
          "line-opacity": 0.4,
          "line-blur": 0.6,
        },
      },
      {
        id: "boundary_country",
        type: "line",
        source: OMT,
        "source-layer": "boundary",
        minzoom: 1,
        filter: [
          "all",
          ["==", ["get", "admin_level"], 2],
          ["!=", ["get", "maritime"], 1],
        ],
        paint: {
          "line-color": mapTheme.countryBorder,
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            3,
            0.65,
            12,
            1.6,
          ],
        },
      },
      {
        id: "place_city_dot",
        type: "circle",
        source: OMT_PLACES,
        "source-layer": "place",
        minzoom: 4,
        filter: [
          "all",
          ["==", ["get", "class"], "city"],
          ["!=", ["get", "capital"], 2],
          ["<=", ["get", "rank"], 6],
        ],
        paint: {
          "circle-radius": 2,
          "circle-color": mapTheme.placeMarker,
          "circle-opacity": 0.9,
        },
      },
      {
        id: "place_capital_outer",
        type: "circle",
        source: OMT_PLACES,
        "source-layer": "place",
        minzoom: 3,
        filter: [
          "all",
          ["==", ["get", "class"], "city"],
          ["==", ["get", "capital"], 2],
        ],
        paint: {
          "circle-radius": 3.5,
          "circle-color": mapTheme.land,
          "circle-stroke-width": 1.2,
          "circle-stroke-color": mapTheme.placeMarker,
        },
      },
      {
        id: "place_capital_inner",
        type: "circle",
        source: OMT_PLACES,
        "source-layer": "place",
        minzoom: 3,
        filter: [
          "all",
          ["==", ["get", "class"], "city"],
          ["==", ["get", "capital"], 2],
        ],
        paint: {
          "circle-radius": 1.25,
          "circle-color": mapTheme.placeMarker,
        },
      },
      // Place *text* is rendered via HTML Markers (`PlaceLabels`) — GL symbol
      // text was not painting in MapLibre 6 despite loaded glyphs.
    ],
  }
}

/** Blank land while TileJSON resolves — avoids broken tile URL flash. */
export function buildRtaBasemapStyleFallback(): StyleSpecification {
  return {
    version: 8,
    name: "rta-light-pending",
    glyphs: mapSources.glyphs,
    sources: {},
    layers: [
      {
        id: "background",
        type: "background",
        paint: { "background-color": mapTheme.land },
      },
    ],
  }
}

export async function loadRtaBasemapStyle(): Promise<StyleSpecification> {
  const res = await fetch(mapSources.openmaptilesUrl)
  if (!res.ok) {
    throw new Error(`OpenFreeMap TileJSON failed: ${res.status}`)
  }
  const tilejson = (await res.json()) as { tiles?: string[] }
  const planetTiles = tilejson.tiles?.filter((t) => typeof t === "string")
  if (!planetTiles?.length) {
    throw new Error("OpenFreeMap TileJSON missing tiles[]")
  }
  return buildRtaBasemapStyle({ planetTiles })
}

export const RTA_MOBILE_HIDDEN_LAYERS = [
  "road-minor",
  "place_city_dot",
] as const

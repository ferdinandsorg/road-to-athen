import type { StyleSpecification } from "maplibre-gl"
import { mapTheme } from "@/lib/map-theme"

const STYLE_URL = "/styles/outdoors-mapbox.json"

/** Mapbox Studio style id from the exported Outdoors JSON sprite URL. */
const MAPBOX_USERNAME = "ferdinandsorg"
const MAPBOX_STYLE_ID = "cmvjt9hkn00l501s8gnfs95e7"

type LayerPaint = Record<string, unknown>

function layerPaint(
  style: StyleSpecification,
  id: string,
): LayerPaint | null {
  const layer = style.layers?.find((l) => l.id === id)
  if (!layer || !("paint" in layer) || !layer.paint) return null
  return layer.paint as LayerPaint
}

/** Darker water + clearer country borders on the Outdoors export. */
function applyBasemapLook(style: StyleSpecification): void {
  const water = layerPaint(style, "water")
  if (water) water["fill-color"] = mapTheme.water

  const waterDepth = layerPaint(style, "water-depth")
  if (waterDepth) {
    // Keep depth shading, but bias toward the darker water hue
    waterDepth["fill-color"] = [
      "interpolate",
      ["linear"],
      ["zoom"],
      6,
      [
        "interpolate",
        ["linear"],
        ["get", "min_depth"],
        0,
        "rgba(58, 111, 156, 0.4)",
        200,
        "rgba(47, 95, 136, 0.45)",
        7000,
        "rgba(36, 78, 115, 0.5)",
      ],
      8,
      [
        "interpolate",
        ["linear"],
        ["get", "min_depth"],
        0,
        "rgba(58, 111, 156, 0.2)",
        200,
        "rgba(47, 95, 136, 0.25)",
        7000,
        "rgba(36, 78, 115, 0.3)",
      ],
    ]
  }

  const waterShadow = layerPaint(style, "water-shadow")
  if (waterShadow) waterShadow["fill-color"] = mapTheme.waterDepth

  const waterway = layerPaint(style, "waterway")
  if (waterway) waterway["line-color"] = mapTheme.water

  const admin0 = layerPaint(style, "admin-0-boundary")
  if (admin0) {
    admin0["line-color"] = mapTheme.countryBorder
    admin0["line-width"] = [
      "interpolate",
      ["linear"],
      ["zoom"],
      2,
      0.9,
      6,
      1.4,
      12,
      2.6,
    ]
    admin0["line-dasharray"] = [1, 0]
    admin0["line-opacity"] = 0.95
  }

  const admin0Bg = layerPaint(style, "admin-0-boundary-bg")
  if (admin0Bg) {
    admin0Bg["line-color"] = mapTheme.countryBorderHalo
    admin0Bg["line-width"] = [
      "interpolate",
      ["linear"],
      ["zoom"],
      2,
      2.5,
      6,
      4,
      12,
      7,
    ]
    admin0Bg["line-opacity"] = [
      "interpolate",
      ["linear"],
      ["zoom"],
      1,
      0.35,
      3,
      0.7,
      8,
      0.85,
    ]
    admin0Bg["line-blur"] = 0
  }

  const admin0Disputed = layerPaint(style, "admin-0-boundary-disputed")
  if (admin0Disputed) {
    admin0Disputed["line-color"] = mapTheme.countryBorder
    admin0Disputed["line-width"] = [
      "interpolate",
      ["linear"],
      ["zoom"],
      2,
      0.9,
      12,
      2.4,
    ]
  }

  const admin1 = layerPaint(style, "admin-1-boundary")
  if (admin1) {
    admin1["line-color"] = mapTheme.countryBorder
    admin1["line-opacity"] = [
      "interpolate",
      ["linear"],
      ["zoom"],
      4,
      0,
      6,
      0.45,
      10,
      0.7,
    ]
    admin1["line-width"] = [
      "interpolate",
      ["linear"],
      ["zoom"],
      4,
      0.4,
      12,
      1.2,
    ]
  }
}

/**
 * Adapt the Mapbox Studio "Outdoors" export for MapLibre.
 * Needs a public Mapbox access token (tiles, glyphs, sprites are Mapbox-hosted).
 */
export function adaptMapboxOutdoorsStyle(
  raw: StyleSpecification,
  accessToken: string,
): StyleSpecification {
  const token = encodeURIComponent(accessToken)
  const style: StyleSpecification = structuredClone(raw)

  // MapLibre fog ≠ Mapbox fog — drop to avoid runtime warnings
  delete (style as { fog?: unknown }).fog

  style.glyphs = `https://api.mapbox.com/fonts/v1/mapbox/{fontstack}/{range}.pbf?access_token=${token}`
  style.sprite = `https://api.mapbox.com/styles/v1/${MAPBOX_USERNAME}/${MAPBOX_STYLE_ID}/sprite?access_token=${token}`

  style.sources = {
    composite: {
      type: "vector",
      tiles: [
        `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8,mapbox.mapbox-terrain-v2,mapbox.mapbox-bathymetry-v2/{z}/{x}/{y}.vector.pbf?access_token=${token}`,
      ],
      maxzoom: 16,
      attribution:
        '© <a href="https://www.mapbox.com/about/maps/" target="_blank">Mapbox</a> © <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
    },
  }

  applyBasemapLook(style)
  return style
}

export async function loadMapboxOutdoorsStyle(
  accessToken: string,
): Promise<StyleSpecification> {
  const res = await fetch(STYLE_URL)
  if (!res.ok) {
    throw new Error(`Failed to load outdoors style: ${res.status}`)
  }
  const raw = (await res.json()) as StyleSpecification
  return adaptMapboxOutdoorsStyle(raw, accessToken)
}

export function mapboxTokenFromEnv(): string | null {
  const t = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN
  return typeof t === "string" && t.trim().length > 0 ? t.trim() : null
}

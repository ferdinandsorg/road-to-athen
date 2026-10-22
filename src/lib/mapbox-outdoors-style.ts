import type { StyleSpecification } from "maplibre-gl"

const STYLE_URL = "/styles/outdoors-mapbox.json"

/** Mapbox Studio style id from the exported Outdoors JSON sprite URL. */
const MAPBOX_USERNAME = "ferdinandsorg"
const MAPBOX_STYLE_ID = "cmvjt9hkn00l501s8gnfs95e7"

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

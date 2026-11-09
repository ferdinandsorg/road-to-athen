import type {
  LayerSpecification,
  StyleSpecification,
} from "maplibre-gl"
import { mapSources, mapTheme } from "@/lib/map-theme"

function layerById(
  style: StyleSpecification,
  id: string,
): LayerSpecification | undefined {
  return style.layers?.find((l) => l.id === id)
}

function setMinZoom(layer: LayerSpecification | undefined, minzoom: number) {
  if (!layer) return
  layer.minzoom = minzoom
}

function setMaxZoom(layer: LayerSpecification | undefined, maxzoom: number) {
  if (!layer) return
  layer.maxzoom = maxzoom
}

function hideLayer(layer: LayerSpecification | undefined) {
  if (!layer) return
  layer.layout = { ...(layer.layout ?? {}), visibility: "none" }
}

const UNCUT_FONT_STACKS: Record<string, string> = {
  "Noto Sans Regular": "Uncut Sans Regular",
  "Noto Sans Bold": "Uncut Sans Bold",
  "Noto Sans Italic": "Uncut Sans Italic",
}

/** Point Liberty labels at self-hosted Uncut Sans glyph PBFs. */
function applyUncutSansFonts(style: StyleSpecification): void {
  style.glyphs = mapSources.glyphs
  for (const layer of style.layers ?? []) {
    if (layer.type !== "symbol" || !layer.layout) continue
    const fonts = layer.layout["text-font"]
    if (!Array.isArray(fonts)) continue
    // Single-stack only — static /fonts does not composite "A,B" URLs.
    layer.layout["text-font"] = fonts.map((name) => {
      const key = typeof name === "string" ? name : String(name)
      return UNCUT_FONT_STACKS[key] ?? key
    })
  }
}

/** Tighter halos — stock Liberty blur makes SDF labels look mushy. */
function applySharpLabelHalos(style: StyleSpecification): void {
  for (const layer of style.layers ?? []) {
    if (layer.type !== "symbol" || !layer.paint) continue
    if (layer.paint["text-halo-width"] == null) continue
    layer.paint["text-halo-width"] = 0.6
    layer.paint["text-halo-blur"] = 0
  }
}

/**
 * Liberty looks good but is busy for a bike-route story map.
 * Keep OFM colors; thin labels/roads for orientation without village spam.
 */
function applyLibertyDiet(style: StyleSpecification): void {
  // Countries vanish after z9 in stock Liberty — desktop stage zoom looks empty.
  for (const id of ["label_country_1", "label_country_2", "label_country_3"]) {
    const layer = layerById(style, id)
    if (!layer) continue
    delete layer.maxzoom
    setMaxZoom(layer, 13)
    if (layer.type === "symbol") {
      layer.layout = {
        ...layer.layout,
        "text-size": [
          "interpolate",
          ["linear"],
          ["zoom"],
          2,
          10,
          5,
          14,
          9,
          13,
          12,
          12,
        ],
      }
      layer.paint = {
        ...layer.paint,
        "text-opacity": [
          "interpolate",
          ["linear"],
          ["zoom"],
          10,
          1,
          12,
          0.7,
          13,
          0.35,
        ],
      }
    }
  }

  // Capitals always; other cities only important ranks.
  const capital = layerById(style, "label_city_capital")
  if (capital) setMinZoom(capital, 3)

  const city = layerById(style, "label_city")
  if (city && city.type === "symbol") {
    setMinZoom(city, 4)
    city.filter = [
      "all",
      ["==", ["get", "class"], "city"],
      ["!=", ["get", "capital"], 2],
      ["<=", ["get", "rank"], 9],
    ]
  }

  // Medium towns for orientation — not from overview zoom.
  setMinZoom(layerById(style, "label_town"), 8)

  // Villages only when close.
  setMinZoom(layerById(style, "label_village"), 12)

  // Suburbs / neighbourhoods / POI-ish place classes — too noisy.
  hideLayer(layerById(style, "label_other"))
  // Admin-1 (Bundesländer etc.) adds clutter on a multi-country tour.
  hideLayer(layerById(style, "label_state"))

  // Road diet: keep motorway / trunk / primary; push minor network back.
  setMinZoom(layerById(style, "road_secondary_tertiary"), 7)
  setMinZoom(layerById(style, "road_secondary_tertiary_casing"), 7)

  setMinZoom(layerById(style, "road_minor"), 11)
  setMinZoom(layerById(style, "road_minor_casing"), 11)
  setMinZoom(layerById(style, "bridge_street"), 11)
  setMinZoom(layerById(style, "bridge_street_casing"), 11)
  setMinZoom(layerById(style, "tunnel_street_casing"), 11)

  setMinZoom(layerById(style, "road_service_track"), 14)
  setMinZoom(layerById(style, "road_service_track_casing"), 14)
  setMinZoom(layerById(style, "bridge_service_track"), 14)
  setMinZoom(layerById(style, "bridge_service_track_casing"), 14)
  setMinZoom(layerById(style, "tunnel_service_track"), 14)
  setMinZoom(layerById(style, "tunnel_service_track_casing"), 14)

  setMinZoom(layerById(style, "road_path_pedestrian"), 15)
  setMinZoom(layerById(style, "bridge_path_pedestrian"), 15)
  setMinZoom(layerById(style, "bridge_path_pedestrian_casing"), 15)
  setMinZoom(layerById(style, "tunnel_path_pedestrian"), 15)

  setMinZoom(layerById(style, "highway-name-major"), 13)
  setMinZoom(layerById(style, "highway-name-minor"), 16)
  setMinZoom(layerById(style, "highway-name-path"), 17)
}

/** Solid Liberty land while the remote style JSON loads. */
export function buildLibertyBasemapStyleFallback(): StyleSpecification {
  return {
    version: 8,
    name: "rta-liberty-pending",
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

export async function loadLibertyBasemapStyle(): Promise<StyleSpecification> {
  const res = await fetch(mapSources.libertyStyleUrl)
  if (!res.ok) {
    throw new Error(`Liberty style failed: ${res.status}`)
  }
  const style = (await res.json()) as StyleSpecification
  applyLibertyDiet(style)
  applyUncutSansFonts(style)
  applySharpLabelHalos(style)
  return style
}

/**
 * Phone diet: keep Liberty colors + motorway/primary + countries/capitals/cities.
 * Drop rails, buildings, POIs, shields, minor roads, and chatter labels.
 */
export const LIBERTY_MOBILE_HIDDEN_LAYERS = [
  // Landuse / aeroway chatter
  "landuse_pitch",
  "landuse_track",
  "landuse_cemetery",
  "landuse_hospital",
  "landuse_school",
  "aeroway_fill",
  "aeroway_runway",
  "aeroway_taxiway",
  // Buildings (fill-extrusion is costly on phones)
  "building",
  "building-3d",
  // Minor / service / path roads
  "road_service_track",
  "road_service_track_casing",
  "road_path_pedestrian",
  "road_minor",
  "road_minor_casing",
  "road_link",
  "road_link_casing",
  "road_motorway_link",
  "road_motorway_link_casing",
  "road_secondary_tertiary",
  "road_secondary_tertiary_casing",
  "road_area_pattern",
  "road_one_way_arrow",
  "road_one_way_arrow_opposite",
  // Tunnel / bridge counterparts for the above
  "tunnel_service_track",
  "tunnel_service_track_casing",
  "tunnel_path_pedestrian",
  "tunnel_link",
  "tunnel_link_casing",
  "tunnel_motorway_link",
  "tunnel_motorway_link_casing",
  "tunnel_minor",
  "tunnel_street_casing",
  "tunnel_secondary_tertiary",
  "tunnel_secondary_tertiary_casing",
  "bridge_service_track",
  "bridge_service_track_casing",
  "bridge_path_pedestrian",
  "bridge_path_pedestrian_casing",
  "bridge_link",
  "bridge_link_casing",
  "bridge_motorway_link",
  "bridge_motorway_link_casing",
  "bridge_street",
  "bridge_street_casing",
  "bridge_secondary_tertiary",
  "bridge_secondary_tertiary_casing",
  // Rails
  "road_major_rail",
  "road_major_rail_hatching",
  "road_transit_rail",
  "road_transit_rail_hatching",
  "tunnel_major_rail",
  "tunnel_major_rail_hatching",
  "tunnel_transit_rail",
  "tunnel_transit_rail_hatching",
  "bridge_major_rail",
  "bridge_major_rail_hatching",
  "bridge_transit_rail",
  "bridge_transit_rail_hatching",
  // Symbol noise — keep country / capital / city only
  "label_village",
  "label_town",
  "label_other",
  "label_state",
  "waterway_line_label",
  "water_name_point_label",
  "water_name_line_label",
  "highway-name-path",
  "highway-name-minor",
  "highway-name-major",
  "highway-shield-non-us",
  "highway-shield-us-interstate",
  "road_shield_us",
  "airport",
  "poi_r20",
  "poi_r7",
  "poi_r1",
  "poi_transit",
] as const

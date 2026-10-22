import type { Stage } from "@/types/data"

const R = 6_371_000

function haversineMeters(a: GeoJSON.Position, b: GeoJSON.Position): number {
  const toRad = Math.PI / 180
  const dLat = (b[1]! - a[1]!) * toRad
  const dLng = (b[0]! - a[0]!) * toRad
  const lat1 = a[1]! * toRad
  const lat2 = b[1]! * toRad
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)))
}

export type RouteVertex = {
  lng: number
  lat: number
  /** Cumulative distance along the overview polyline (m). */
  distanceM: number
}

export type StageSpan = {
  nr: number
  /** Start offset along total stage distance (m), from stages.json sums. */
  startM: number
  endM: number
}

/** Cumulative distance spans per stage from `stages.json` distances. */
export function buildStageSpans(stages: Stage[]): {
  spans: StageSpan[]
  totalM: number
} {
  const spans: StageSpan[] = []
  let cursor = 0
  const sorted = [...stages].sort((a, b) => a.nr - b.nr)
  for (const s of sorted) {
    const startM = cursor
    const endM = cursor + s.distanceM
    spans.push({ nr: s.nr, startM, endM })
    cursor = endM
  }
  return { spans, totalM: cursor }
}

export function progressForStage(
  spans: StageSpan[],
  totalM: number,
  stageNr: number,
  within: "start" | "mid" = "mid",
): number {
  if (totalM <= 0) return 0
  const span = spans.find((s) => s.nr === stageNr)
  if (!span) return 0
  const m =
    within === "start"
      ? span.startM
      : (span.startM + span.endM) / 2
  return Math.min(1, Math.max(0, m / totalM))
}

export function stageNrAtProgress(
  spans: StageSpan[],
  totalM: number,
  progress: number,
): number | null {
  if (!spans.length || totalM <= 0) return null
  const m = Math.min(1, Math.max(0, progress)) * totalM
  for (const span of spans) {
    if (m <= span.endM || span === spans[spans.length - 1]) return span.nr
  }
  return spans[spans.length - 1]!.nr
}

/**
 * Flatten overview route LineStrings (ignore kind-points) into a distance-
 * indexed polyline, ordered by stage `nr`.
 */
export function buildRouteVertices(
  overview: GeoJSON.FeatureCollection | null,
): RouteVertex[] {
  if (!overview) return []

  const lines = overview.features
    .filter(
      (f) =>
        f.geometry?.type === "LineString" &&
        f.properties?.kind == null &&
        typeof f.properties?.nr === "number",
    )
    .sort(
      (a, b) =>
        (a.properties!.nr as number) - (b.properties!.nr as number),
    )

  const vertices: RouteVertex[] = []
  let dist = 0

  for (const feature of lines) {
    const coords = (feature.geometry as GeoJSON.LineString).coordinates
    for (let i = 0; i < coords.length; i++) {
      const c = coords[i]!
      const lng = c[0]!
      const lat = c[1]!
      if (vertices.length === 0) {
        vertices.push({ lng, lat, distanceM: 0 })
        continue
      }
      const prev = vertices[vertices.length - 1]!
      // Skip duplicate join points between consecutive parts
      if (prev.lng === lng && prev.lat === lat) continue
      dist += haversineMeters([prev.lng, prev.lat], [lng, lat])
      vertices.push({ lng, lat, distanceM: dist })
    }
  }

  return vertices
}

export function pointAtProgress(
  vertices: RouteVertex[],
  progress: number,
): [number, number] | null {
  if (vertices.length === 0) return null
  if (vertices.length === 1) {
    const v = vertices[0]!
    return [v.lng, v.lat]
  }
  const total = vertices[vertices.length - 1]!.distanceM
  if (total <= 0) {
    const v = vertices[0]!
    return [v.lng, v.lat]
  }
  const target = Math.min(1, Math.max(0, progress)) * total

  let lo = 0
  let hi = vertices.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (vertices[mid]!.distanceM < target) lo = mid + 1
    else hi = mid
  }
  const i = Math.max(1, lo)
  const a = vertices[i - 1]!
  const b = vertices[i]!
  const span = b.distanceM - a.distanceM
  const t = span > 0 ? (target - a.distanceM) / span : 0
  return [
    a.lng + (b.lng - a.lng) * t,
    a.lat + (b.lat - a.lat) * t,
  ]
}

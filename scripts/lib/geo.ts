import simplify from "@turf/simplify"
import type { FitPoint } from "./fit.js"
import { detectTransportEdgeIndices } from "./transport.js"

export function roundCoord(n: number, digits = 5): number {
  const f = 10 ** digits
  return Math.round(n * f) / f
}

export function pointsToLine(
  points: FitPoint[],
  properties: Record<string, unknown> = {},
): GeoJSON.Feature<GeoJSON.LineString> {
  return {
    type: "Feature",
    properties,
    geometry: {
      type: "LineString",
      coordinates: points.map((p) => [
        roundCoord(p.lng),
        roundCoord(p.lat),
        Math.round(p.ele),
      ]),
    },
  }
}

export function simplifyLine(
  feature: GeoJSON.Feature<GeoJSON.LineString>,
  tolerance: number,
): GeoJSON.Feature<GeoJSON.LineString> {
  return simplify(feature, {
    tolerance,
    highQuality: true,
    mutate: false,
  }) as GeoJSON.Feature<GeoJSON.LineString>
}

export function bboxOf(
  points: FitPoint[],
): [number, number, number, number] {
  let minLng = Infinity
  let minLat = Infinity
  let maxLng = -Infinity
  let maxLat = -Infinity
  for (const p of points) {
    minLng = Math.min(minLng, p.lng)
    minLat = Math.min(minLat, p.lat)
    maxLng = Math.max(maxLng, p.lng)
    maxLat = Math.max(maxLat, p.lat)
  }
  return [minLng, minLat, maxLng, maxLat]
}

export function buildProfile(
  points: FitPoint[],
  count: number,
): [number, number][] {
  if (points.length === 0) return []
  const total = points[points.length - 1]?.distanceM ?? 0
  if (total <= 0) {
    return points
      .slice(0, count)
      .map((p, i) => [i, Math.round(p.ele)] as [number, number])
  }
  const out: [number, number][] = []
  for (let i = 0; i < count; i++) {
    const target = (total * i) / (count - 1)
    let best = points[0]!
    let bestDiff = Infinity
    for (const p of points) {
      const d = Math.abs(p.distanceM - target)
      if (d < bestDiff) {
        bestDiff = d
        best = p
      }
    }
    out.push([roundCoord(best.distanceM / 1000, 3), Math.round(best.ele)])
  }
  return out
}

/** Trim first N meters of a track (privacy). */
export function trimStartMeters(points: FitPoint[], meters: number): FitPoint[] {
  if (points.length === 0 || meters <= 0) return points
  const start = points[0]!.distanceM
  const cut = start + meters
  const trimmed = points.filter((p) => p.distanceM >= cut)
  return trimmed.length >= 2 ? trimmed : points
}

/**
 * Split a track into ridden vs transport parts, then simplify only ridden
 * segments so ferry/car/tunnel gaps survive overview simplification.
 */
export function buildRouteParts(
  points: FitPoint[],
  properties: Record<string, unknown>,
  simplifyTolerance: number,
): GeoJSON.Feature<GeoJSON.LineString>[] {
  if (points.length < 2) return []

  const transportAt = new Set(detectTransportEdgeIndices(points))
  const chunks: { points: FitPoint[]; transport: boolean }[] = []
  let current: FitPoint[] = [points[0]!]

  for (let i = 1; i < points.length; i++) {
    const next = points[i]!
    if (transportAt.has(i)) {
      if (current.length >= 2) {
        chunks.push({ points: current, transport: false })
      }
      chunks.push({
        points: [points[i - 1]!, next],
        transport: true,
      })
      current = [next]
    } else {
      current.push(next)
    }
  }
  if (current.length >= 2) {
    chunks.push({ points: current, transport: false })
  }

  return chunks.map((chunk) => {
    let feature = pointsToLine(chunk.points, {
      ...properties,
      transport: chunk.transport,
    })
    if (!chunk.transport && chunk.points.length > 2) {
      feature = simplifyLine(feature, simplifyTolerance)
    }
    return feature
  })
}

/** Merge route parts into one LineString (hover / profile sync). */
export function mergeRouteParts(
  parts: GeoJSON.Feature<GeoJSON.LineString>[],
  properties: Record<string, unknown> = {},
): GeoJSON.Feature<GeoJSON.LineString> {
  const coordinates: GeoJSON.Position[] = []
  for (const part of parts) {
    const coords = part.geometry.coordinates
    for (let i = 0; i < coords.length; i++) {
      if (i === 0 && coordinates.length > 0) continue
      coordinates.push(coords[i]!)
    }
  }
  return {
    type: "Feature",
    properties,
    geometry: { type: "LineString", coordinates },
  }
}

import type { FitPoint } from "./fit.js"

function haversineMeters(a: FitPoint, b: FitPoint): number {
  const R = 6_371_000
  const toRad = Math.PI / 180
  const dLat = (b.lat - a.lat) * toRad
  const dLng = (b.lng - a.lng) * toRad
  const lat1 = a.lat * toRad
  const lat2 = b.lat * toRad
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)))
}

/**
 * Detect non-ridden edges on the raw FIT track (before simplify).
 *
 * Gap heuristics on simplified lines create false positives on long
 * straight roads (Douglas-Peucker removes intermediate points).
 *
 * Rules (validated against all 32 stages):
 * - jump ≥ 2000 m with ≥ 60 s between points → ferry / car / tunnel
 * - jump ≥ 800 m lasting ≥ 10 min under 25 km/h → short ferry / wait
 */
export function isTransportEdge(a: FitPoint, b: FitPoint): boolean {
  const dist = haversineMeters(a, b)
  const dt = Math.max(
    0.001,
    (b.timestamp.getTime() - a.timestamp.getTime()) / 1000,
  )
  if (dt < 60) return false
  if (dist >= 2000) return true
  const kmh = (dist / dt) * 3.6
  if (dist >= 800 && dt >= 600 && kmh < 25) return true
  return false
}

/** Edge index i means the segment between points[i-1] and points[i]. */
export function detectTransportEdgeIndices(points: FitPoint[]): number[] {
  const out: number[] = []
  for (let i = 1; i < points.length; i++) {
    if (isTransportEdge(points[i - 1]!, points[i]!)) out.push(i)
  }
  return out
}

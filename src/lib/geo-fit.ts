import { lineCoordinates } from "@/lib/geo-display"

export type BBox = [number, number, number, number] // minLng, minLat, maxLng, maxLat

export type ScreenProjector = {
  project: (lng: number, lat: number) => [number, number]
  width: number
  height: number
}

/** Fit a geographic bbox into a pixel rectangle (padding px), Y flipped for SVG. */
export function createScreenProjector(
  bbox: BBox,
  width: number,
  height: number,
  padding = 48,
): ScreenProjector | null {
  if (width <= 0 || height <= 0) return null
  const [minLng, minLat, maxLng, maxLat] = bbox
  const geoW = Math.max(maxLng - minLng, 1e-9)
  const geoH = Math.max(maxLat - minLat, 1e-9)
  const availW = Math.max(width - padding * 2, 1)
  const availH = Math.max(height - padding * 2, 1)
  const scale = Math.min(availW / geoW, availH / geoH)
  const drawnW = geoW * scale
  const drawnH = geoH * scale
  const offsetX = padding + (availW - drawnW) / 2
  const offsetY = padding + (availH - drawnH) / 2

  return {
    width,
    height,
    project(lng, lat) {
      const x = offsetX + (lng - minLng) * scale
      const y = offsetY + (maxLat - lat) * scale
      return [x, y]
    },
  }
}

type LinePart = {
  coords: GeoJSON.Position[]
  transport: boolean
}

/** Split stage line into drawable coordinate parts. */
export function routeLineParts(
  line:
    | GeoJSON.FeatureCollection
    | GeoJSON.Feature
    | GeoJSON.Feature<GeoJSON.LineString>
    | null
    | undefined,
): LinePart[] {
  if (!line) return []
  if (line.type === "FeatureCollection") {
    return line.features.flatMap((f) => {
      const coords = lineCoordinates(f)
      if (coords.length < 2) return []
      return [
        {
          coords,
          transport: Boolean(f.properties?.transport),
        },
      ]
    })
  }
  const coords = lineCoordinates(line)
  if (coords.length < 2) return []
  return [
    {
      coords,
      transport: Boolean(line.properties?.transport),
    },
  ]
}

export function positionsToSvgPath(
  coords: GeoJSON.Position[],
  project: (lng: number, lat: number) => [number, number],
): string {
  if (coords.length === 0) return ""
  return coords
    .map((c, i) => {
      const [x, y] = project(c[0]!, c[1]!)
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(" ")
}

/** Nearest point on a polyline to a lon/lat (planar approx. in degrees). */
export function nearestOnRoute(
  lng: number,
  lat: number,
  parts: LinePart[],
): [number, number] | null {
  let best: [number, number] | null = null
  let bestDist = Infinity

  for (const { coords } of parts) {
    for (let i = 1; i < coords.length; i++) {
      const a = coords[i - 1]!
      const b = coords[i]!
      const [px, py] = closestOnSegment(lng, lat, a[0]!, a[1]!, b[0]!, b[1]!)
      const d = (px - lng) ** 2 + (py - lat) ** 2
      if (d < bestDist) {
        bestDist = d
        best = [px, py]
      }
    }
  }
  return best
}

function closestOnSegment(
  lng: number,
  lat: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): [number, number] {
  const dx = bx - ax
  const dy = by - ay
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return [ax, ay]
  let t = ((lng - ax) * dx + (lat - ay) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  return [ax + t * dx, ay + t * dy]
}

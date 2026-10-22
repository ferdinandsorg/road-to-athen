/** Flatten [lng, lat, ele?] → [lng, lat] for 2D MapLibre line layers. */

function to2d(c: GeoJSON.Position): GeoJSON.Position {
  return [c[0]!, c[1]!]
}

function flattenGeometryCoords(
  geometry: GeoJSON.Geometry | null | undefined,
): GeoJSON.Position[] {
  if (!geometry) return []
  if (geometry.type === "LineString") {
    return geometry.coordinates.map(to2d)
  }
  if (geometry.type === "MultiLineString") {
    return geometry.coordinates.flatMap((ring) => ring.map(to2d))
  }
  return []
}

/** Coordinates for hover sync — accepts legacy Feature or FeatureCollection. */
export function lineCoordinates(
  line:
    | GeoJSON.Feature
    | GeoJSON.FeatureCollection
    | null
    | undefined,
): GeoJSON.Position[] {
  if (!line) return []
  if (line.type === "FeatureCollection") {
    const coords: GeoJSON.Position[] = []
    for (const f of line.features) {
      const part = flattenGeometryCoords(f.geometry)
      for (let i = 0; i < part.length; i++) {
        if (i === 0 && coords.length > 0) continue
        coords.push(part[i]!)
      }
    }
    return coords
  }
  return flattenGeometryCoords(line.geometry)
}

export function flattenFeature(feature: GeoJSON.Feature): GeoJSON.Feature {
  const g = feature.geometry
  if (!g) return feature
  if (g.type === "LineString") {
    return {
      ...feature,
      geometry: {
        type: "LineString",
        coordinates: g.coordinates.map(to2d),
      },
    }
  }
  if (g.type === "Point") {
    const c = g.coordinates
    return {
      ...feature,
      geometry: {
        type: "Point",
        coordinates: [c[0], c[1]],
      },
    }
  }
  return feature
}

/**
 * Normalize a route feature for MapLibre.
 * Transport segments are marked in the pipeline (`transport: true`).
 * Legacy single LineStrings without that flag stay solid (no gap heuristic —
 * that created false dashes on straight simplified roads).
 */
export function expandRouteFeature(feature: GeoJSON.Feature): GeoJSON.Feature[] {
  const g = feature.geometry
  if (!g || g.type !== "LineString") return [flattenFeature(feature)]
  return [flattenFeature(feature)]
}

export function flattenFeatureCollection(
  fc: GeoJSON.FeatureCollection,
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: fc.features.flatMap((f) => {
      if (f.geometry?.type === "LineString" && f.properties?.kind == null) {
        return expandRouteFeature(f)
      }
      return [flattenFeature(f)]
    }),
  }
}

/** Detail stage line → FeatureCollection for the map (legacy Feature OK). */
export function flattenLineFeature(
  line:
    | GeoJSON.Feature
    | GeoJSON.FeatureCollection
    | GeoJSON.Feature<GeoJSON.LineString>,
): GeoJSON.FeatureCollection {
  if (line.type === "FeatureCollection") {
    return flattenFeatureCollection(line)
  }
  return { type: "FeatureCollection", features: expandRouteFeature(line) }
}

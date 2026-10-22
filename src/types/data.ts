export type Stage = {
  nr: number
  id: string
  name: string
  day: number
  startUtc: string
  timeZone: string
  distanceM: number
  movingTimeS: number
  elapsedTimeS: number
  elevationGainM: number
  avgSpeedMs: number
  avgTempC: number | null
  bbox: [number, number, number, number]
  start: [number, number]
  end: [number, number]
  mediaCount: number
}

export type StageDetail = {
  nr: number
  /**
   * Route as FeatureCollection of LineStrings.
   * Features with `transport: true` are non-ridden (ferry / car / tunnel).
   * Legacy single LineString features are still accepted by the client.
   */
  line:
    | GeoJSON.FeatureCollection
    | GeoJSON.Feature<GeoJSON.LineString>
  profile: [number, number][]
}

export type MediaItem = {
  id: string
  stageNr: number
  type: "photo" | "video"
  takenAt: string
  lat: number | null
  lng: number | null
  width: number
  height: number
  thumb: string
  medium: string
  video?: string
  caption?: string
}

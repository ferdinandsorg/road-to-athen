import { gunzipSync } from "node:zlib"
import { readFileSync } from "node:fs"
import { Decoder, Stream } from "@garmin/fitsdk"

const SEMICIRCLE = 180 / 2 ** 31

export type FitPoint = {
  lng: number
  lat: number
  ele: number
  distanceM: number
  timestamp: Date
}

export function readFitGz(filePath: string): FitPoint[] {
  const buf = gunzipSync(readFileSync(filePath))
  const stream = Stream.fromBuffer(buf)
  const decoder = new Decoder(stream)
  if (!decoder.isFIT() || !decoder.checkIntegrity()) {
    throw new Error(`Invalid FIT: ${filePath}`)
  }
  const { messages } = decoder.read()
  const records = (messages.recordMesgs ?? []) as Array<Record<string, unknown>>
  const points: FitPoint[] = []
  for (const r of records) {
    const latRaw = r.positionLat as number | undefined
    const lngRaw = r.positionLong as number | undefined
    if (latRaw == null || lngRaw == null) continue
    const lat = latRaw * SEMICIRCLE
    const lng = lngRaw * SEMICIRCLE
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
    const ele =
      (r.enhancedAltitude as number | undefined) ??
      (r.altitude as number | undefined) ??
      0
    const distanceM = (r.distance as number | undefined) ?? 0
    const timestamp = r.timestamp instanceof Date ? r.timestamp : new Date()
    points.push({ lng, lat, ele, distanceM, timestamp })
  }
  return points
}

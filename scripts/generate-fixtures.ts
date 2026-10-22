/**
 * Creates invented fixture data under fixtures/ for UI development.
 */
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import sharp from "sharp"
import type { MediaItem, Stage, StageDetail } from "../src/types/data.js"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const outData = path.join(root, "fixtures", "data")
const outMedia = path.join(root, "fixtures", "media")

function line(
  coords: [number, number, number][],
  nr: number,
): GeoJSON.Feature<GeoJSON.LineString> {
  return {
    type: "Feature",
    properties: { nr },
    geometry: { type: "LineString", coordinates: coords },
  }
}

async function solidWebp(
  file: string,
  size: number,
  color: { r: number; g: number; b: number },
) {
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 3,
      background: color,
    },
  })
    .webp({ quality: 80 })
    .toFile(file)
}

async function main() {
  mkdirSync(path.join(outData, "stages"), { recursive: true })
  mkdirSync(path.join(outMedia, "thumb"), { recursive: true })
  mkdirSync(path.join(outMedia, "medium"), { recursive: true })
  mkdirSync(path.join(outMedia, "video"), { recursive: true })

  // Invented routes near northern Greece → Athens corridor
  const routes: [number, number, number][][] = [
    [
      [22.94, 40.64, 120],
      [22.95, 40.5, 180],
      [22.98, 40.3, 220],
      [23.1, 40.1, 160],
      [23.2, 39.9, 140],
    ],
    [
      [23.2, 39.9, 140],
      [23.35, 39.7, 200],
      [23.5, 39.5, 280],
      [23.65, 39.3, 240],
      [23.72, 39.1, 180],
    ],
    [
      [23.72, 39.1, 180],
      [23.75, 38.8, 220],
      [23.72, 38.4, 160],
      [23.73, 38.0, 120],
      [23.7275, 37.9838, 90],
    ],
  ]

  const stages: Stage[] = routes.map((coords, i) => {
    const nr = i + 1
    const start = coords[0]!
    const end = coords[coords.length - 1]!
    const lngs = coords.map((c) => c[0])
    const lats = coords.map((c) => c[1])
    return {
      nr,
      id: `fixture-${nr}`,
      name: `Fixture Etappe ${nr}`,
      day: nr,
      startUtc: `2026-10-${10 + nr}T06:00:00.000Z`,
      timeZone: "Europe/Athens",
      distanceM: 80_000 + nr * 12_000,
      movingTimeS: 14_000 + nr * 600,
      elapsedTimeS: 16_000 + nr * 700,
      elevationGainM: 900 + nr * 200,
      avgSpeedMs: 5.2,
      avgTempC: 18 + nr,
      bbox: [
        Math.min(...lngs),
        Math.min(...lats),
        Math.max(...lngs),
        Math.max(...lats),
      ],
      start: [start[0], start[1]],
      end: [end[0], end[1]],
      mediaCount: 0,
    }
  })

  const overviewFeatures: GeoJSON.Feature[] = []
  for (const stage of stages) {
    const coords = routes[stage.nr - 1]!
    overviewFeatures.push(line(coords, stage.nr))
    overviewFeatures.push({
      type: "Feature",
      properties: {
        nr: stage.nr,
        kind: stage.nr === stages.length ? "finish" : "stage-end",
      },
      geometry: { type: "Point", coordinates: stage.end },
    })
  }
  overviewFeatures.push({
    type: "Feature",
    properties: { nr: 1, kind: "start" },
    geometry: { type: "Point", coordinates: stages[0]!.start },
  })

  const media: MediaItem[] = []
  const colors = [
    { r: 31, g: 38, b: 240 },
    { r: 80, g: 140, b: 200 },
    { r: 40, g: 90, b: 160 },
    { r: 200, g: 210, b: 230 },
    { r: 20, g: 60, b: 140 },
  ]

  let mediaIdx = 0
  for (const stage of stages) {
    const coords = routes[stage.nr - 1]!
    for (let j = 0; j < 3; j++) {
      mediaIdx++
      const id = `fix-media-${mediaIdx}`
      const c = coords[Math.min(j + 1, coords.length - 1)]!
      const color = colors[mediaIdx % colors.length]!
      await solidWebp(path.join(outMedia, "thumb", `${id}.webp`), 160, color)
      await solidWebp(path.join(outMedia, "medium", `${id}.webp`), 800, color)
      const isVideo = j === 2 && stage.nr === 2
      const noGps = j === 0 && stage.nr === 3
      media.push({
        id,
        stageNr: stage.nr,
        type: isVideo ? "video" : "photo",
        takenAt: `2026-10-${10 + stage.nr}T0${8 + j}:30:00+03:00`,
        lat: noGps ? null : c[1],
        lng: noGps ? null : c[0],
        width: 800,
        height: 800,
        thumb: `/media/thumb/${id}.webp`,
        medium: `/media/medium/${id}.webp`,
        video: isVideo ? undefined : undefined,
      })
    }
    // profile + detail
    const detail: StageDetail = {
      nr: stage.nr,
      line: line(coords, stage.nr),
      profile: coords.map((c, idx) => [
        (idx / (coords.length - 1)) * (stage.distanceM / 1000),
        c[2],
      ]),
    }
    writeFileSync(
      path.join(outData, "stages", `${stage.nr}.json`),
      JSON.stringify(detail, null, 2),
    )
    stage.mediaCount = media.filter((m) => m.stageNr === stage.nr).length
  }

  writeFileSync(path.join(outData, "stages.json"), JSON.stringify(stages, null, 2))
  writeFileSync(
    path.join(outData, "overview.geojson"),
    JSON.stringify({ type: "FeatureCollection", features: overviewFeatures }, null, 2),
  )
  writeFileSync(path.join(outData, "media.json"), JSON.stringify(media, null, 2))

  // Also copy into public/ so production builds can serve fixtures
  const publicFixtures = path.join(root, "public", "fixtures")
  rmSync(publicFixtures, { recursive: true, force: true })
  cpSync(path.join(root, "fixtures"), publicFixtures, { recursive: true })

  console.log(`fixtures: ${stages.length} stages, ${media.length} media`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

/**
 * Data pipeline: raw Strava export → public/data + public/media
 * Run by the user: npm run build:data [-- --force]
 * Logs counts and filenames only — never coordinates or times.
 */
import { createReadStream, existsSync, mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"
import { parse } from "csv-parse"
import tzLookup from "@photostructure/tz-lookup"
import { config } from "./config.js"
import { readFitGz } from "./lib/fit.js"
import {
  bboxOf,
  buildProfile,
  buildRouteParts,
  trimStartMeters,
} from "./lib/geo.js"
import {
  processPhoto,
  processVideo,
  readPhotoMeta,
  readVideoMetaExifttool,
} from "./lib/media.js"
import type { MediaItem, Stage, StageDetail } from "../src/types/data.js"

type CsvRow = string[]

async function readActivitiesCsv(file: string): Promise<CsvRow[]> {
  const rows: CsvRow[] = []
  const parser = createReadStream(file).pipe(
    parse({
      bom: true,
      delimiter: ";",
      relax_column_count: true,
      skip_empty_lines: true,
    }),
  )
  for await (const record of parser) {
    rows.push(record as CsvRow)
  }
  // drop header
  return rows.slice(1)
}

function parseGermanDateUtc(value: string): Date {
  // DD.MM.YYYY, HH:mm:ss (UTC)
  const m = value.match(
    /(\d{2})\.(\d{2})\.(\d{4}),\s*(\d{2}):(\d{2}):(\d{2})/,
  )
  if (!m) return new Date(NaN)
  return new Date(
    Date.UTC(
      Number(m[3]),
      Number(m[2]) - 1,
      Number(m[1]),
      Number(m[4]),
      Number(m[5]),
      Number(m[6]),
    ),
  )
}

function dayNumber(stages: { startUtc: string; timeZone: string }[]): number[] {
  const dayKeys: string[] = []
  return stages.map((s) => {
    const key = new Intl.DateTimeFormat("en-CA", {
      timeZone: s.timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(s.startUtc))
    if (!dayKeys.includes(key)) dayKeys.push(key)
    return dayKeys.indexOf(key) + 1
  })
}

async function main() {
  mkdirSync(config.outData, { recursive: true })
  mkdirSync(path.join(config.outData, "stages"), { recursive: true })
  mkdirSync(config.outMedia, { recursive: true })

  if (!existsSync(config.activitiesCsv)) {
    console.error("Missing raw/activities.csv — aborting.")
    process.exit(1)
  }

  const rows = await readActivitiesCsv(config.activitiesCsv)
  console.log(`CSV rows: ${rows.length}`)

  type StageDraft = {
    id: string
    name: string
    startUtc: string
    fitPath: string
    mediaRefs: string[]
    distanceM: number
    movingTimeS: number
    elapsedTimeS: number
    elevationGainM: number
    avgSpeedMs: number
    avgTempC: number | null
  }

  const drafts: StageDraft[] = []
  for (const row of rows) {
    const id = row[0] ?? ""
    const dateRaw = row[1] ?? ""
    const name = row[2] ?? ""
    const fitRel = row[12] ?? ""
    const elapsed = Number(row[15] ?? 0)
    const moving = Number(row[16] ?? 0)
    const distanceM = Number(row[17] ?? 0)
    const avgSpeedMs = Number(row[19] ?? 0)
    const elev = Number(row[20] ?? 0)
    const tempRaw = row[36]
    const avgTempC =
      tempRaw === "" || tempRaw == null ? null : Number(tempRaw)
    const mediaCell = row[102] ?? ""
    const mediaRefs = mediaCell
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s.replace(/^media\//, ""))

    const start = parseGermanDateUtc(dateRaw)
    drafts.push({
      id,
      name,
      startUtc: start.toISOString(),
      fitPath: path.join(config.rawDir, fitRel),
      mediaRefs,
      distanceM,
      movingTimeS: moving,
      elapsedTimeS: elapsed,
      elevationGainM: elev,
      avgSpeedMs,
      avgTempC: Number.isFinite(avgTempC as number) ? avgTempC : null,
    })
  }

  drafts.sort(
    (a, b) => new Date(a.startUtc).getTime() - new Date(b.startUtc).getTime(),
  )

  const stages: Stage[] = []
  const overviewFeatures: GeoJSON.Feature[] = []
  const allMedia: MediaItem[] = []
  const missingFiles: string[] = []
  let mediaWithoutPos = 0
  let oversizedVideos = 0

  const tzPlaceholders: string[] = []

  for (let i = 0; i < drafts.length; i++) {
    const d = drafts[i]!
    const nr = i + 1
    console.log(`Stage ${nr}/${drafts.length}: ${d.id}`)

    if (!existsSync(d.fitPath)) {
      missingFiles.push(d.fitPath)
      continue
    }

    let points = readFitGz(d.fitPath)
    if (nr === 1) {
      points = trimStartMeters(points, config.privacyTrimMeters)
    }
    if (points.length < 2) {
      console.log(`  skip: too few points`)
      continue
    }

    const startPt = points[0]!
    const endPt = points[points.length - 1]!
    const timeZone = tzLookup(startPt.lat, startPt.lng)
    tzPlaceholders.push(timeZone)

    const detailParts = buildRouteParts(
      points,
      { nr },
      config.detailSimplifyTolerance,
    )
    const profile = buildProfile(points, config.profilePoints)
    const bbox = bboxOf(points)

    const detail: StageDetail = {
      nr,
      line: { type: "FeatureCollection", features: detailParts },
      profile,
    }
    writeFileSync(
      path.join(config.outData, "stages", `${nr}.json`),
      JSON.stringify(detail),
    )

    const overviewParts = buildRouteParts(
      points,
      { nr },
      config.overviewSimplifyTolerance,
    )
    overviewFeatures.push(...overviewParts)
    overviewFeatures.push({
      type: "Feature",
      properties: {
        nr,
        kind: nr === drafts.length ? "finish" : "stage-end",
      },
      geometry: {
        type: "Point",
        coordinates: [endPt.lng, endPt.lat],
      },
    })
    if (nr === 1) {
      overviewFeatures.push({
        type: "Feature",
        properties: { nr: 1, kind: "start" },
        geometry: {
          type: "Point",
          coordinates: [startPt.lng, startPt.lat],
        },
      })
    }

    let mediaCount = 0
    for (const ref of d.mediaRefs) {
      const id = path.basename(ref, path.extname(ref))
      const ext = path.extname(ref).toLowerCase()
      const src = path.join(config.rawDir, "media", path.basename(ref))
      if (!existsSync(src)) {
        missingFiles.push(path.basename(ref))
        continue
      }

      try {
        if (ext === ".jpg" || ext === ".jpeg" || ext === ".png" || ext === ".heic") {
          const meta = await readPhotoMeta(src, id)
          const files = await processPhoto(src, id, config.outMedia, config.force)
          if (meta.lat == null || meta.lng == null) mediaWithoutPos++
          allMedia.push({
            id,
            stageNr: nr,
            type: "photo",
            takenAt: meta.takenAt ?? d.startUtc,
            lat: meta.lat,
            lng: meta.lng,
            width: files.width,
            height: files.height,
            thumb: files.thumb,
            medium: files.medium,
          })
          mediaCount++
        } else if (ext === ".mp4" || ext === ".mov") {
          const meta = readVideoMetaExifttool(src, id)
          const files = await processVideo(src, id, config.outMedia, config.force)
          if (files.oversize) {
            oversizedVideos++
            console.log(`  video over 25MB: ${id}.mp4`)
          }
          if (meta.lat == null || meta.lng == null) mediaWithoutPos++
          allMedia.push({
            id,
            stageNr: nr,
            type: "video",
            takenAt: meta.takenAt ?? d.startUtc,
            lat: meta.lat,
            lng: meta.lng,
            width: files.width,
            height: files.height,
            thumb: files.thumb,
            medium: files.medium,
            video: files.video,
          })
          mediaCount++
        }
      } catch (err) {
        console.log(`  media error: ${path.basename(ref)}`)
        void err
      }
    }

    stages.push({
      nr,
      id: d.id,
      name: d.name,
      day: 0,
      startUtc: d.startUtc,
      timeZone,
      distanceM: d.distanceM,
      movingTimeS: d.movingTimeS,
      elapsedTimeS: d.elapsedTimeS,
      elevationGainM: d.elevationGainM,
      avgSpeedMs: d.avgSpeedMs,
      avgTempC: d.avgTempC,
      bbox,
      start: [startPt.lng, startPt.lat],
      end: [endPt.lng, endPt.lat],
      mediaCount,
    })
  }

  const days = dayNumber(stages)
  stages.forEach((s, i) => {
    s.day = days[i] ?? s.nr
  })

  writeFileSync(
    path.join(config.outData, "stages.json"),
    JSON.stringify(stages, null, 2),
  )
  writeFileSync(
    path.join(config.outData, "overview.geojson"),
    JSON.stringify({ type: "FeatureCollection", features: overviewFeatures }),
  )
  writeFileSync(
    path.join(config.outData, "media.json"),
    JSON.stringify(allMedia, null, 2),
  )

  console.log("--- summary ---")
  console.log(`stages: ${stages.length}`)
  console.log(`media: ${allMedia.length}`)
  console.log(`media without position: ${mediaWithoutPos}`)
  console.log(`missing files: ${missingFiles.length}`)
  if (missingFiles.length) {
    for (const f of missingFiles) console.log(`  missing: ${path.basename(f)}`)
  }
  console.log(`videos over 25MB: ${oversizedVideos}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

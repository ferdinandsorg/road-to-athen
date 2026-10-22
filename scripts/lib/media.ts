import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, statSync, unlinkSync } from "node:fs"
import path from "node:path"
import sharp from "sharp"
import exifr from "exifr"

export type MediaMeta = {
  id: string
  type: "photo" | "video"
  takenAt: string | null
  lat: number | null
  lng: number | null
}

function ensureDir(dir: string) {
  mkdirSync(dir, { recursive: true })
}

export async function readPhotoMeta(
  filePath: string,
  id: string,
): Promise<MediaMeta> {
  // Do not use exifr `pick` here – it drops latitude/longitude even with gps:true.
  const data = (await exifr.parse(filePath, {
    gps: true,
    exif: true,
  })) as Record<string, unknown> | undefined

  let lat: number | null = null
  let lng: number | null = null
  if (
    typeof data?.latitude === "number" &&
    typeof data?.longitude === "number" &&
    !(data.latitude === 0 && data.longitude === 0)
  ) {
    lat = data.latitude
    lng = data.longitude
  }

  let takenAt: string | null = null
  const dto = data?.DateTimeOriginal ?? data?.CreateDate
  if (dto instanceof Date) {
    takenAt = dto.toISOString()
  }

  if (lat == null || lng == null || takenAt == null) {
    const fallback = readPhotoMetaExiftool(filePath, id)
    return {
      id,
      type: "photo",
      takenAt: takenAt ?? fallback.takenAt,
      lat: lat ?? fallback.lat,
      lng: lng ?? fallback.lng,
    }
  }

  return { id, type: "photo", takenAt, lat, lng }
}

/** Fallback when exifr misses GPS (common with some phone exports). */
export function readPhotoMetaExiftool(
  filePath: string,
  id: string,
): MediaMeta {
  try {
    const out = execFileSync(
      "exiftool",
      [
        "-json",
        "-n",
        "-DateTimeOriginal",
        "-OffsetTimeOriginal",
        "-GPSLatitude",
        "-GPSLongitude",
        filePath,
      ],
      { encoding: "utf8" },
    )
    const parsed = JSON.parse(out) as Array<Record<string, unknown>>
    const row = parsed[0] ?? {}
    let lat: number | null = null
    let lng: number | null = null
    if (
      typeof row.GPSLatitude === "number" &&
      typeof row.GPSLongitude === "number" &&
      !(row.GPSLatitude === 0 && row.GPSLongitude === 0)
    ) {
      lat = row.GPSLatitude
      lng = row.GPSLongitude
    }
    let takenAt: string | null = null
    if (typeof row.DateTimeOriginal === "string") {
      const m = row.DateTimeOriginal.match(
        /(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/,
      )
      if (m) {
        const offset =
          typeof row.OffsetTimeOriginal === "string"
            ? row.OffsetTimeOriginal
            : ""
        const isoLocal = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}${offset}`
        const d = new Date(isoLocal)
        takenAt = Number.isNaN(d.getTime()) ? null : d.toISOString()
      }
    }
    return { id, type: "photo", takenAt, lat, lng }
  } catch {
    return { id, type: "photo", takenAt: null, lat: null, lng: null }
  }
}

export async function processPhoto(
  src: string,
  id: string,
  outMedia: string,
  force: boolean,
): Promise<{ width: number; height: number; thumb: string; medium: string }> {
  const thumbDir = path.join(outMedia, "thumb")
  const mediumDir = path.join(outMedia, "medium")
  ensureDir(thumbDir)
  ensureDir(mediumDir)
  const thumb = path.join(thumbDir, `${id}.webp`)
  const medium = path.join(mediumDir, `${id}.webp`)

  if (!force && existsSync(thumb) && existsSync(medium)) {
    const meta = await sharp(medium).metadata()
    return {
      width: meta.width ?? 0,
      height: meta.height ?? 0,
      thumb: `/media/thumb/${id}.webp`,
      medium: `/media/medium/${id}.webp`,
    }
  }

  await sharp(src)
    .rotate()
    .resize(160, 160, { fit: "cover" })
    .webp({ quality: 80 })
    .toFile(thumb)

  const resized = await sharp(src)
    .rotate()
    .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true })

  await sharp(resized.data).toFile(medium)

  return {
    width: resized.info.width ?? 0,
    height: resized.info.height ?? 0,
    thumb: `/media/thumb/${id}.webp`,
    medium: `/media/medium/${id}.webp`,
  }
}

export async function processVideo(
  src: string,
  id: string,
  outMedia: string,
  force: boolean,
): Promise<{
  width: number
  height: number
  thumb: string
  medium: string
  video: string
  oversize: boolean
}> {
  const videoDir = path.join(outMedia, "video")
  const thumbDir = path.join(outMedia, "thumb")
  const mediumDir = path.join(outMedia, "medium")
  ensureDir(videoDir)
  ensureDir(thumbDir)
  ensureDir(mediumDir)

  const outVideo = path.join(videoDir, `${id}.mp4`)
  const posterTmp = path.join(mediumDir, `${id}-poster.jpg`)
  const thumb = path.join(thumbDir, `${id}.webp`)
  const medium = path.join(mediumDir, `${id}.webp`)

  if (force || !existsSync(outVideo)) {
    execFileSync(
      "ffmpeg",
      [
        "-y",
        "-i",
        src,
        "-vf",
        "scale=-2:720",
        "-c:v",
        "libx264",
        "-crf",
        "28",
        "-movflags",
        "+faststart",
        "-map_metadata",
        "-1",
        "-an",
        outVideo,
      ],
      { stdio: "pipe" },
    )
  }

  if (force || !existsSync(thumb) || !existsSync(medium)) {
    execFileSync(
      "ffmpeg",
      ["-y", "-ss", "1", "-i", outVideo, "-frames:v", "1", posterTmp],
      { stdio: "pipe" },
    )
    await sharp(posterTmp)
      .resize(160, 160, { fit: "cover" })
      .webp({ quality: 80 })
      .toFile(thumb)
    const info = await sharp(posterTmp)
      .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(medium)
    try {
      unlinkSync(posterTmp)
    } catch {
      /* ignore */
    }
    const oversize = statSync(outVideo).size > 25 * 1024 * 1024
    return {
      width: info.width ?? 1280,
      height: info.height ?? 720,
      thumb: `/media/thumb/${id}.webp`,
      medium: `/media/medium/${id}.webp`,
      video: `/media/video/${id}.mp4`,
      oversize,
    }
  }

  const meta = await sharp(medium).metadata()
  return {
    width: meta.width ?? 1280,
    height: meta.height ?? 720,
    thumb: `/media/thumb/${id}.webp`,
    medium: `/media/medium/${id}.webp`,
    video: `/media/video/${id}.mp4`,
    oversize: statSync(outVideo).size > 25 * 1024 * 1024,
  }
}

/** Best-effort video GPS/time via exiftool when available. */
export function readVideoMetaExifttool(
  filePath: string,
  id: string,
): MediaMeta {
  try {
    const out = execFileSync(
      "exiftool",
      ["-json", "-CreateDate", "-GPSCoordinates", "-n", filePath],
      { encoding: "utf8" },
    )
    const parsed = JSON.parse(out) as Array<Record<string, unknown>>
    const row = parsed[0] ?? {}
    let lat: number | null = null
    let lng: number | null = null
    const gps = row.GPSCoordinates
    if (typeof gps === "string") {
      const parts = gps.split(/[,\s]+/).map(Number)
      if (parts.length >= 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
        lat = parts[0]!
        lng = parts[1]!
        if (lat === 0 && lng === 0) {
          lat = null
          lng = null
        }
      }
    }
    let takenAt: string | null = null
    if (typeof row.CreateDate === "string") {
      // "2026:10:12 09:14:03" UTC typically
      const m = row.CreateDate.match(
        /(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/,
      )
      if (m) {
        takenAt = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`
      }
    }
    return { id, type: "video", takenAt, lat, lng }
  } catch {
    return { id, type: "video", takenAt: null, lat: null, lng: null }
  }
}

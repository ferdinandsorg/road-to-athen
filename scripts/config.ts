import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

export const config = {
  root,
  rawDir: path.join(root, "raw"),
  activitiesCsv: path.join(root, "raw", "activities.csv"),
  mediaCsv: path.join(root, "raw", "media.csv"),
  outData: path.join(root, "public", "data"),
  outMedia: path.join(root, "public", "media"),
  privacyTrimMeters: Number(process.env.PRIVACY_TRIM_METERS ?? 300),
  detailSimplifyTolerance: 0.00002,
  overviewSimplifyTolerance: 0.0005,
  profilePoints: 300,
  force: process.argv.includes("--force"),
} as const

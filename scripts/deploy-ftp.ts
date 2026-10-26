/**
 * Upload `dist/` via SFTP (IONOS/1&1 disables plain FTP).
 *
 * Required env (see `.env.example`):
 *   FTP_HOST, FTP_USER, FTP_PASSWORD
 * Optional:
 *   FTP_REMOTE_DIR  e.g. "/public_html"  (default "/")
 *   FTP_PORT        default 22 (SFTP)
 *   FTP_CLEAN       "true" = empty remote dir before upload (destructive!)
 *
 * Usage:
 *   npm run build && npm run deploy:ftp
 *   npm run deploy
 */
import SftpClient from "ssh2-sftp-client"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))

function loadEnvFile(filePath: string, override = false) {
  if (!fs.existsSync(filePath)) return
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq < 1) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (override || process.env[key] === undefined) {
      process.env[key] = val
    }
  }
}

loadEnvFile(path.join(root, ".env"))
loadEnvFile(path.join(root, ".env.local"), true)

const host = process.env.FTP_HOST?.trim()
const user = process.env.FTP_USER?.trim()
const password = process.env.FTP_PASSWORD
const remoteDir = (process.env.FTP_REMOTE_DIR?.trim() || "/").replace(
  /\/+$/,
  "",
) || "/"
const port = Number(process.env.FTP_PORT || 22)
const clean = process.env.FTP_CLEAN === "true"
const distDir = path.join(root, "dist")

function fail(msg: string): never {
  console.error(`\n✗ ${msg}\n`)
  process.exit(1)
}

if (!host || !user || password == null || password === "") {
  fail(
    "FTP_HOST, FTP_USER und FTP_PASSWORD müssen in .env / .env.local gesetzt sein.\n  Siehe .env.example",
  )
}

if (!fs.existsSync(distDir)) {
  fail("Ordner dist/ fehlt. Zuerst: npm run build")
}

const sftp = new SftpClient()

async function main() {
  console.log(`SFTP → ${host}:${port}`)
  console.log(`Lokal:  ${distDir}`)
  console.log(`Remote: ${remoteDir || "/"}`)
  if (clean) console.log("Modus: CLEAN (Remote-Inhalt wird gelöscht)")

  await sftp.connect({
    host,
    port,
    username: user,
    password,
    readyTimeout: 60_000,
  })

  const remote = remoteDir === "" ? "/" : remoteDir
  await sftp.mkdir(remote, true)

  if (clean) {
    console.log("Leere Remote-Verzeichnis …")
    const listing = await sftp.list(remote)
    for (const entry of listing) {
      const target = path.posix.join(remote, entry.name)
      if (entry.type === "d") {
        await sftp.rmdir(target, true)
      } else {
        await sftp.delete(target)
      }
    }
  }

  console.log("Lade dist/ hoch (kann bei Medien länger dauern) …")
  await sftp.uploadDir(distDir, remote)

  console.log("\n✓ Upload fertig.")
}

main()
  .catch((err) => {
    console.error("\n✗ SFTP-Upload fehlgeschlagen:", err)
    process.exit(1)
  })
  .finally(async () => {
    try {
      await sftp.end()
    } catch {
      /* ignore */
    }
  })

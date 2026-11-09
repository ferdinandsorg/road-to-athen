#!/usr/bin/env node
/**
 * Raster favicons from public/favicon.svg (Figma).
 * Does NOT touch public/og-leipzig-athen.jpg — that asset is maintained separately.
 *
 * Run: npm run build:social
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const out = path.join(root, "public")
const faviconSvg = fs.readFileSync(path.join(out, "favicon.svg"))

await sharp(faviconSvg)
  .resize(180, 180)
  .flatten({ background: "#ffffff" })
  .png()
  .toFile(path.join(out, "apple-touch-icon.png"))

await sharp(faviconSvg).resize(32, 32).png().toFile(path.join(out, "favicon-32.png"))

console.log("Wrote public/apple-touch-icon.png, favicon-32.png")

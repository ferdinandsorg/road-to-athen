#!/usr/bin/env node
/**
 * Build MapLibre SDF glyph PBFs for Uncut Sans (Regular / Bold / Italic).
 *
 * Requires:
 *   - system Python 3 with fonttools (`python3 -m pip install fonttools`)
 *   - npm package `fontnik` (native) — install once: `npm install -D fontnik`
 *
 * Output: public/fonts/Uncut Sans {Regular,Bold,Italic}/{range}.pbf
 */
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..")
const srcVar = path.join(root, "src/assets/fonts/UncutSans-Variable.ttf")
const tmpDir = path.join(root, "scripts/.font-tmp")
const outRoot = path.join(root, "public/fonts")

const faces = [
  {
    file: "UncutSans-Regular.ttf",
    stack: "Uncut Sans Regular",
    coords: { wght: 400, ital: 0 },
  },
  {
    file: "UncutSans-Bold.ttf",
    stack: "Uncut Sans Bold",
    coords: { wght: 700, ital: 0 },
  },
  {
    file: "UncutSans-Italic.ttf",
    stack: "Uncut Sans Italic",
    coords: { wght: 400, ital: 11 },
  },
]

function instantiate() {
  fs.mkdirSync(tmpDir, { recursive: true })
  const py = `
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
import os
src = ${JSON.stringify(srcVar)}
out = ${JSON.stringify(tmpDir)}
faces = ${JSON.stringify(faces.map((f) => [f.file, f.coords, f.stack]))}
for file, coords, stack in faces:
    font = instancer.instantiateVariableFont(TTFont(src), coords)
    # Stable PostScript / family names for MapLibre glyph metadata
    name = font["name"]
    for rec in name.names:
        if rec.nameID in (1, 4, 6, 16, 17):
            try:
                if rec.nameID == 1 or rec.nameID == 16:
                    rec.string = "Uncut Sans"
                elif rec.nameID == 2 or rec.nameID == 17:
                    rec.string = stack.replace("Uncut Sans ", "")
                elif rec.nameID == 4:
                    rec.string = stack
                elif rec.nameID == 6:
                    rec.string = stack.replace(" ", "")
            except Exception:
                pass
    path = os.path.join(out, file)
    font.save(path)
    print("instanced", path)
`
  execFileSync("python3", ["-c", py], { stdio: "inherit" })
}

async function generatePbfs() {
  let fontnik
  try {
    const require = createRequire(import.meta.url)
    fontnik = require("fontnik")
  } catch {
    console.error(
      "fontnik is not installed. Run: npm install -D fontnik && npm install-scripts approve fontnik",
    )
    process.exit(1)
  }
  const range = promisify(fontnik.range)

  for (const face of faces) {
    const buf = fs.readFileSync(path.join(tmpDir, face.file))
    const dir = path.join(outRoot, face.stack)
    fs.mkdirSync(dir, { recursive: true })
    let count = 0
    for (let start = 0; start < 65536; start += 256) {
      const end = start + 255
      const pbf = await range({ font: buf, start, end })
      if (pbf?.length) {
        fs.writeFileSync(path.join(dir, `${start}-${end}.pbf`), pbf)
        count++
      }
    }
    console.log(face.stack, "→", count, "ranges")
  }
}

instantiate()
await generatePbfs()
console.log("Done:", outRoot)

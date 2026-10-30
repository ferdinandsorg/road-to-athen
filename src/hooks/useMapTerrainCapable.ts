import { useEffect, useState } from "react"

/**
 * Whether this device should run MapLibre 3D terrain (DEM mesh).
 * Conservative on low-memory / reduced-motion / Save-Data clients.
 */
export function detectMapTerrainCapable(): boolean {
  if (typeof window === "undefined") return false

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return false
  }

  const nav = navigator as Navigator & {
    deviceMemory?: number
    connection?: { saveData?: boolean }
  }

  if (nav.connection?.saveData) return false

  const memory = nav.deviceMemory
  if (typeof memory === "number" && memory > 0 && memory < 4) {
    return false
  }

  const cores = navigator.hardwareConcurrency
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches
  if (
    coarsePointer &&
    typeof cores === "number" &&
    cores > 0 &&
    cores <= 4 &&
    typeof memory === "number" &&
    memory <= 4
  ) {
    return false
  }

  return true
}

export function useMapTerrainCapable(): boolean {
  const [capable, setCapable] = useState(() => detectMapTerrainCapable())

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)")
    const sync = () => setCapable(detectMapTerrainCapable())
    sync()
    motion.addEventListener("change", sync)
    return () => motion.removeEventListener("change", sync)
  }, [])

  return capable
}

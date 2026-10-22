export function formatKm(meters: number): string {
  return new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(meters / 1000)
}

export function formatElevation(meters: number): string {
  return new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 }).format(
    meters,
  )
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h <= 0) return `${m} min`
  return `${h}:${String(m).padStart(2, "0")} h`
}

export function formatSpeed(ms: number): string {
  const kmh = ms * 3.6
  return new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(kmh)
}

export function formatDate(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone,
  }).format(new Date(iso))
}

export function formatTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(new Date(iso))
}

export function formatTemp(c: number | null): string {
  if (c == null) return "—"
  return `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 }).format(c)} °C`
}

/** "Road to Athen 01 — Start" → "Start" (title after dash only). */
export function formatStageTitle(name: string): string {
  const parts = name.split(/\s*[—–-]\s+/)
  if (parts.length >= 2) {
    return parts.slice(1).join(" — ").trim() || name
  }
  return name.replace(/^Road to Athen\s*\d*\s*/i, "").trim() || name
}

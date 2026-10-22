import type { Stage } from "@/types/data"

/** Kind of place for the night after a stage (or rest day). */
export type SleepKind =
  | "tent"
  | "wild"
  | "camping"
  | "hotel"
  | "hostel"
  | "airbnb"
  | "friend"

export type SleepNight = {
  /** 1-based night index in the trip diary */
  night: number
  kind: SleepKind
  /** Place name (family, camp, hotel, …) */
  label: string
  detail?: string
  phone?: string
  /** Optional photo path, filled in later */
  image?: string
}

export type StageSleep = SleepNight & {
  /** Consecutive nights at this place (rest days included) */
  nights: number
  stageNr: number
}

/**
 * Diary nights in order. Night 1 = evening of first riding day (2026-09-07).
 * Duplicate consecutive places = rest days (same stay, multiple nights).
 */
const RAW: Array<{
  kind: SleepKind
  label: string
  detail?: string
  phone?: string
  image?: string
}> = [
  {
    kind: "tent",
    label: "Familie Klaeck",
    detail: "Fischerdorf 8, 01665 Klipphausen-Gauernitz",
    phone: "015773801664",
  },
  { kind: "wild", label: "Park4Night" },
  {
    kind: "camping",
    label: "Barbora Kemp",
    detail: "auf der Terrasse",
  },
  { kind: "wild", label: "Ferienlager" },
  {
    kind: "wild",
    label: "Schutzhütte",
  },
  { kind: "friend", label: "Susi" },
  { kind: "friend", label: "Susi" },
  { kind: "wild", label: "Freies Feld am Damm" },
  {
    kind: "camping",
    label: "Camping am Balaton",
  },
  { kind: "wild", label: "Bürgermeisterin zertifiziert" },
  { kind: "hotel", label: "Osijek" },
  { kind: "wild", label: "Am Fluss mit den 3 Boys" },
  { kind: "camping", label: "Eko Camping" },
  { kind: "hotel", label: "Old Town Residence" },
  { kind: "hotel", label: "Old Town Residence" },
  { kind: "wild", label: "Zip Line" },
  {
    kind: "camping",
    label: "Katun Camp Durmitor",
  },
  { kind: "wild", label: "Omi im Wald" },
  { kind: "hotel", label: "Implex" },
  { kind: "hotel", label: "Implex" },
  { kind: "wild", label: "Garten in Ferizaj" },
  { kind: "wild", label: "Mavrovo Lake" },
  { kind: "camping", label: "Camping Lira" },
  { kind: "camping", label: "Camping Lira" },
  { kind: "wild", label: "Cërrik" },
  {
    kind: "camping",
    label: "Eco Camping Valono",
  },
  { kind: "hostel", label: "Trip'n'Hostel Seaside" },
  { kind: "hostel", label: "Trip'n'Hostel Seaside" },
  { kind: "wild", label: "Strand zwischen deutschen Campern" },
  { kind: "camping", label: "Kalami" },
  { kind: "wild", label: "Taverne, Kanali" },
  { kind: "wild", label: "Ambrakischer Golf" },
  { kind: "wild", label: "Lagune Mesolongi" },
  { kind: "camping", label: "Akrata Beach Camping" },
  { kind: "wild", label: "Kirche" },
  { kind: "airbnb", label: "mit Johanna" },
  { kind: "airbnb", label: "mit Johanna" },
  { kind: "airbnb", label: "mit Johanna" },
  { kind: "airbnb", label: "mit Johanna" },
  { kind: "airbnb", label: "mit Johanna" },
]

const TRIP_START_UTC = Date.UTC(2026, 8, 7) // 2026-09-07

export const sleepNights: SleepNight[] = RAW.map((row, i) => ({
  night: i + 1,
  ...row,
}))

function sameStay(a: SleepNight, b: SleepNight): boolean {
  return a.kind === b.kind && a.label === b.label
}

function localDateKey(isoUtc: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(isoUtc))
  const year = parts.find((p) => p.type === "year")?.value
  const month = parts.find((p) => p.type === "month")?.value
  const day = parts.find((p) => p.type === "day")?.value
  return `${year}-${month}-${day}`
}

function nightDateKey(night: number): string {
  const ms = TRIP_START_UTC + (night - 1) * 86_400_000
  return new Date(ms).toISOString().slice(0, 10)
}

/**
 * Map each stage to the sleep place of that evening.
 * Rest-day duplicates increase `nights` on the arrival stage.
 * Same-day double stages: only the last stage of the day gets the overnight stay.
 */
export function buildStageSleeps(stages: Stage[]): Map<number, StageSleep> {
  const byDate = new Map<string, Stage[]>()
  for (const s of stages) {
    const key = localDateKey(s.startUtc, s.timeZone)
    const list = byDate.get(key) ?? []
    list.push(s)
    byDate.set(key, list)
  }
  for (const list of byDate.values()) {
    list.sort((a, b) => a.nr - b.nr)
  }

  const result = new Map<number, StageSleep>()

  let i = 0
  while (i < sleepNights.length) {
    const first = sleepNights[i]!
    let nights = 1
    while (
      i + nights < sleepNights.length &&
      sameStay(first, sleepNights[i + nights]!)
    ) {
      nights++
    }

    const dateKey = nightDateKey(first.night)
    const dayStages = byDate.get(dateKey)
    if (dayStages?.length) {
      const stage = dayStages[dayStages.length - 1]!
      const slice = sleepNights.slice(i, i + nights)
      result.set(stage.nr, {
        ...first,
        nights,
        stageNr: stage.nr,
        detail: slice.map((n) => n.detail).find((d) => d),
        phone: slice.map((n) => n.phone).find((p) => p),
        image: slice.map((n) => n.image).find((img) => img),
      })
    }

    i += nights
  }

  return result
}

export const sleepKindLabel: Record<SleepKind, string> = {
  tent: "One Night Tent",
  wild: "Wild",
  camping: "Campingplatz",
  hotel: "Hotel",
  hostel: "Hostel",
  airbnb: "Airbnb",
  friend: "Bei Freunden",
}

export function getStageSleep(
  stages: Stage[],
  stageNr: number,
): StageSleep | null {
  return buildStageSleeps(stages).get(stageNr) ?? null
}

/** Nights spent per sleep kind (rest-day duplicates count separately). */
export function countSleepNightsByKind(): Record<SleepKind, number> {
  const counts: Record<SleepKind, number> = {
    tent: 0,
    wild: 0,
    camping: 0,
    hotel: 0,
    hostel: 0,
    airbnb: 0,
    friend: 0,
  }
  for (const n of sleepNights) {
    counts[n.kind]++
  }
  return counts
}

/** Display order for overview sleep stats (only kinds with nights > 0). */
export const sleepKindOrder: SleepKind[] = [
  "wild",
  "camping",
  "hotel",
  "hostel",
  "airbnb",
  "friend",
  "tent",
]

/** Compact labels for the overview strip */
export const sleepKindShortLabel: Record<SleepKind, string> = {
  tent: "Zelt",
  wild: "Wild",
  camping: "Camping",
  hotel: "Hotel",
  hostel: "Hostel",
  airbnb: "Airbnb",
  friend: "Freunde",
}

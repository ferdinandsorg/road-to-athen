import type { Stage } from "@/types/data"

/**
 * Display numbers follow travel days (1…31).
 * Multiple stages on one day get letter suffixes: 16a, 16b, …
 */
export function buildStageDisplayLabels(
  stages: Stage[],
): Map<number, string> {
  const byDay = new Map<number, Stage[]>()
  for (const s of stages) {
    const list = byDay.get(s.day) ?? []
    list.push(s)
    byDay.set(s.day, list)
  }

  const labels = new Map<number, string>()
  for (const [day, dayStages] of byDay) {
    const sorted = [...dayStages].sort((a, b) => a.nr - b.nr)
    if (sorted.length === 1) {
      labels.set(sorted[0]!.nr, String(day))
    } else {
      sorted.forEach((s, i) => {
        labels.set(s.nr, `${day}${String.fromCharCode(97 + i)}`)
      })
    }
  }
  return labels
}

export function stageDisplayLabel(
  stage: Stage,
  labels: Map<number, string>,
): string {
  return labels.get(stage.nr) ?? String(stage.day)
}

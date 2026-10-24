import { useMemo } from "react"
import type { Stage } from "@/types/data"
import { Stat } from "@/components/Stat"
import { formatElevation, formatKm } from "@/lib/format"
import { countryCount } from "@/data/countries"
import {
  countSleepNightsByKind,
  sleepKindOrder,
  sleepKindShortLabel,
} from "@/data/sleeps"
import { sleepIcons } from "@/lib/sleep-icons"

type Props = {
  stages: Stage[]
}

export function OverviewStats({ stages }: Props) {
  const km = stages.reduce((a, s) => a + s.distanceM, 0)
  const elev = stages.reduce((a, s) => a + s.elevationGainM, 0)
  // Day 16 is two recordings (16a/16b) but one etappe — count unique days
  const etappen = new Set(stages.map((s) => s.day)).size

  const items = [
    { label: "Kilometer", value: formatKm(km), unit: "km" },
    { label: "Höhenmeter", value: formatElevation(elev), unit: "hm" },
    { label: "Etappen", value: String(etappen) },
    { label: "Länder", value: String(countryCount) },
  ]

  const sleepItems = useMemo(() => {
    const counts = countSleepNightsByKind()
    return sleepKindOrder
      .filter((kind) => counts[kind] > 0)
      .map((kind) => ({
        kind,
        label: sleepKindShortLabel[kind],
        value: String(counts[kind]),
        Icon: sleepIcons[kind],
      }))
  }, [])

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-2 gap-6">
        {items.map((item) => (
          <Stat
            key={item.label}
            label={item.label}
            value={item.value}
            unit={item.unit}
          />
        ))}
      </div>

      <div>
        <p className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Nächte
        </p>
        <ul className="flex flex-col gap-3">
          {sleepItems.map(({ kind, label, value, Icon }) => (
            <li key={kind} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
                <Icon
                  className="size-4 shrink-0 text-primary"
                  strokeWidth={2.25}
                  aria-hidden
                />
                {label}
              </span>
              <span className="stat-value">{value}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

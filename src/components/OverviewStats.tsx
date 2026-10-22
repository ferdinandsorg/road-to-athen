import { useMemo } from "react"
import type { Stage } from "@/types/data"
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
  const days = Math.max(...stages.map((s) => s.day), 0)
  const km = stages.reduce((a, s) => a + s.distanceM, 0)
  const elev = stages.reduce((a, s) => a + s.elevationGainM, 0)

  const items = [
    { label: "Tage", value: String(days) },
    { label: "Kilometer", value: formatKm(km) },
    { label: "Höhenmeter", value: formatElevation(elev) },
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
          <div key={item.label}>
            <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              {item.label}
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <div>
        <p className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Nächte
        </p>
        <div className="grid grid-cols-2 gap-4">
          {sleepItems.map(({ kind, label, value, Icon }) => (
            <div key={kind} className="flex items-start gap-2.5">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center bg-primary text-primary-foreground">
                <Icon className="size-4" strokeWidth={2.25} aria-hidden />
              </span>
              <div>
                <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                  {label}
                </p>
                <p className="mt-0.5 text-xl font-semibold tabular-nums">
                  {value}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

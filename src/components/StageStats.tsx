import type { Stage } from "@/types/data"
import {
  formatDuration,
  formatElevation,
  formatKm,
  formatSpeed,
  formatTemp,
  formatTime,
} from "@/lib/format"

type Props = {
  stage: Stage
}

function Stat({
  label,
  value,
  unit,
}: {
  label: string
  value: string
  unit?: string
}) {
  return (
    <div>
      <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold tabular-nums">
        {value}
        {unit ? (
          <span className="ml-1 text-sm font-normal text-muted-foreground">
            {unit}
          </span>
        ) : null}
      </p>
    </div>
  )
}

export function StageStats({ stage }: Props) {
  return (
    <div className="grid grid-cols-2 gap-6">
      <Stat label="Distanz" value={formatKm(stage.distanceM)} unit="km" />
      <Stat
        label="Höhenmeter"
        value={formatElevation(stage.elevationGainM)}
        unit="hm"
      />
      <Stat label="Fahrzeit" value={formatDuration(stage.movingTimeS)} />
      <Stat
        label="Ø Tempo"
        value={formatSpeed(stage.avgSpeedMs)}
        unit="km/h"
      />
      <Stat
        label="Start"
        value={formatTime(stage.startUtc, stage.timeZone)}
      />
      <Stat label="Ø Temp." value={formatTemp(stage.avgTempC)} />
    </div>
  )
}

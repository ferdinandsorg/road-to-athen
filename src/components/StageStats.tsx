import type { Stage } from "@/types/data"
import { Stat } from "@/components/Stat"
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

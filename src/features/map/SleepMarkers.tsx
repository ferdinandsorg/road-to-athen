import { useMemo } from "react"
import { Marker } from "react-map-gl/maplibre"
import type { Stage } from "@/types/data"
import { buildStageSleeps, sleepKindLabel } from "@/data/sleeps"
import { sleepIcons } from "@/lib/sleep-icons"
import { cn } from "@/lib/utils"

type Props = {
  stages: Stage[]
  /** Overview: tiny dots; stage view: icon markers */
  size?: "sm" | "md"
  /** Highlight the sleep marker for the open stage */
  activeStageNr?: number | null
  onSelectStage?: (nr: number) => void
}

export function SleepMarkers({
  stages,
  size = "md",
  activeStageNr = null,
  onSelectStage,
}: Props) {
  const sleeps = useMemo(() => buildStageSleeps(stages), [stages])

  const ends = useMemo(() => {
    return stages.map((s) => ({
      stage: s,
      sleep: sleeps.get(s.nr) ?? null,
    }))
  }, [stages, sleeps])

  const compact = size === "sm"

  return (
    <>
      {ends.map(({ stage, sleep }) => {
        const [lng, lat] = stage.end
        const active = activeStageNr === stage.nr

        // Overview: quiet dots only (no icons)
        if (compact) {
          return (
            <Marker
              key={`end-${stage.nr}`}
              longitude={lng}
              latitude={lat}
              anchor="center"
              onClick={
                onSelectStage
                  ? (e) => {
                      e.originalEvent.stopPropagation()
                      onSelectStage(stage.nr)
                    }
                  : undefined
              }
            >
              <button
                type="button"
                className={cn(
                  "block size-1.5 cursor-pointer rounded-full bg-primary",
                  !sleep && "bg-stage-end",
                )}
                aria-label={
                  sleep
                    ? `${sleepKindLabel[sleep.kind]}: ${sleep.label}`
                    : `Etappe ${stage.nr}`
                }
              />
            </Marker>
          )
        }

        if (!sleep) {
          return (
            <Marker
              key={`end-${stage.nr}`}
              longitude={lng}
              latitude={lat}
              anchor="center"
            >
              <span
                className="block size-2.5 rounded-full bg-stage-end"
                aria-hidden
              />
            </Marker>
          )
        }

        const Icon = sleepIcons[sleep.kind]
        return (
          <Marker
            key={`sleep-${stage.nr}`}
            longitude={lng}
            latitude={lat}
            anchor="center"
            onClick={(e) => {
              e.originalEvent.stopPropagation()
              onSelectStage?.(stage.nr)
            }}
          >
            <button
              type="button"
              className={cn(
                "flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground",
                active && "ring-2 ring-primary/40",
                onSelectStage && "cursor-pointer",
              )}
              aria-label={`${sleepKindLabel[sleep.kind]}: ${sleep.label}`}
            >
              <Icon className="size-3.5" strokeWidth={2.25} />
            </button>
          </Marker>
        )
      })}
    </>
  )
}

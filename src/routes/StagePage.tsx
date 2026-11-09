import { lazy, Suspense, useMemo } from "react"
import { useOutletContext } from "react-router-dom"
import { Separator } from "@/components/ui/separator"
import { StageStats } from "@/components/StageStats"
import { MediaStrip } from "@/components/MediaStrip"
import { SleepPlaceInfo } from "@/components/SleepPlaceInfo"

const ElevationProfile = lazy(() =>
  import("@/components/ElevationProfile").then((m) => ({
    default: m.ElevationProfile,
  })),
)
import { getStageSleep } from "@/data/sleeps"
import { useStageDetail } from "@/hooks/useTripData"
import { formatDate, formatStageTitle } from "@/lib/format"
import {
  buildStageDisplayLabels,
  stageDisplayLabel,
} from "@/lib/stage-labels"
import type { TripOutletContext } from "@/routes/TripLayout"

export function StagePage() {
  const {
    stages,
    media,
    activeNr,
    setHoverKm,
    openMedia,
    activeMediaId,
  } = useOutletContext<TripOutletContext>()

  const nr = activeNr
  const { detail } = useStageDetail(nr)
  const labels = useMemo(() => buildStageDisplayLabels(stages), [stages])
  const stage = nr != null ? (stages.find((s) => s.nr === nr) ?? null) : null

  const stageSleep = useMemo(
    () => (nr != null ? getStageSleep(stages, nr) : null),
    [stages, nr],
  )
  const items = useMemo(
    () => (nr != null ? media.filter((m) => m.stageNr === nr) : []),
    [media, nr],
  )

  if (!stage || nr == null) {
    return <p className="text-destructive">Etappe nicht gefunden</p>
  }

  return (
    <>
      <header className="min-w-0">
        <p className="section-label">
          Etappe {stageDisplayLabel(stage, labels)}
          <span className="font-normal normal-case tracking-normal">
            {" "}
            · {formatDate(stage.startUtc, stage.timeZone)}
          </span>
        </p>
        <h2 className="font-heading mt-1.5 text-2xl font-bold leading-tight tracking-tight break-words md:text-xl md:leading-snug">
          {formatStageTitle(stage.name)}
        </h2>
        {/^\d+$/.test(stage.id) ? (
          <a
            href={`https://www.strava.com/activities/${stage.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-sm text-muted-foreground no-underline transition-colors hover:text-primary hover:no-underline"
          >
            Auf Strava ansehen ↗
          </a>
        ) : null}
      </header>

      <Separator className="bg-border" />
      <StageStats stage={stage} />

      {detail && (
        <Suspense fallback={null}>
          <ElevationProfile profile={detail.profile} onHoverKm={setHoverKm} />
        </Suspense>
      )}

      {items.length > 0 ? (
        <div>
          <p className="section-label mb-4">Fotos & Videos</p>
          <MediaStrip
            items={items}
            timeZone={stage.timeZone}
            activeId={activeMediaId}
            onSelect={openMedia}
          />
        </div>
      ) : null}

      {stageSleep && <SleepPlaceInfo sleep={stageSleep} />}
    </>
  )
}

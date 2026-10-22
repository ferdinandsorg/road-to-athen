import { useMemo } from "react"
import { useOutletContext } from "react-router-dom"
import { Separator } from "@/components/ui/separator"
import { StageStats } from "@/components/StageStats"
import { MediaStrip } from "@/components/MediaStrip"
import { MediaLightbox } from "@/components/MediaLightbox"
import { ElevationProfile } from "@/components/ElevationProfile"
import { SleepPlaceInfo } from "@/components/SleepPlaceInfo"
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
    activeMediaId,
    setActiveMediaId,
    lightboxOpen,
    setLightboxOpen,
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
      <div className="min-w-0">
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Etappe {stageDisplayLabel(stage, labels)}
          <span className="font-normal normal-case tracking-normal">
            {" "}
            · {formatDate(stage.startUtc, stage.timeZone)}
          </span>
        </p>
        <h2 className="font-heading mt-2 text-lg font-bold leading-snug tracking-tight break-words sm:text-xl">
          {formatStageTitle(stage.name)}
        </h2>
        {/^\d+$/.test(stage.id) ? (
          <a
            href={`https://www.strava.com/activities/${stage.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-sm text-primary no-underline hover:no-underline"
          >
            Auf Strava ansehen ↗
          </a>
        ) : null}
      </div>

      <Separator />
      <StageStats stage={stage} />

      {detail && (
        <ElevationProfile profile={detail.profile} onHoverKm={setHoverKm} />
      )}

      <div>
        <p className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Fotos & Videos
        </p>
        <MediaStrip
          items={items}
          timeZone={stage.timeZone}
          activeId={activeMediaId}
          onSelect={(item) => {
            setActiveMediaId(item.id)
            setLightboxOpen(true)
          }}
        />
      </div>

      {stageSleep && <SleepPlaceInfo sleep={stageSleep} />}

      <MediaLightbox
        items={items}
        open={lightboxOpen}
        startId={activeMediaId}
        timeZone={stage.timeZone}
        onOpenChange={setLightboxOpen}
      />
    </>
  )
}

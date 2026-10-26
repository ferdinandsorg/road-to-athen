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
    goToStage,
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

  /** Next stage that has media — for lightbox “continue” on the last slide. */
  const nextStageMedia = useMemo(() => {
    if (nr == null) return null
    const ordered = [...stages].sort((a, b) => a.nr - b.nr)
    const i = ordered.findIndex((s) => s.nr === nr)
    if (i < 0) return null
    for (let j = i + 1; j < ordered.length; j++) {
      const s = ordered[j]!
      const stageItems = media
        .filter((m) => m.stageNr === s.nr)
        .sort(
          (a, b) =>
            new Date(a.takenAt).getTime() - new Date(b.takenAt).getTime(),
        )
      const first = stageItems[0]
      if (first) return { nr: s.nr, firstId: first.id }
    }
    return null
  }, [stages, media, nr])

  function goNextStageInLightbox() {
    if (!nextStageMedia) return
    setActiveMediaId(nextStageMedia.firstId)
    setLightboxOpen(true)
    goToStage(nextStageMedia.nr)
  }

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
        line={detail?.line}
        bbox={stage.bbox}
        onOpenChange={setLightboxOpen}
        onNextStage={nextStageMedia ? goNextStageInLightbox : undefined}
      />
    </>
  )
}

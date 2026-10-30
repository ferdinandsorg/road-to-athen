import { useEffect, useMemo, useRef, useState } from "react"
import type { Stage } from "@/types/data"
import {
  buildStageSpans,
  stageNrAtProgress,
  type StageSpan,
} from "@/lib/route-progress"
import {
  buildStageDisplayLabels,
  stageDisplayLabel,
} from "@/lib/stage-labels"
import { formatElevation, formatKm } from "@/lib/format"
import { useFreewheelSound } from "@/hooks/useFreewheelSound"
import { useIsMobile } from "@/hooks/useIsMobile"
import { cn } from "@/lib/utils"

type Props = {
  stages: Stage[]
  /** Controlled progress 0…1 along total distance. */
  progress: number
  activeStageNr: number | null
  onScrub: (progress: number) => void
  /** stage under playhead + exact progress (no snap to stage mid). */
  onScrubEnd: (stageNr: number, progress: number) => void
  onSelectStage: (stageNr: number) => void
  className?: string
}

/** One click per this many progress steps across the full bar (~80 clicks end-to-end). */
const SCRUB_TICK_STEPS = 80

/** Mobile: ~7 day marks visible; track grows so you scroll for the rest. */
const MOBILE_DAY_CELL_PX = 56

function progressFromClientX(el: HTMLElement, clientX: number): number {
  const rect = el.getBoundingClientRect()
  if (rect.width <= 0) return 0
  return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
}

export function StageTimeline({
  stages,
  progress,
  activeStageNr,
  onScrub,
  onScrubEnd,
  onSelectStage,
  className,
}: Props) {
  const desktopTrackRef = useRef<HTMLDivElement>(null)
  const mobileTrackRef = useRef<HTMLDivElement>(null)
  const mobileScrollRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)
  const [dragging, setDragging] = useState(false)
  const isMobile = useIsMobile()
  // Freewheel audio is noticeable CPU/audio work on phones — desktop only.
  const { tick, reset, unlock } = useFreewheelSound({ enabled: !isMobile })

  const labels = useMemo(() => buildStageDisplayLabels(stages), [stages])
  const { spans, totalM } = useMemo(() => buildStageSpans(stages), [stages])

  const totalElevM = useMemo(
    () => stages.reduce((sum, s) => sum + s.elevationGainM, 0),
    [stages],
  )

  const dayCount = useMemo(() => {
    const days = new Set(stages.map((s) => s.day))
    return Math.max(days.size, 1)
  }, [stages])

  const mobileTrackWidth = Math.max(
    dayCount + 1, // start “0” + each day end
    spans.length + 1,
  ) * MOBILE_DAY_CELL_PX

  const hoverInfo = useMemo(() => {
    const nr = stageNrAtProgress(spans, totalM, progress)
    const stage = stages.find((s) => s.nr === nr) ?? null
    const km = progress * totalM
    let elevM = 0
    for (const span of spans) {
      const s = stages.find((st) => st.nr === span.nr)
      if (!s) continue
      const len = span.endM - span.startM
      if (km >= span.endM) {
        elevM += s.elevationGainM
      } else if (km > span.startM && len > 0) {
        elevM += s.elevationGainM * ((km - span.startM) / len)
        break
      } else {
        break
      }
    }
    return { nr, stage, km, elevM }
  }, [spans, totalM, progress, stages])

  function emitScrub(next: number) {
    onScrub(next)
    tick(Math.floor(next * SCRUB_TICK_STEPS))
  }

  function endScrub(next: number) {
    draggingRef.current = false
    setDragging(false)
    reset()
    const stageNr = stageNrAtProgress(spans, totalM, next)
    if (stageNr != null) onScrubEnd(stageNr, next)
  }

  function bindScrubHandlers(
    trackRef: React.RefObject<HTMLDivElement | null>,
    opts?: { ignoreButtons?: boolean },
  ) {
    function onPointerDown(e: React.PointerEvent<HTMLElement>) {
      const el = trackRef.current
      if (!el) return
      if (
        opts?.ignoreButtons &&
        (e.target as HTMLElement).closest("button")
      ) {
        return
      }
      e.preventDefault()
      e.stopPropagation()
      unlock()
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      draggingRef.current = true
      setDragging(true)
      emitScrub(progressFromClientX(el, e.clientX))
    }

    function onPointerMove(e: React.PointerEvent<HTMLElement>) {
      if (!draggingRef.current) return
      const el = trackRef.current
      if (!el) return
      e.preventDefault()
      emitScrub(progressFromClientX(el, e.clientX))
    }

    function onPointerUp(e: React.PointerEvent<HTMLElement>) {
      if (!draggingRef.current) return
      const el = trackRef.current
      if (!el) return
      const next = progressFromClientX(el, e.clientX)
      emitScrub(next)
      endScrub(next)
    }

    return { onPointerDown, onPointerMove, onPointerUp }
  }

  const desktopScrub = bindScrubHandlers(desktopTrackRef, {
    ignoreButtons: true,
  })
  const mobileThumbScrub = bindScrubHandlers(mobileTrackRef)

  // Keep the playhead roughly centered in the mobile scroll window.
  useEffect(() => {
    if (dragging) return
    const scroll = mobileScrollRef.current
    const track = mobileTrackRef.current
    if (!scroll || !track || track.offsetWidth <= 0) return
    const x = progress * track.offsetWidth
    const nextLeft = x - scroll.clientWidth / 2
    scroll.scrollLeft = Math.max(0, Math.min(nextLeft, track.offsetWidth - scroll.clientWidth))
  }, [progress, dragging, mobileTrackWidth])

  const metaRow = (
    <div className="mt-1.5 flex items-center justify-between gap-3 text-[10px] uppercase tracking-wide text-muted-foreground md:mt-1 md:text-[10px]">
      <span className="tabular-nums">
        {hoverInfo.stage
          ? `Etappe ${stageDisplayLabel(hoverInfo.stage, labels)}`
          : "—"}
        {dragging ? " · Scrub" : ""}
      </span>
      <span className="flex flex-wrap items-center justify-end gap-x-3 tabular-nums">
        <span>
          {formatKm(hoverInfo.km)} / {formatKm(totalM)} km
        </span>
        <span>
          {formatElevation(hoverInfo.elevM)} /{" "}
          {formatElevation(totalElevM)} hm
        </span>
      </span>
    </div>
  )

  return (
    <div
      className={cn(
        // backdrop-blur over a live map is expensive on mobile GPUs.
        "w-full border bg-map-panel shadow-lg md:backdrop-blur",
        className,
      )}
      role="group"
      aria-label="Reisetimeline"
    >
      {/* ——— Mobile: scrollable scale; desktop-style playhead + invisible touch target ——— */}
      <div className="px-3 py-3 md:hidden">
        <div
          ref={mobileScrollRef}
          className="overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div
            ref={mobileTrackRef}
            className="relative select-none"
            style={{ width: mobileTrackWidth, height: 56 }}
            role="slider"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
            aria-label="Position auf der Route"
          >
            <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
            <ActiveSegment
              spans={spans}
              totalM={totalM}
              activeStageNr={activeStageNr}
            />
            <StageTicks
              spans={spans}
              totalM={totalM}
              stages={stages}
              activeStageNr={activeStageNr}
              onSelectStage={onSelectStage}
              size="lg"
            />
            <Playhead progress={progress} />
            {/* Invisible fat hit area — scrub without a visible square pin */}
            <button
              type="button"
              aria-label="Position ziehen"
              className="absolute top-0 bottom-0 z-10 w-11 -translate-x-1/2 touch-none cursor-ew-resize border-0 bg-transparent"
              style={{ left: `${progress * 100}%` }}
              onPointerDown={mobileThumbScrub.onPointerDown}
              onPointerMove={mobileThumbScrub.onPointerMove}
              onPointerUp={mobileThumbScrub.onPointerUp}
              onPointerCancel={mobileThumbScrub.onPointerUp}
            />
          </div>
        </div>
        <p className="mt-1.5 text-[10px] text-muted-foreground">
          Wischen: weitere Etappen · Playhead ziehen: scrubben
        </p>
        {metaRow}
      </div>

      {/* ——— Desktop: unchanged compact full-width track ——— */}
      <div className="hidden md:block">
        <div className="flex items-stretch">
          <div className="min-w-0 flex-1 px-3 py-2.5 sm:px-4 sm:py-3">
            <div
              ref={desktopTrackRef}
              className="relative h-11 cursor-ew-resize touch-none select-none sm:h-12"
              onPointerDown={desktopScrub.onPointerDown}
              onPointerMove={desktopScrub.onPointerMove}
              onPointerUp={desktopScrub.onPointerUp}
              onPointerCancel={desktopScrub.onPointerUp}
              role="slider"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress * 100)}
              aria-label="Position auf der Route"
              tabIndex={0}
              onKeyDown={(e) => {
                const delta =
                  e.key === "ArrowRight" || e.key === "ArrowUp"
                    ? 0.01
                    : e.key === "ArrowLeft" || e.key === "ArrowDown"
                      ? -0.01
                      : 0
                if (!delta) return
                e.preventDefault()
                const next = Math.min(1, Math.max(0, progress + delta))
                emitScrub(next)
                if (e.key === "Enter") endScrub(next)
              }}
            >
              <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
              <ActiveSegment
                spans={spans}
                totalM={totalM}
                activeStageNr={activeStageNr}
              />
              <StageTicks
                spans={spans}
                totalM={totalM}
                stages={stages}
                activeStageNr={activeStageNr}
                onSelectStage={onSelectStage}
              />
              <Playhead progress={progress} />
            </div>
            {metaRow}
          </div>
        </div>
      </div>
    </div>
  )
}

function ActiveSegment({
  spans,
  totalM,
  activeStageNr,
  thick = false,
}: {
  spans: StageSpan[]
  totalM: number
  activeStageNr: number | null
  thick?: boolean
}) {
  if (activeStageNr == null || totalM <= 0) return null
  const span = spans.find((s) => s.nr === activeStageNr)
  if (!span) return null
  const left = (span.startM / totalM) * 100
  const width = ((span.endM - span.startM) / totalM) * 100
  if (width <= 0) return null
  return (
    <div
      className={cn(
        "pointer-events-none absolute top-1/2 -translate-y-1/2 bg-primary",
        thick ? "h-1" : "h-0.5",
      )}
      style={{ left: `${left}%`, width: `${width}%` }}
      aria-hidden
    />
  )
}

function Playhead({ progress }: { progress: number }) {
  return (
    <div
      className="pointer-events-none absolute top-0 bottom-0 w-px bg-primary"
      style={{ left: `${progress * 100}%` }}
    >
      <div className="absolute left-1/2 top-0 size-2 -translate-x-1/2 bg-primary" />
      <div className="absolute left-1/2 bottom-0 size-2 -translate-x-1/2 bg-primary" />
    </div>
  )
}

function StageTicks({
  spans,
  totalM,
  stages,
  activeStageNr,
  onSelectStage,
  size = "md",
}: {
  spans: StageSpan[]
  totalM: number
  stages: Stage[]
  activeStageNr: number | null
  onSelectStage: (nr: number) => void
  size?: "md" | "lg"
}) {
  if (totalM <= 0 || spans.length === 0) return null

  const firstNr = spans[0]!.nr
  const activeStage = stages.find((s) => s.nr === activeStageNr) ?? null
  const large = size === "lg"

  /**
   * Boundary marks: 0 at start, day number at each calendar day’s end.
   * Same-day stages (16a/16b): unlabeled tick between them, one “16” at day’s end.
   */
  const marks: {
    key: string
    leftPct: number
    label: string | null
    stageNr: number
    active: boolean
  }[] = [
    {
      key: "start-0",
      leftPct: 0,
      label: "0",
      stageNr: firstNr,
      active: activeStageNr === firstNr,
    },
  ]

  for (let i = 0; i < spans.length; i++) {
    const span = spans[i]!
    const stage = stages.find((s) => s.nr === span.nr)
    if (!stage) continue
    const next = spans[i + 1]
    const nextStage = next
      ? stages.find((s) => s.nr === next.nr)
      : null
    const isLastOfDay = !nextStage || nextStage.day !== stage.day
    const leftPct = (span.endM / totalM) * 100

    if (!isLastOfDay) {
      marks.push({
        key: `split-${span.nr}`,
        leftPct,
        label: null,
        stageNr: nextStage!.nr,
        active: false,
      })
      continue
    }

    const firstOfDay =
      stages.find((s) => s.day === stage.day) ?? stage

    marks.push({
      key: `day-${stage.day}`,
      leftPct,
      label: String(stage.day),
      stageNr: firstOfDay.nr,
      active: activeStage?.day === stage.day,
    })
  }

  return (
    <>
      {marks.map((mark) => (
        <div
          key={mark.key}
          className="absolute top-0 bottom-0"
          style={{ left: `${mark.leftPct}%` }}
        >
          <div
            className={cn(
              "absolute top-1/2 w-px -translate-y-1/2 bg-foreground/35",
              mark.leftPct >= 100 ? "right-0" : "left-0",
              mark.active
                ? large
                  ? "h-7 bg-primary"
                  : "h-5 bg-primary"
                : large
                  ? "h-5"
                  : "h-3",
            )}
          />
          {mark.label != null && (
            <button
              type="button"
              className={cn(
                "absolute top-0 font-medium uppercase tracking-wider tabular-nums",
                large
                  ? "min-w-8 py-0.5 text-xs"
                  : "text-[9px] sm:text-[10px]",
                mark.leftPct <= 0
                  ? "left-0"
                  : mark.leftPct >= 100
                    ? "right-0"
                    : "left-0 -translate-x-1/2",
                mark.active ? "text-primary" : "text-muted-foreground",
              )}
              onClick={(e) => {
                e.stopPropagation()
                onSelectStage(mark.stageNr)
              }}
              aria-label={
                mark.label === "0"
                  ? "Zum Start / erste Etappe"
                  : `Etappe ${mark.label} öffnen`
              }
            >
              {mark.label}
            </button>
          )}
        </div>
      ))}
    </>
  )
}

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
  /** Mobile scrub hint — only useful on the trip overview. */
  showScrubHint?: boolean
  /**
   * When true, mobile track has no card chrome (parent TimelineSheet provides it).
   * Desktop unchanged.
   */
  embedded?: boolean
  className?: string
}

/** One click per this many progress steps across the full bar (~80 clicks end-to-end). */
const SCRUB_TICK_STEPS = 80

/** Mobile: ~7 day marks visible; track grows so you scroll for the rest. */
const MOBILE_DAY_CELL_PX = 56

/** Progress fraction near each end where the pin eases off center. */
const MOBILE_PIN_EDGE_ZONE = 0.2

/**
 * Soft pin travel: centered in the middle of the route; near start/end it
 * eases toward a small inset (smoothstep) so the first/last marks feel reachable.
 */
function mobilePinX(progress: number, viewW: number): number {
  const inset = Math.min(48, viewW * 0.18)
  const mid = viewW / 2
  if (viewW <= 0) return mid
  if (progress <= 0) return inset
  if (progress >= 1) return viewW - inset
  if (progress < MOBILE_PIN_EDGE_ZONE) {
    const t = progress / MOBILE_PIN_EDGE_ZONE
    const s = t * t * (3 - 2 * t)
    return inset + (mid - inset) * s
  }
  if (progress > 1 - MOBILE_PIN_EDGE_ZONE) {
    const t = (progress - (1 - MOBILE_PIN_EDGE_ZONE)) / MOBILE_PIN_EDGE_ZONE
    const s = t * t * (3 - 2 * t)
    return mid + (viewW - inset - mid) * s
  }
  return mid
}

/**
 * Left/right spacers equal the end-pin inset (not viewW/2). Then
 * scrollLeft ∈ [0, max] maps 1:1 to p ∈ [0, 1] under the soft pin —
 * no dead zone, no clamp-vs-momentum flicker at the ends.
 */
function mobileEdgePadPx(viewW: number): number {
  return mobilePinX(0, viewW)
}

/** scrollLeft that keeps mark at progress `p` under the soft pin. */
function scrollLeftForProgress(
  p: number,
  trackW: number,
  viewW: number,
): number {
  const leftPad = mobileEdgePadPx(viewW)
  return p * trackW + leftPad - mobilePinX(p, viewW)
}

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
  showScrubHint = false,
  embedded = false,
  className,
}: Props) {
  const desktopTrackRef = useRef<HTMLDivElement>(null)
  const mobileTrackRef = useRef<HTMLDivElement>(null)
  const mobileScrollRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)
  const mobileUserScrollRef = useRef(false)
  const mobileScrollEndTimer = useRef<number | null>(null)
  /** Ignore onScroll fired by programmatic scrollLeft sync. */
  const ignoreScrollUntilRef = useRef(0)
  const [dragging, setDragging] = useState(false)
  /** Scrollport width — edge pads are half of this so progress 0/1 can center. */
  const [mobileViewW, setMobileViewW] = useState(0)
  /**
   * Latest scrub progress for pin X. Controlled `progress` can lag a frame;
   * during scroll/drag the pin follows this so it doesn’t stutter.
   */
  const [pinProgress, setPinProgress] = useState(progress)
  /** Hint only until the first roller scrub. */
  const [showMobileHint, setShowMobileHint] = useState(true)
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
    setPinProgress(next)
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

  /**
   * Soft pin + inset spacers (see mobileEdgePadPx):
   * scrollLeft(p) = p*trackW + inset - mobilePinX(p, viewW).
   * DOM max scroll equals scrollLeft(1) — no clamp loop at the ends.
   */
  function progressFromMobileScroll(): number {
    const scroll = mobileScrollRef.current
    const track = mobileTrackRef.current
    if (!scroll || !track || track.offsetWidth <= 0) return 0
    const trackW = track.offsetWidth
    const viewW = scroll.clientWidth
    const target = scroll.scrollLeft
    let lo = 0
    let hi = 1
    for (let i = 0; i < 14; i++) {
      const mid = (lo + hi) / 2
      const at = scrollLeftForProgress(mid, trackW, viewW)
      if (at < target) lo = mid
      else hi = mid
    }
    const p = (lo + hi) / 2
    // Snap tiny binary-search noise at the hard ends.
    if (p < 0.001) return 0
    if (p > 0.999) return 1
    return p
  }

  function syncMobileScrollToProgress(p: number) {
    const scroll = mobileScrollRef.current
    const track = mobileTrackRef.current
    if (!scroll || !track || track.offsetWidth <= 0) return
    const nextLeft = scrollLeftForProgress(
      Math.min(1, Math.max(0, p)),
      track.offsetWidth,
      scroll.clientWidth,
    )
    if (Math.abs(scroll.scrollLeft - nextLeft) < 1) return
    ignoreScrollUntilRef.current = performance.now() + 120
    scroll.scrollLeft = nextLeft
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

  // Measure viewport for soft-pin inset spacers.
  useEffect(() => {
    const scroll = mobileScrollRef.current
    if (!scroll) return
    const measure = () => {
      setMobileViewW(scroll.clientWidth)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(scroll)
    return () => ro.disconnect()
  }, [])

  const mobileEdgePad =
    mobileViewW > 0 ? mobileEdgePadPx(mobileViewW) : 0
  const mobilePinLeft =
    mobileViewW > 0 ? mobilePinX(pinProgress, mobileViewW) : 0

  // External progress (stage change, desktop scrub) → keep mark under pin.
  useEffect(() => {
    if (mobileUserScrollRef.current || dragging) return
    setPinProgress(progress)
    syncMobileScrollToProgress(progress)
  }, [progress, dragging, mobileTrackWidth, mobileViewW])

  function onMobileScroll() {
    if (performance.now() < ignoreScrollUntilRef.current) return

    if (!mobileUserScrollRef.current) {
      mobileUserScrollRef.current = true
      unlock()
      setDragging(true)
      draggingRef.current = true
      setShowMobileHint(false)
    }

    const next = progressFromMobileScroll()
    emitScrub(next)

    if (mobileScrollEndTimer.current != null) {
      window.clearTimeout(mobileScrollEndTimer.current)
    }
    mobileScrollEndTimer.current = window.setTimeout(() => {
      mobileScrollEndTimer.current = null
      const next = progressFromMobileScroll()
      // Hold ignore so parent progress sync doesn’t yank scroll during settle.
      ignoreScrollUntilRef.current = performance.now() + 180
      mobileUserScrollRef.current = false
      endScrub(next)
    }, 140)
  }

  useEffect(() => {
    return () => {
      if (mobileScrollEndTimer.current != null) {
        window.clearTimeout(mobileScrollEndTimer.current)
      }
    }
  }, [])

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

  const scrubHint =
    showScrubHint && showMobileHint ? (
      <p className="mb-1 flex w-full justify-center text-[10px] leading-none text-muted-foreground md:hidden">
        Timeline wischen um Etappen zu sehen
      </p>
    ) : null

  return (
    <div className={cn("w-full", className)} role="group" aria-label="Reisetimeline">
      {/* Overview hint sits above the card unless embedded in TimelineSheet. */}
      {!embedded ? scrubHint : null}

      <div
        className={cn(
          "w-full",
          !embedded &&
            // backdrop-blur over a live map is expensive on mobile GPUs.
            "border bg-map-panel shadow-lg md:backdrop-blur",
        )}
      >
        {/* ——— Mobile: roller scale; soft pin at edges; spacers = pin inset ——— */}
        <div className={cn(embedded ? "md:hidden" : "px-3 py-3 md:hidden")}>
          {embedded ? scrubHint : null}
          <div className="relative">
            <div
              ref={mobileScrollRef}
              className="overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              onScroll={onMobileScroll}
            >
              {/*
                Flex row: spacers = soft-pin inset so scroll range matches p∈[0,1]
                under the moving pin (no end clamp / flicker). Baseline through spacers.
              */}
              <div className="flex w-max">
                <div
                  className="relative shrink-0"
                  style={{ width: mobileEdgePad, height: 56 }}
                  aria-hidden
                >
                  <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
                </div>
                <div
                  ref={mobileTrackRef}
                  className="relative shrink-0 select-none"
                  style={{ width: mobileTrackWidth, height: 56 }}
                  role="slider"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(pinProgress * 100)}
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
                </div>
                <div
                  className="relative shrink-0"
                  style={{ width: mobileEdgePad, height: 56 }}
                  aria-hidden
                >
                  <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
                </div>
              </div>
            </div>

            {/* Playhead — soft travel near start/end; centered in the middle. */}
            <div
              className="pointer-events-none absolute inset-y-0 z-20 -translate-x-1/2"
              style={{ left: mobilePinLeft }}
              aria-hidden
            >
              <div className="relative h-full w-px bg-primary">
                <div className="absolute left-1/2 top-0 size-2 -translate-x-1/2 bg-primary" />
                <div className="absolute left-1/2 bottom-0 size-2 -translate-x-1/2 bg-primary" />
              </div>
            </div>

            {/* Edge fades — skip on embedded (collapsed sheet is transparent over map). */}
            {!embedded ? (
              <>
                <div
                  className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-map-panel to-transparent"
                  aria-hidden
                />
                <div
                  className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-map-panel to-transparent"
                  aria-hidden
                />
              </>
            ) : null}
          </div>
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
              "absolute left-0 top-1/2 w-px -translate-y-1/2 bg-foreground/35",
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
                // Sit above the centered tick/playhead so digits don’t clip the line.
                "absolute top-0 left-0 -translate-x-1/2 font-medium uppercase tracking-wider tabular-nums",
                large
                  ? "min-w-8 -translate-y-1.5 py-0.5 text-xs"
                  : "-translate-y-1 text-[9px] sm:text-[10px]",
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

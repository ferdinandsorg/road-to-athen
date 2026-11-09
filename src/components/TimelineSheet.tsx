import { useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"

const SWIPE_VERTICAL_RATIO = 1.2
/** First open stop — map still clearly visible. */
const HALF_VH = 0.65
/** Second stop — more room for details. */
const TALL_VH = 0.8

export type TimelineSheetSnap = "collapsed" | "half" | "tall"

type Props = {
  snap: TimelineSheetSnap
  onSnapChange: (next: TimelineSheetSnap) => void
  header: ReactNode
  children: ReactNode
  footer?: ReactNode
}

function snapHeightPx(snap: TimelineSheetSnap, collapsedPx: number): number {
  if (snap === "collapsed") return collapsedPx
  const vh = snap === "tall" ? TALL_VH : HALF_VH
  return Math.round(window.innerHeight * vh)
}

function nearestSnap(
  heightPx: number,
  collapsedPx: number,
): TimelineSheetSnap {
  const half = Math.round(window.innerHeight * HALF_VH)
  const tall = Math.round(window.innerHeight * TALL_VH)
  const stops: { snap: TimelineSheetSnap; h: number }[] = [
    { snap: "collapsed", h: collapsedPx },
    { snap: "half", h: half },
    { snap: "tall", h: tall },
  ]
  let best = stops[0]!
  let bestDist = Math.abs(heightPx - best.h)
  for (const stop of stops.slice(1)) {
    const d = Math.abs(heightPx - stop.h)
    if (d < bestDist) {
      best = stop
      bestDist = d
    }
  }
  return best.snap
}

/**
 * Mobile bottom sheet driven by the timeline.
 * Snaps: collapsed → half (50%) → tall (75%).
 * Collapsed: only the timeline card is white over the map.
 */
export function TimelineSheet({
  snap,
  onSnapChange,
  header,
  children,
  footer,
}: Props) {
  const stackRef = useRef<HTMLDivElement>(null)
  const startRef = useRef<{
    y: number
    x: number
    height: number
  } | null>(null)
  const collapsedHeightRef = useRef(160)
  const [dragHeight, setDragHeight] = useState<number | null>(null)
  const dragging = dragHeight != null
  const open = snap !== "collapsed"

  // Keep collapsed height in sync for drag math (natural layout when closed).
  useLayoutEffect(() => {
    if (dragging || open) return
    const el = stackRef.current
    if (!el) return
    const h = el.getBoundingClientRect().height
    if (h > 0) collapsedHeightRef.current = h
  })

  function onHandlePointerDown(e: React.PointerEvent<HTMLElement>) {
    const el = stackRef.current
    const measured = el?.getBoundingClientRect().height
    const base =
      dragHeight ??
      (open
        ? snapHeightPx(snap, collapsedHeightRef.current)
        : (measured ?? collapsedHeightRef.current))
    if (!open && measured && measured > 0) {
      collapsedHeightRef.current = measured
    }
    startRef.current = { y: e.clientY, x: e.clientX, height: base }
    setDragHeight(base)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onHandlePointerMove(e: React.PointerEvent<HTMLElement>) {
    const start = startRef.current
    if (!start) return
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    if (
      Math.abs(dy) < 8 &&
      Math.abs(dx) > Math.abs(dy) * SWIPE_VERTICAL_RATIO
    ) {
      return
    }
    const maxH = Math.round(window.innerHeight * TALL_VH)
    const minH = collapsedHeightRef.current
    const next = Math.min(maxH, Math.max(minH, start.height - dy))
    setDragHeight(next)
  }

  function finishDrag(e: React.PointerEvent<HTMLElement>) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    const start = startRef.current
    const current = dragHeight
    startRef.current = null
    setDragHeight(null)
    if (start == null || current == null) return

    const minH = collapsedHeightRef.current
    const dy = e.clientY - start.y

    // Decisive flicks step one snap in that direction.
    if (dy < -40) {
      if (snap === "collapsed") onSnapChange("half")
      else if (snap === "half") onSnapChange("tall")
      else onSnapChange("tall")
      return
    }
    if (dy > 40) {
      if (snap === "tall") onSnapChange("half")
      else if (snap === "half") onSnapChange("collapsed")
      else onSnapChange("collapsed")
      return
    }

    onSnapChange(nearestSnap(current, minH))
  }

  function onHandlePointerCancel(e: React.PointerEvent<HTMLElement>) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    startRef.current = null
    setDragHeight(null)
  }

  const heightPx =
    dragHeight ??
    (open ? snapHeightPx(snap, collapsedHeightRef.current) : undefined)
  const showContent =
    open || (dragHeight != null && dragHeight > collapsedHeightRef.current + 24)

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col md:hidden">
      <div
        ref={stackRef}
        className={cn(
          "flex w-full flex-col",
          !open && !dragging && "px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
          dragging && "select-none",
        )}
        style={
          heightPx != null
            ? {
                height: heightPx,
                transition: dragging
                  ? "none"
                  : "height 280ms cubic-bezier(0.22, 1, 0.36, 1)",
              }
            : {
                transition: dragging
                  ? "none"
                  : "height 280ms cubic-bezier(0.22, 1, 0.36, 1)",
              }
        }
      >
        <div
          className="pointer-events-auto flex shrink-0 touch-none cursor-grab flex-col items-center active:cursor-grabbing"
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={finishDrag}
          onPointerCancel={onHandlePointerCancel}
        >
          <div
            className="relative flex w-full items-center justify-center py-1.5"
            aria-hidden
          >
            {/* Invisible hit target — visual grabber stays the same size. */}
            <span className="absolute inset-x-0 -top-3 -bottom-3" />
            <span className="h-1 w-8 bg-muted-foreground/40" />
          </div>
          <p className="sr-only">
            {snap === "collapsed"
              ? "Nach oben wischen für mehr Infos"
              : snap === "half"
                ? "Nach oben für größere Ansicht, nach unten zum Verkleinern"
                : "Nach unten wischen zum Verkleinern"}
          </p>
        </div>

        <div
          className={cn(
            "pointer-events-auto flex min-h-0 flex-1 flex-col transition-[background-color,box-shadow,border-color] duration-200",
            showContent
              ? "border border-x-0 border-b-0 bg-map-panel shadow-lg"
              : "border-transparent bg-transparent shadow-none",
          )}
          role="dialog"
          aria-modal={open}
          aria-expanded={open}
          aria-label={open ? "Etappen-Details" : "Reisetimeline"}
        >
          <div
            className={cn(
              "shrink-0 border bg-map-panel px-3 py-2.5 shadow-lg",
              showContent && "border-x-0 border-t-0 border-b-border shadow-none",
            )}
          >
            {header}
          </div>

          <div
            className={cn(
              "flex min-h-0 flex-1 flex-col overflow-hidden",
              !showContent && "hidden",
            )}
            inert={!showContent ? true : undefined}
          >
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pt-5 pb-5">
              <div className="flex flex-col gap-6">{children}</div>
            </div>
            {footer ? (
              <div className="shrink-0 border-t border-border bg-map-panel px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                {footer}
              </div>
            ) : (
              <div className="shrink-0 pb-[max(0.5rem,env(safe-area-inset-bottom))]" />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

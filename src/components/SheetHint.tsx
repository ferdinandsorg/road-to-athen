import { useRef } from "react"
import { Icons } from "@/lib/icons"

const SWIPE_UP_MIN_PX = 40
const SWIPE_VERTICAL_RATIO = 1.2

type Props = {
  onOpen: () => void
}

/**
 * One-shot mobile affordance above the stage timeline: quiet copy + grabber,
 * swipe-up (mostly vertical) or tap opens the details drawer.
 */
export function SheetHint({ onOpen }: Props) {
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const swipeReadyRef = useRef(false)
  const suppressClickRef = useRef(false)

  function onPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    startRef.current = { x: e.clientX, y: e.clientY }
    swipeReadyRef.current = false
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    const start = startRef.current
    if (!start) return
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    if (dy < -SWIPE_UP_MIN_PX && Math.abs(dy) > Math.abs(dx) * SWIPE_VERTICAL_RATIO) {
      swipeReadyRef.current = true
    }
  }

  function releasePointer(e: React.PointerEvent<HTMLButtonElement>) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }

  function onPointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    releasePointer(e)
    startRef.current = null
    if (!swipeReadyRef.current) return
    swipeReadyRef.current = false
    suppressClickRef.current = true
    onOpen()
  }

  function onPointerCancel(e: React.PointerEvent<HTMLButtonElement>) {
    releasePointer(e)
    startRef.current = null
    swipeReadyRef.current = false
  }

  function onClick() {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    onOpen()
  }

  return (
    <button
      type="button"
      aria-label="Mehr Infos — nach oben wischen oder tippen"
      className="mb-1.5 flex w-full touch-none flex-col items-center gap-1 py-1.5 text-muted-foreground outline-none"
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <span
        className="h-1 w-8 rounded-full bg-muted-foreground/30"
        aria-hidden
      />
      <span className="flex items-center gap-1 text-[10px] leading-none">
        <Icons.chevronUp className="size-3 shrink-0" strokeWidth={2} />
        Mehr Infos · nach oben wischen
      </span>
    </button>
  )
}

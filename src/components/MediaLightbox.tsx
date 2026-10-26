import { useEffect, useMemo, useRef, useState } from "react"
import type { MediaItem, StageDetail } from "@/types/data"
import { formatTime } from "@/lib/format"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel"
import { LightboxRouteOverlay } from "@/components/LightboxRouteOverlay"
import { Icons } from "@/lib/icons"
import { cn } from "@/lib/utils"
import type { BBox } from "@/lib/geo-fit"

type Props = {
  items: MediaItem[]
  open: boolean
  startId?: string | null
  timeZone: string
  /** Stage GPS line — drawn fixed over the photo. */
  line?: StageDetail["line"] | null
  bbox?: BBox | null
  onOpenChange: (open: boolean) => void
  /** On last slide: jump to first media of the next stage (lightbox stays open). */
  onNextStage?: () => void
}

/** White ← / → as OS cursor (hotspot centered) — sole nav affordance. */
const CURSOR_PREV = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>`,
)}") 16 16, w-resize`

const CURSOR_NEXT = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`,
)}") 16 16, e-resize`

type NavCursor = "prev" | "next" | "media"

function isVideoTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest("video"))
}

export function MediaLightbox({
  items,
  open,
  startId,
  timeZone,
  line = null,
  bbox = null,
  onOpenChange,
  onNextStage,
}: Props) {
  const [api, setApi] = useState<CarouselApi>()
  const [canScrollPrev, setCanScrollPrev] = useState(false)
  const [canScrollNext, setCanScrollNext] = useState(false)
  const [index, setIndex] = useState(0)
  const [navCursor, setNavCursor] = useState<NavCursor>("next")
  const videoRefs = useRef(new Map<string, HTMLVideoElement>())

  const sorted = useMemo(
    () =>
      [...items].sort(
        (a, b) =>
          new Date(a.takenAt).getTime() - new Date(b.takenAt).getTime(),
      ),
    [items],
  )

  const active = sorted[index] ?? null
  const atLast = sorted.length > 0 && index >= sorted.length - 1
  const canGoNextStage = Boolean(atLast && onNextStage)
  const point =
    active?.lng != null && active.lat != null
      ? { lng: active.lng, lat: active.lat }
      : null

  useEffect(() => {
    if (!api) return
    const sync = () => {
      setCanScrollPrev(api.canScrollPrev())
      setCanScrollNext(api.canScrollNext())
      setIndex(api.selectedScrollSnap())
    }
    sync()
    api.on("reInit", sync)
    api.on("select", sync)
    return () => {
      api.off("reInit", sync)
      api.off("select", sync)
    }
  }, [api])

  // Embla measures 0-width while the dialog is closed — reInit + jump on open.
  useEffect(() => {
    if (!open || !api) return
    const frame = requestAnimationFrame(() => {
      api.reInit()
      if (!startId) return
      const idx = sorted.findIndex((m) => m.id === startId)
      if (idx >= 0) api.scrollTo(idx, true)
    })
    return () => cancelAnimationFrame(frame)
  }, [open, api, startId, sorted])

  // Arrow keys — window listener so nav works even when focus is on Close.
  useEffect(() => {
    if (!open || !api) return
    const carousel = api
    function onKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLElement && e.target.closest("video")) {
        return
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault()
        carousel.scrollPrev()
      } else if (e.key === "ArrowRight") {
        e.preventDefault()
        // Stay on last slide — next stage only via the explicit button.
        if (carousel.canScrollNext()) carousel.scrollNext()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, api])

  // Autoplay the active video; pause siblings (and all when closed).
  useEffect(() => {
    for (const [id, video] of videoRefs.current) {
      if (open && id === active?.id) {
        video.currentTime = 0
        void video.play().catch(() => {
          /* Browser autoplay policy — controls remain usable. */
        })
      } else {
        video.pause()
      }
    }
  }, [open, active?.id])

  const cursorStyle =
    navCursor === "media"
      ? "auto"
      : navCursor === "prev"
        ? canScrollPrev
          ? CURSOR_PREV
          : "default"
        : canScrollNext
          ? CURSOR_NEXT
          : "default"

  function onNavPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (isVideoTarget(e.target)) {
      setNavCursor("media")
      return
    }
    const { left, width } = e.currentTarget.getBoundingClientRect()
    setNavCursor(e.clientX < left + width / 2 ? "prev" : "next")
  }

  function onNavClick(e: React.MouseEvent<HTMLDivElement>) {
    // Video keeps native controls — no prev/next steal.
    if (isVideoTarget(e.target)) return
    const { left, width } = e.currentTarget.getBoundingClientRect()
    if (e.clientX < left + width / 2) {
      if (canScrollPrev) api?.scrollPrev()
    } else if (canScrollNext) {
      api?.scrollNext()
    }
    // Last slide → next stage only via the “Nächste Etappe” button.
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "fixed inset-0 top-0 left-0 flex h-dvh w-screen max-w-none",
          "translate-x-0 translate-y-0 gap-0 rounded-none border-0",
          "bg-foreground/80 p-0 shadow-none sm:max-w-none",
          "data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100",
        )}
      >
        <DialogTitle className="sr-only">Medien</DialogTitle>

        <DialogClose
          className="absolute top-2 right-2 z-30 flex size-12 cursor-pointer items-center justify-center text-background opacity-80 transition-opacity hover:opacity-100 focus:outline-none"
          aria-label="Schließen"
        >
          <Icons.x className="size-6" strokeWidth={2} />
        </DialogClose>

        <Carousel
          setApi={setApi}
          opts={{ align: "start", containScroll: "trimSnaps", duration: 20 }}
          className="relative h-full w-full min-w-0"
          style={{ cursor: cursorStyle }}
          onPointerMove={onNavPointerMove}
          onClick={onNavClick}
        >
          <CarouselContent className="-ml-0 h-full">
            {sorted.map((item) => {
              const alt = `${item.type === "video" ? "Video" : "Foto"} Etappe ${item.stageNr}, ${formatTime(item.takenAt, timeZone)} Uhr`
              return (
                <CarouselItem
                  key={item.id}
                  className="flex h-dvh basis-full items-center justify-center pl-0"
                >
                  {item.type === "video" && item.video ? (
                    <video
                      ref={(el) => {
                        if (el) videoRefs.current.set(item.id, el)
                        else videoRefs.current.delete(item.id)
                      }}
                      src={item.video}
                      poster={item.medium}
                      controls
                      playsInline
                      preload="metadata"
                      className="relative z-20 max-h-[90dvh] max-w-[min(100%,90vw)] object-contain"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <track kind="captions" />
                    </video>
                  ) : (
                    <img
                      src={item.medium}
                      alt={alt}
                      className="max-h-[90dvh] max-w-[min(100%,90vw)] object-contain"
                      draggable={false}
                    />
                  )}
                </CarouselItem>
              )
            })}
          </CarouselContent>

          {line && bbox ? (
            <LightboxRouteOverlay line={line} bbox={bbox} point={point} />
          ) : null}
        </Carousel>

        {canGoNextStage ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onNextStage?.()
            }}
            className={cn(
              "absolute z-30 flex cursor-pointer flex-col items-center gap-2",
              // Mobile: bottom-right (thumb reach). Desktop: mid-right.
              "right-4 bottom-6 md:top-1/2 md:bottom-auto md:-translate-y-1/2",
              "rounded-none border-0 bg-transparent px-3 py-4 text-background outline-none",
              "opacity-90 transition-opacity hover:opacity-100",
            )}
            aria-label="Nächste Etappe"
          >
            <Icons.arrowRight className="size-8" strokeWidth={2} />
            <span className="text-sm font-medium tracking-wide">
              Nächste Etappe
            </span>
          </button>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

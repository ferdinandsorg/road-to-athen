import { useEffect, useMemo, useState } from "react"
import type { MediaItem } from "@/types/data"
import { formatTime } from "@/lib/format"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel"
import { Badge } from "@/components/ui/badge"

type Props = {
  items: MediaItem[]
  open: boolean
  startId?: string | null
  timeZone: string
  onOpenChange: (open: boolean) => void
}

export function MediaLightbox({
  items,
  open,
  startId,
  timeZone,
  onOpenChange,
}: Props) {
  const [api, setApi] = useState<CarouselApi>()

  const sorted = useMemo(
    () =>
      [...items].sort(
        (a, b) =>
          new Date(a.takenAt).getTime() - new Date(b.takenAt).getTime(),
      ),
    [items],
  )

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex w-[min(56rem,calc(100%-2rem))] max-w-none flex-col gap-0 overflow-hidden rounded-none border bg-card p-0 sm:max-w-none"
      >
        <DialogTitle className="sr-only">Medien</DialogTitle>
        <Carousel
          setApi={setApi}
          opts={{ align: "start", containScroll: "trimSnaps", duration: 20 }}
          className="w-full min-w-0"
        >
          <CarouselContent className="-ml-0">
            {sorted.map((item) => {
              const alt = `${item.type === "video" ? "Video" : "Foto"} Etappe ${item.stageNr}, ${formatTime(item.takenAt, timeZone)} Uhr`
              return (
                <CarouselItem key={item.id} className="pl-0 basis-full">
                  <div className="flex min-w-0 flex-col gap-4 p-6 md:p-8">
                    <div className="relative flex max-h-[70vh] min-h-0 w-full min-w-0 items-center justify-center overflow-hidden bg-muted">
                      {item.type === "video" && item.video ? (
                        <video
                          src={item.video}
                          poster={item.medium}
                          controls
                          className="max-h-[70vh] max-w-full object-contain"
                        >
                          <track kind="captions" />
                        </video>
                      ) : (
                        <img
                          src={item.medium}
                          alt={alt}
                          className="max-h-[70vh] max-w-full object-contain"
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {item.type === "video" && (
                        <Badge className="rounded-none">Video</Badge>
                      )}
                      <p className="text-sm text-muted-foreground">{alt}</p>
                    </div>
                  </div>
                </CarouselItem>
              )
            })}
          </CarouselContent>
          <CarouselPrevious className="left-2 rounded-none border bg-map-panel" />
          <CarouselNext className="right-2 rounded-none border bg-map-panel" />
        </Carousel>
      </DialogContent>
    </Dialog>
  )
}

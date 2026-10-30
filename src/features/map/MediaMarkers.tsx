import { Marker } from "react-map-gl/maplibre"
import type { MediaItem } from "@/types/data"
import { cn } from "@/lib/utils"

/** Soft cap on simultaneous HTML thumbnail markers (DOM + images). */
const DEFAULT_MAX_MARKERS = 40

type Props = {
  items: MediaItem[]
  activeId?: string | null
  onSelect: (item: MediaItem) => void
  /** Max markers to mount; active item is always kept when present. */
  maxMarkers?: number
}

function pickVisible(
  placed: MediaItem[],
  activeId: string | null | undefined,
  max: number,
): MediaItem[] {
  if (placed.length <= max) return placed
  const active = activeId
    ? placed.find((m) => m.id === activeId)
    : undefined
  const rest = placed.filter((m) => m.id !== activeId)
  const budget = active ? max - 1 : max
  const sliced = rest.slice(0, Math.max(0, budget))
  return active ? [active, ...sliced] : sliced
}

export function MediaMarkers({
  items,
  activeId,
  onSelect,
  maxMarkers = DEFAULT_MAX_MARKERS,
}: Props) {
  const placed = items.filter((m) => m.lat != null && m.lng != null)
  const visible = pickVisible(placed, activeId, maxMarkers)

  return (
    <>
      {visible.map((item) => (
        <Marker
          key={item.id}
          longitude={item.lng!}
          latitude={item.lat!}
          anchor="center"
          onClick={(e) => {
            e.originalEvent.stopPropagation()
            onSelect(item)
          }}
        >
          <button
            type="button"
            aria-label={
              item.type === "video"
                ? `Video Etappe ${item.stageNr}`
                : `Foto Etappe ${item.stageNr}`
            }
            className={cn(
              "size-6 cursor-pointer overflow-hidden rounded-none border-2 border-white shadow-md transition-transform duration-150 hover:scale-150",
              activeId === item.id && "scale-150 border-primary",
            )}
          >
            <img
              src={item.thumb}
              alt=""
              loading="lazy"
              decoding="async"
              className="size-full object-cover"
              draggable={false}
            />
          </button>
        </Marker>
      ))}
    </>
  )
}

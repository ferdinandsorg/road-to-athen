import { Marker } from "react-map-gl/maplibre"
import type { MediaItem } from "@/types/data"
import { cn } from "@/lib/utils"

type Props = {
  items: MediaItem[]
  activeId?: string | null
  onSelect: (item: MediaItem) => void
}

export function MediaMarkers({ items, activeId, onSelect }: Props) {
  const placed = items.filter((m) => m.lat != null && m.lng != null)

  return (
    <>
      {placed.map((item) => (
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
              className="size-full object-cover"
              draggable={false}
            />
          </button>
        </Marker>
      ))}
    </>
  )
}

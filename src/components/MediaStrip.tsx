import type { MediaItem } from "@/types/data"
import { formatTime } from "@/lib/format"
import { cn } from "@/lib/utils"

type Props = {
  items: MediaItem[]
  timeZone: string
  activeId?: string | null
  onSelect: (item: MediaItem) => void
}

export function MediaStrip({ items, timeZone, activeId, onSelect }: Props) {
  const sorted = [...items].sort(
    (a, b) => new Date(a.takenAt).getTime() - new Date(b.takenAt).getTime(),
  )
  if (sorted.length === 0) return null

  return (
    <div className="min-w-0 max-w-full overflow-x-auto">
      <ul className="flex w-max max-w-none gap-3 pb-2">
        {sorted.map((item) => {
          const alt = `${item.type === "video" ? "Video" : "Foto"} Etappe ${item.stageNr}, ${formatTime(item.takenAt, timeZone)} Uhr`
          return (
            <li key={item.id} className="shrink-0">
              <button
                type="button"
                onClick={() => onSelect(item)}
                className={cn(
                  "block size-16 overflow-hidden rounded-none border-2 border-transparent shadow-md transition-transform duration-150 hover:scale-110",
                  activeId === item.id && "border-primary",
                )}
              >
                <img
                  src={item.thumb}
                  alt={alt}
                  className="size-full object-cover"
                />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

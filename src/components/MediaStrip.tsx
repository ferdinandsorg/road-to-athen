import type { MediaItem } from "@/types/data"
import { formatTime } from "@/lib/format"

type Props = {
  items: MediaItem[]
  timeZone: string
  activeId?: string | null
  onSelect: (item: MediaItem) => void
}

export function MediaStrip({ items, timeZone, onSelect }: Props) {
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
                className="group block size-16 cursor-pointer overflow-hidden rounded-none"
              >
                <img
                  src={item.thumb}
                  alt={alt}
                  className="size-full object-cover transition-transform duration-150 group-hover:scale-110"
                />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

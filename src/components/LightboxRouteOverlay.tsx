import { useEffect, useMemo, useRef, useState } from "react"
import type { StageDetail } from "@/types/data"
import {
  createScreenProjector,
  nearestOnRoute,
  positionsToSvgPath,
  routeLineParts,
  type BBox,
} from "@/lib/geo-fit"

type Props = {
  line: StageDetail["line"] | null | undefined
  bbox: BBox
  /** Photo/video capture position; square hidden when null. */
  point: { lng: number; lat: number } | null
}

const MARKER = 10

export function LightboxRouteOverlay({ line, bbox, point }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect
      if (!box) return
      setSize({ w: box.width, h: box.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const parts = useMemo(() => routeLineParts(line), [line])
  const projector = useMemo(
    () => createScreenProjector(bbox, size.w, size.h),
    [bbox, size.w, size.h],
  )

  const paths = useMemo(() => {
    if (!projector) return []
    return parts.map((part, i) => ({
      key: i,
      d: positionsToSvgPath(part.coords, projector.project),
      transport: part.transport,
    }))
  }, [parts, projector])

  const marker = useMemo(() => {
    if (!projector || !point) return null
    const snapped = nearestOnRoute(point.lng, point.lat, parts) ?? [
      point.lng,
      point.lat,
    ]
    const [x, y] = projector.project(snapped[0], snapped[1])
    return { x, y }
  }, [projector, point, parts])

  return (
    <div
      ref={ref}
      className="pointer-events-none absolute inset-0 z-[25] text-background"
      aria-hidden
    >
      {projector && paths.length > 0 ? (
        <svg
          width={projector.width}
          height={projector.height}
          className="absolute inset-0 size-full overflow-visible"
        >
          {paths.map(({ key, d, transport }) => (
            <path
              key={key}
              d={d}
              fill="none"
              stroke="currentColor"
              strokeWidth={transport ? 1.5 : 2}
              strokeOpacity={transport ? 0.45 : 0.9}
              strokeDasharray={transport ? "6 6" : undefined}
              strokeLinejoin="miter"
              strokeLinecap="square"
            />
          ))}
          {marker ? (
            <rect
              x={marker.x - MARKER / 2}
              y={marker.y - MARKER / 2}
              width={MARKER}
              height={MARKER}
              fill="currentColor"
            />
          ) : null}
        </svg>
      ) : null}
    </div>
  )
}

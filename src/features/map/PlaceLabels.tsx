import { useEffect, useState } from "react"
import { Marker, useMap } from "react-map-gl/maplibre"
import { mapTheme } from "@/lib/map-theme"

type PlaceLabel = {
  id: string
  name: string
  lng: number
  lat: number
  kind: "country" | "capital"
}

function placeName(props: GeoJSON.GeoJsonProperties): string | null {
  if (!props) return null
  const name =
    (typeof props["name:de"] === "string" && props["name:de"]) ||
    (typeof props["name:latin"] === "string" && props["name:latin"]) ||
    (typeof props.name_en === "string" && props.name_en) ||
    (typeof props.name === "string" && props.name) ||
    null
  return name && name.trim() ? name.trim() : null
}

/**
 * HTML place labels (countries + capitals).
 * MapLibre GL symbol text was not painting despite loaded glyphs; Markers are reliable.
 */
export function PlaceLabels({
  enabled = true,
  /** Cap HTML markers (mobile uses a lower budget). */
  maxLabels = 120,
}: {
  enabled?: boolean
  maxLabels?: number
}) {
  const { current: mapRef } = useMap()
  const [labels, setLabels] = useState<PlaceLabel[]>([])

  useEffect(() => {
    if (!enabled) {
      setLabels([])
      return
    }
    const map = mapRef?.getMap()
    if (!map) return

    let cancelled = false
    let raf = 0

    const collect = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        if (cancelled) return
        try {
          if (!map.getSource("openmaptiles-places")) {
            setLabels([])
            return
          }
          const zoom = map.getZoom()
          const features = map.querySourceFeatures("openmaptiles-places", {
            sourceLayer: "place",
          })
          const seen = new Set<string>()
          const next: PlaceLabel[] = []

          for (const f of features) {
            const props = f.properties
            if (!props || f.geometry?.type !== "Point") continue
            const coords = f.geometry.coordinates
            if (!Array.isArray(coords) || coords.length < 2) continue
            const [lng, lat] = coords
            if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue

            const name = placeName(props)
            if (!name) continue

            const isCountry = props.class === "country"
            const isCapital =
              props.class === "city" && Number(props.capital) === 2

            if (!isCountry && !isCapital) continue
            if (isCountry && zoom > 10) continue
            if (isCapital && zoom < 3) continue

            const rank =
              typeof props.rank === "number" ? props.rank : Number(props.rank)
            if (isCountry && Number.isFinite(rank) && rank > 5) continue

            const key = `${isCountry ? "c" : "a"}:${name}`
            if (seen.has(key)) continue
            seen.add(key)

            next.push({
              id: key,
              name,
              lng,
              lat,
              kind: isCountry ? "country" : "capital",
            })
            if (next.length >= maxLabels) break
          }

          // Prefer countries, then capitals — stable visual hierarchy
          next.sort((a, b) => {
            if (a.kind !== b.kind) return a.kind === "country" ? -1 : 1
            return a.name.localeCompare(b.name, "de")
          })

          setLabels(next.slice(0, maxLabels))
        } catch {
          /* source not ready */
        }
      })
    }

    collect()
    map.on("moveend", collect)
    map.on("zoomend", collect)
    map.on("sourcedata", collect)
    map.on("style.load", collect)

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      map.off("moveend", collect)
      map.off("zoomend", collect)
      map.off("sourcedata", collect)
      map.off("style.load", collect)
    }
  }, [mapRef, enabled, maxLabels])

  if (!enabled) return null

  return (
    <>
      {labels.map((label) => (
        <Marker
          key={label.id}
          longitude={label.lng}
          latitude={label.lat}
          anchor={label.kind === "capital" ? "top" : "center"}
          offset={label.kind === "capital" ? [0, 6] : [0, 0]}
          style={{ pointerEvents: "none" }}
        >
          <div
            className={
              label.kind === "country"
                ? "whitespace-nowrap text-[12px] font-semibold tracking-wide md:text-[13px]"
                : "whitespace-nowrap text-[11px] font-medium md:text-[12px]"
            }
            style={{
              color:
                label.kind === "country"
                  ? mapTheme.labelCountry
                  : mapTheme.labelCapital,
              textShadow: `0 0 3px ${mapTheme.labelHalo}, 0 0 1px ${mapTheme.labelHalo}, 1px 1px 0 ${mapTheme.labelHalo}, -1px -1px 0 ${mapTheme.labelHalo}`,
            }}
          >
            {label.name}
          </div>
        </Marker>
      ))}
    </>
  )
}

import { useEffect, useState } from "react"
import {
  loadMedia,
  loadOverview,
  loadStageDetail,
  loadStages,
} from "@/lib/data"
import type { MediaItem, Stage, StageDetail } from "@/types/data"

export function useTripData() {
  const [stages, setStages] = useState<Stage[]>([])
  const [overview, setOverview] = useState<GeoJSON.FeatureCollection | null>(
    null,
  )
  const [media, setMedia] = useState<MediaItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [s, o, m] = await Promise.all([
          loadStages(),
          loadOverview(),
          loadMedia(),
        ])
        if (cancelled) return
        setStages(s)
        setOverview(o)
        setMedia(m)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Laden fehlgeschlagen")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return { stages, overview, media, error, loading }
}

export function useStageDetail(nr: number | null) {
  const [detail, setDetail] = useState<StageDetail | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (nr == null) {
      setDetail(null)
      return
    }
    let cancelled = false
    setLoading(true)
    loadStageDetail(nr)
      .then((d) => {
        if (!cancelled) setDetail(d)
      })
      .catch(() => {
        if (!cancelled) setDetail(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [nr])

  return { detail, loading }
}

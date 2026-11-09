import { useEffect, useState } from "react"
import {
  loadMedia,
  loadOverview,
  loadStageDetail,
  loadStages,
} from "@/lib/data"
import type { MediaItem, Stage, StageDetail } from "@/types/data"

export function useTripData(options?: { loadMedia?: boolean }) {
  const wantMedia = options?.loadMedia ?? false
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
        // Overview first — media.json is large and only needed on stage routes.
        const [s, o] = await Promise.all([loadStages(), loadOverview()])
        if (cancelled) return
        setStages(s)
        setOverview(o)
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

  useEffect(() => {
    if (!wantMedia) return
    let cancelled = false
    loadMedia()
      .then((m) => {
        if (!cancelled) setMedia(m)
      })
      .catch(() => {
        /* stage can still render without media index */
      })
    return () => {
      cancelled = true
    }
  }, [wantMedia])

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

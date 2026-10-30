import { useEffect, useMemo, useRef, useState } from "react"
import { Outlet, useLocation, useMatch, useNavigate } from "react-router-dom"
import { Skeleton } from "@/components/ui/skeleton"
import { AppShell } from "@/components/AppShell"
import { StageTimeline } from "@/components/StageTimeline"
import { MapView } from "@/features/map/MapView"
import { MediaMarkers } from "@/features/map/MediaMarkers"
import { SleepMarkers } from "@/features/map/SleepMarkers"
import { useIsMobile } from "@/hooks/useIsMobile"
import { useMapTerrainCapable } from "@/hooks/useMapTerrainCapable"
import { useStageDetail, useTripData } from "@/hooks/useTripData"
import { lineCoordinates } from "@/lib/geo-display"
import { Icons } from "@/lib/icons"
import { cn } from "@/lib/utils"
import {
  buildRouteVertices,
  buildStageSpans,
  pointAtProgress,
  progressForStage,
} from "@/lib/route-progress"
import type { MediaItem, Stage } from "@/types/data"

export type TripOutletContext = {
  stages: Stage[]
  media: MediaItem[]
  activeNr: number | null
  setHoverKm: (km: number | null) => void
  openMedia: (item: MediaItem) => void
  activeMediaId: string | null
  setActiveMediaId: (id: string | null) => void
  lightboxOpen: boolean
  setLightboxOpen: (open: boolean) => void
  goToStage: (nr: number) => void
}

/**
 * Persistent shell: one MapLibre instance for overview ↔ stage so camera
 * (pitch / bounds) can ease instead of remounting.
 */
export function TripLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const stageMatch = useMatch("/etappe/:nr")
  const activeNr = stageMatch ? Number(stageMatch.params.nr) : null
  const isStage = activeNr != null && Number.isFinite(activeNr)

  const { stages, overview, media, error, loading } = useTripData()
  const { detail } = useStageDetail(isStage ? activeNr : null)
  const isMobile = useIsMobile()
  const terrainCapable = useMapTerrainCapable()

  const [collapsed, setCollapsed] = useState(false)
  const [resizeEpoch, setResizeEpoch] = useState(0)
  const [scrubProgress, setScrubProgress] = useState<number | null>(null)
  const [pinnedProgress, setPinnedProgress] = useState<number | null>(null)
  const [hoverKm, setHoverKm] = useState<number | null>(null)
  const [fitEpoch, setFitEpoch] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [activeMediaId, setActiveMediaId] = useState<string | null>(null)

  // Coalesce pointermove scrub into one React update per animation frame.
  const scrubRafRef = useRef<number | null>(null)
  const pendingScrubRef = useRef<number | null>(null)

  function flushScrubProgress() {
    scrubRafRef.current = null
    const next = pendingScrubRef.current
    if (next == null) return
    setScrubProgress(next)
  }

  function onScrubThrottled(p: number) {
    pendingScrubRef.current = p
    if (scrubRafRef.current != null) return
    scrubRafRef.current = requestAnimationFrame(flushScrubProgress)
  }

  function onScrubEndFlush(stageNr: number, p: number) {
    if (scrubRafRef.current != null) {
      cancelAnimationFrame(scrubRafRef.current)
      scrubRafRef.current = null
    }
    pendingScrubRef.current = null
    setPinnedProgress(p)
    setScrubProgress(null)
    setFitEpoch((e) => e + 1)
    navigate(`/etappe/${stageNr}`, { state: { progress: p } })
  }

  useEffect(() => {
    return () => {
      if (scrubRafRef.current != null) {
        cancelAnimationFrame(scrubRafRef.current)
      }
    }
  }, [])

  const { spans, totalM } = useMemo(() => buildStageSpans(stages), [stages])
  const vertices = useMemo(() => buildRouteVertices(overview), [overview])

  const overviewBounds = useMemo(() => {
    if (!stages.length) return null
    let minLng = Infinity
    let minLat = Infinity
    let maxLng = -Infinity
    let maxLat = -Infinity
    for (const s of stages) {
      minLng = Math.min(minLng, s.bbox[0])
      minLat = Math.min(minLat, s.bbox[1])
      maxLng = Math.max(maxLng, s.bbox[2])
      maxLat = Math.max(maxLat, s.bbox[3])
    }
    return [minLng, minLat, maxLng, maxLat] as [
      number,
      number,
      number,
      number,
    ]
  }, [stages])

  const stage = isStage
    ? (stages.find((s) => s.nr === activeNr) ?? null)
    : null

  // Pick up scrub progress passed via navigate state
  useEffect(() => {
    const state = location.state as { progress?: number } | null
    if (typeof state?.progress === "number" && Number.isFinite(state.progress)) {
      setPinnedProgress(state.progress)
    }
  }, [location.pathname, location.state])

  // Leaving a stage clears elevation hover
  useEffect(() => {
    if (!isStage) setHoverKm(null)
  }, [isStage])

  const stageProgress = useMemo(() => {
    if (!isStage || totalM <= 0) return 0
    return progressForStage(spans, totalM, activeNr!, "mid")
  }, [isStage, spans, totalM, activeNr])

  const progress = scrubProgress ?? pinnedProgress ?? stageProgress
  const scrubbing = scrubProgress != null

  const followPoint = useMemo(() => {
    if (!scrubbing) return null
    return pointAtProgress(vertices, progress)
  }, [scrubbing, vertices, progress])

  const hoverPoint = useMemo<[number, number] | null>(() => {
    if (scrubbing || hoverKm == null || !detail?.line) return null
    const coords = lineCoordinates(detail.line)
    if (!coords.length) return null
    const profile = detail.profile
    if (!profile.length) return null
    let bestIdx = 0
    let bestDiff = Infinity
    profile.forEach(([km], i) => {
      const d = Math.abs(km - hoverKm)
      if (d < bestDiff) {
        bestDiff = d
        bestIdx = i
      }
    })
    const t = bestIdx / Math.max(profile.length - 1, 1)
    const ci = Math.min(
      coords.length - 1,
      Math.round(t * (coords.length - 1)),
    )
    const c = coords[ci]!
    return [c[0]!, c[1]!]
  }, [hoverKm, detail, scrubbing])

  const fitBoundsTarget = isStage && stage ? stage.bbox : overviewBounds

  const mapPadding = useMemo(
    () => ({
      top: collapsed ? 120 : 80,
      bottom: 140,
      left: 40,
      right: 40,
    }),
    [collapsed],
  )

  const stageMedia = useMemo(
    () => (isStage ? media.filter((m) => m.stageNr === activeNr) : []),
    [media, isStage, activeNr],
  )

  const { prevStage, nextStage } = useMemo(() => {
    if (!isStage || activeNr == null) {
      return { prevStage: null, nextStage: null }
    }
    const ordered = [...stages].sort((a, b) => a.nr - b.nr)
    const i = ordered.findIndex((s) => s.nr === activeNr)
    if (i < 0) return { prevStage: null, nextStage: null }
    return {
      prevStage: i > 0 ? ordered[i - 1]! : null,
      nextStage: i < ordered.length - 1 ? ordered[i + 1]! : null,
    }
  }, [stages, isStage, activeNr])

  function openMedia(item: MediaItem) {
    setActiveMediaId(item.id)
    setLightboxOpen(true)
  }

  function goToStage(nr: number) {
    setScrubProgress(null)
    setPinnedProgress(null)
    setFitEpoch((e) => e + 1)
    navigate(`/etappe/${nr}`)
  }

  function goOverview() {
    setScrubProgress(null)
    setPinnedProgress(null)
    setHoverKm(null)
    setFitEpoch((e) => e + 1)
    navigate("/")
  }

  const outletContext: TripOutletContext = {
    stages,
    media,
    activeNr: isStage ? activeNr : null,
    setHoverKm,
    openMedia,
    activeMediaId,
    setActiveMediaId,
    lightboxOpen,
    setLightboxOpen,
    goToStage,
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Skeleton className="h-12 w-64 rounded-none" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-destructive">
        {error}
      </div>
    )
  }

  return (
    <AppShell
      collapsed={collapsed}
      onCollapsedChange={setCollapsed}
      onMapLayoutSettled={() => setResizeEpoch((n) => n + 1)}
      sidebarFooter={
        isStage ? (
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={goOverview}
              className={cn(
                "flex h-9 cursor-pointer items-center gap-2 rounded-none border-0 px-2",
                "bg-transparent text-sm text-primary outline-none transition-colors duration-150",
                "hover:bg-primary hover:text-primary-foreground",
                "focus-visible:bg-primary focus-visible:text-primary-foreground",
              )}
            >
              <Icons.arrowLeft className="size-4 shrink-0" strokeWidth={2} />
              Zum Überblick
            </button>
            <div className="flex shrink-0 items-center gap-1">
              {prevStage ? (
                <button
                  type="button"
                  aria-label={`Etappe ${prevStage.nr} — vorherige`}
                  onClick={() => goToStage(prevStage.nr)}
                  className={cn(
                    "flex size-9 cursor-pointer items-center justify-center rounded-none border-0",
                    "bg-transparent text-primary outline-none transition-colors duration-150",
                    "hover:bg-primary hover:text-primary-foreground",
                    "focus-visible:bg-primary focus-visible:text-primary-foreground",
                  )}
                >
                  <Icons.arrowLeft className="size-4" strokeWidth={2} />
                </button>
              ) : null}
              {nextStage ? (
                <button
                  type="button"
                  aria-label={`Etappe ${nextStage.nr} — nächste`}
                  onClick={() => goToStage(nextStage.nr)}
                  className={cn(
                    "flex size-9 cursor-pointer items-center justify-center rounded-none border-0",
                    "bg-transparent text-primary outline-none transition-colors duration-150",
                    "hover:bg-primary hover:text-primary-foreground",
                    "focus-visible:bg-primary focus-visible:text-primary-foreground",
                  )}
                >
                  <Icons.arrowRight className="size-4" strokeWidth={2} />
                </button>
              ) : null}
            </div>
          </div>
        ) : undefined
      }
      map={
        <MapView
          overview={overview}
          activeStageNr={isStage ? activeNr : null}
          detailLine={isStage ? (detail?.line ?? null) : null}
          fitBoundsTarget={fitBoundsTarget}
          introBounds={overviewBounds}
          fitEpoch={fitEpoch}
          resizeEpoch={resizeEpoch}
          hoverPoint={hoverPoint}
          followPoint={followPoint}
          // 3D on stage when capable; liteMode (phones) skips DEM entirely in MapView.
          terrain3d={isStage && terrainCapable && !isMobile}
          liteMode={isMobile}
          padding={mapPadding}
          onStageSelect={goToStage}
          hideStageEnds
        >
          <SleepMarkers
            stages={stages}
            size={isStage ? "md" : "sm"}
            activeStageNr={isStage ? activeNr : null}
            onSelectStage={goToStage}
          />
          {isStage && (
            <MediaMarkers
              items={stageMedia}
              activeId={activeMediaId}
              onSelect={openMedia}
            />
          )}
        </MapView>
      }
      panel={<Outlet context={outletContext} />}
      timeline={
        <StageTimeline
          stages={stages}
          progress={progress}
          activeStageNr={isStage ? activeNr : null}
          onScrub={onScrubThrottled}
          onScrubEnd={onScrubEndFlush}
          onSelectStage={goToStage}
        />
      }
    />
  )
}

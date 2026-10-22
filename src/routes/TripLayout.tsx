import { useEffect, useMemo, useState } from "react"
import { Outlet, useLocation, useMatch, useNavigate } from "react-router-dom"
import { Skeleton } from "@/components/ui/skeleton"
import { AppShell } from "@/components/AppShell"
import { StageTimeline } from "@/components/StageTimeline"
import { MapView } from "@/features/map/MapView"
import { MediaMarkers } from "@/features/map/MediaMarkers"
import { SleepMarkers } from "@/features/map/SleepMarkers"
import { useStageDetail, useTripData } from "@/hooks/useTripData"
import { lineCoordinates } from "@/lib/geo-display"
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

  const [collapsed, setCollapsed] = useState(false)
  const [scrubProgress, setScrubProgress] = useState<number | null>(null)
  const [pinnedProgress, setPinnedProgress] = useState<number | null>(null)
  const [hoverKm, setHoverKm] = useState<number | null>(null)
  const [fitEpoch, setFitEpoch] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [activeMediaId, setActiveMediaId] = useState<string | null>(null)

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
      top: 80,
      bottom: 140,
      left: 40,
      right: 40,
    }),
    [],
  )

  const stageMedia = useMemo(
    () => (isStage ? media.filter((m) => m.stageNr === activeNr) : []),
    [media, isStage, activeNr],
  )

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
      sidebarFooter={
        isStage ? (
          <button
            type="button"
            onClick={goOverview}
            className="text-left text-sm text-primary no-underline hover:underline"
          >
            ← Zum Überblick
          </button>
        ) : undefined
      }
      map={
        <MapView
          overview={overview}
          activeStageNr={isStage ? activeNr : null}
          detailLine={isStage ? (detail?.line ?? null) : null}
          fitBoundsTarget={fitBoundsTarget}
          fitEpoch={fitEpoch}
          hoverPoint={hoverPoint}
          followPoint={followPoint}
          terrain3d={isStage}
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
          onScrub={(p) => setScrubProgress(p)}
          onScrubEnd={(stageNr, p) => {
            setPinnedProgress(p)
            setScrubProgress(null)
            setFitEpoch((e) => e + 1)
            navigate(`/etappe/${stageNr}`, { state: { progress: p } })
          }}
          onSelectStage={goToStage}
        />
      }
    />
  )
}

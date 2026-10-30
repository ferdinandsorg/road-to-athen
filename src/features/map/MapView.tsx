import { useEffect, useMemo, useRef, useState } from "react"
import Map, {
  Layer,
  Source,
  NavigationControl,
  AttributionControl,
  useMap,
  type MapRef,
} from "react-map-gl/maplibre"
import type {
  FilterSpecification,
  Map as MaplibreMap,
  StyleSpecification,
} from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import { mapSources, mapTheme } from "@/lib/map-theme"
import {
  buildRtaBasemapStyleFallback,
  loadRtaBasemapStyle,
  RTA_MOBILE_HIDDEN_LAYERS,
} from "@/lib/rta-basemap-style"
import {
  flattenFeatureCollection,
  flattenLineFeature,
} from "@/lib/geo-display"
import { PlaceLabels } from "@/features/map/PlaceLabels"

export type MapPadding = {
  top: number
  bottom: number
  left: number
  right: number
}

type MapViewProps = {
  overview: GeoJSON.FeatureCollection | null
  activeStageNr: number | null
  detailLine?:
    | GeoJSON.Feature<GeoJSON.LineString>
    | GeoJSON.FeatureCollection
    | null
  fitBoundsTarget?: [number, number, number, number] | null
  /**
   * Full-trip bbox for the cold-start globe → route intro.
   * Falls back to fitBoundsTarget when omitted.
   */
  introBounds?: [number, number, number, number] | null
  hoverPoint?: [number, number] | null
  /** Continuous scrub follow — easeTo center, skips fitBounds while set. */
  followPoint?: [number, number] | null
  /**
   * Stage view: DEM mesh + pitched camera.
   * Overview stays flat (2D) with hillshade only.
   */
  terrain3d?: boolean
  /**
   * Phone / small screens: skip globe intro, cap pixel ratio, jumpTo on scrub
   * (terrain3d should already be off — DEM mesh is the main GPU cost).
   */
  liteMode?: boolean
  /** Bump to re-run fitBounds (e.g. after timeline scrub release). */
  fitEpoch?: number
  /**
   * Bump after sidebar open/close/resize settles.
   * Map uses trackResize=false so layout animation does not resize every frame.
   */
  resizeEpoch?: number
  children?: React.ReactNode
  padding?: MapPadding
  /** Click a route line to open that stage (muted / overview). */
  onStageSelect?: (nr: number) => void
  /** Hide default stage-end circles when custom markers (e.g. sleep) are used. */
  hideStageEnds?: boolean
}

/** Whole-Earth start before the intro fly-in. */
const GLOBE_INTRO_VIEW = {
  longitude: 20,
  latitude: 42,
  zoom: 1.15,
  pitch: 0,
  bearing: 0,
} as const

const INTRO_HOLD_MS = 700
const INTRO_FLY_MS = 3200

const ROUTE_HIT_LAYERS = [
  "route-hit",
  "route-muted",
  "route-muted-transport",
  "route-active",
  "route-active-transport",
] as const

function FitBounds({
  bounds,
  padding,
  suspended,
  terrain3d,
  fitEpoch = 0,
  enabled = true,
}: {
  bounds: [number, number, number, number] | null | undefined
  padding?: MapPadding
  /** When true (scrubbing), do not fight follow camera. */
  suspended?: boolean
  terrain3d?: boolean
  fitEpoch?: number
  /** False while globe intro owns the camera. */
  enabled?: boolean
}) {
  const { current: map } = useMap()
  // Padding via ref: sidebar open/close must not re-trigger fitBounds (wobbly camera).
  const paddingRef = useRef(padding)
  paddingRef.current = padding

  useEffect(() => {
    if (!map || !bounds || suspended || !enabled) return
    const [minLng, minLat, maxLng, maxLat] = bounds
    if (![minLng, minLat, maxLng, maxLat].every(Number.isFinite)) return
    map.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      {
        padding: paddingRef.current ?? {
          top: 80,
          bottom: 80,
          left: 80,
          right: 80,
        },
        duration: terrain3d ? 1200 : 1400,
        pitch: terrain3d ? mapTheme.stageCamera.pitch : 0,
        bearing: terrain3d ? mapTheme.stageCamera.bearing : 0,
        essential: true,
      },
    )
  }, [map, bounds, suspended, terrain3d, fitEpoch, enabled])
  return null
}

/** Enable MapLibre globe projection (sphere when zoomed out). */
function GlobeProjection() {
  const { current: map } = useMap()

  useEffect(() => {
    if (!map) return
    const m = map.getMap()

    const apply = () => {
      try {
        m.setProjection({ type: "globe" })
        // Black space around the globe; faint blue rim only near the limb
        m.setSky({
          "sky-color": mapTheme.space,
          "horizon-color": "#1a2230",
          "horizon-fog-blend": 0.6,
          "sky-horizon-blend": 0.35,
          "atmosphere-blend": [
            "interpolate",
            ["linear"],
            ["zoom"],
            0,
            0.55,
            6,
            0.25,
            10,
            0,
          ],
        })
      } catch (err) {
        console.warn("Globe projection could not be applied:", err)
      }
    }

    if (m.isStyleLoaded()) apply()
    else m.once("load", apply)

    m.on("style.load", apply)
    return () => {
      m.off("style.load", apply)
    }
  }, [map])

  return null
}

/**
 * Cold start: hold on the whole Earth, then fly in to the full route once.
 * Subsequent stage/overview fits are handled by FitBounds.
 */
function GlobeIntro({
  bounds,
  padding,
  onComplete,
}: {
  bounds: [number, number, number, number] | null | undefined
  padding?: MapPadding
  onComplete: () => void
}) {
  const { current: map } = useMap()
  const started = useRef(false)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    if (!map || !bounds || started.current) return
    const [minLng, minLat, maxLng, maxLat] = bounds
    if (![minLng, minLat, maxLng, maxLat].every(Number.isFinite)) return

    started.current = true
    const m = map.getMap()
    const centerLng = (minLng + maxLng) / 2
    const centerLat = (minLat + maxLat) / 2
    const timers: number[] = []

    const run = () => {
      try {
        m.jumpTo({
          center: [centerLng, centerLat],
          zoom: GLOBE_INTRO_VIEW.zoom,
          pitch: 0,
          bearing: 0,
        })
      } catch {
        /* style may still be swapping */
      }

      timers.push(
        window.setTimeout(() => {
          m.fitBounds(
            [
              [minLng, minLat],
              [maxLng, maxLat],
            ],
            {
              padding: padding ?? { top: 80, bottom: 80, left: 80, right: 80 },
              duration: INTRO_FLY_MS,
              pitch: 0,
              bearing: 0,
              essential: true,
            },
          )
          timers.push(
            window.setTimeout(() => {
              onCompleteRef.current()
            }, INTRO_FLY_MS + 50),
          )
        }, INTRO_HOLD_MS),
      )
    }

    if (m.isStyleLoaded()) run()
    else m.once("load", run)

    return () => {
      for (const id of timers) window.clearTimeout(id)
      m.off("load", run)
      // Allow Strict Mode remount to schedule again
      started.current = false
    }
  }, [map, bounds, padding])

  return null
}

function FollowPoint({
  point,
  zoom = 9,
  instant = false,
}: {
  point: [number, number] | null | undefined
  zoom?: number
  /** Mobile scrub: jumpTo avoids stacking easeTo animations. */
  instant?: boolean
}) {
  const { current: map } = useMap()
  const rafRef = useRef<number | null>(null)
  const pendingRef = useRef<[number, number] | null>(null)

  useEffect(() => {
    if (!map || !point) return
    pendingRef.current = point
    if (rafRef.current != null) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      const next = pendingRef.current
      if (!next) return
      if (instant) {
        map.jumpTo({ center: next, zoom })
      } else {
        map.easeTo({
          center: next,
          zoom,
          duration: 180,
          essential: true,
        })
      }
    })
    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [map, point, zoom, instant])

  return null
}

function ensureDemSource(m: MaplibreMap): boolean {
  try {
    if (!m.getSource("dem")) {
      m.addSource("dem", {
        type: "raster-dem",
        url: mapSources.demTileJson,
        encoding: mapSources.demEncoding,
        tileSize: 512,
        attribution: mapSources.demAttribution,
      })
    }
    return true
  } catch (err) {
    console.warn("DEM source could not be added:", err)
    return false
  }
}

function Hillshade({ enabled }: { enabled: boolean }) {
  const { current: map } = useMap()
  useEffect(() => {
    if (!map) return
    const m = map.getMap()

    const remove = () => {
      try {
        if (m.getLayer("rta-hillshade")) m.removeLayer("rta-hillshade")
      } catch {
        /* ignore */
      }
    }

    if (!enabled) {
      remove()
      return
    }

    const add = () => {
      try {
        if (!ensureDemSource(m)) return
        // Style may already define a layer id "hillshade" (Mapbox Outdoors) —
        // use a unique id for our DEM hillshade.
        if (m.getLayer("rta-hillshade")) return

        const layers = m.getStyle().layers ?? []
        // Under roads/borders/labels so relief reads as ground, not a veil.
        const beforeId =
          layers.find((l) => l.id.startsWith("road-"))?.id ??
          layers.find((l) => l.id.startsWith("boundary_"))?.id ??
          layers.find((l) => l.id.startsWith("label_"))?.id

        m.addLayer(
          {
            id: "rta-hillshade",
            type: "hillshade",
            source: "dem",
            layout: { visibility: "visible" },
            paint: {
              "hillshade-shadow-color": mapTheme.hillshade.shadow,
              "hillshade-highlight-color": mapTheme.hillshade.highlight,
              "hillshade-accent-color": mapTheme.hillshade.accent,
              "hillshade-exaggeration": mapTheme.hillshade.exaggeration,
              "hillshade-illumination-anchor": "viewport",
            },
          },
          beforeId,
        )
      } catch (err) {
        console.warn("Hillshade could not be added:", err)
      }
    }

    if (m.isStyleLoaded()) add()
    else m.once("load", add)

    m.on("style.load", add)
    return () => {
      m.off("style.load", add)
      remove()
    }
  }, [map, enabled])
  return null
}

/** Keep capital/city circles above DEM hillshade and under route markers. */
function PromotePlaceMarkers() {
  const { current: map } = useMap()

  useEffect(() => {
    if (!map) return
    const m = map.getMap()

    const promote = () => {
      for (const id of [
        "place_city_dot",
        "place_capital_outer",
        "place_capital_inner",
      ]) {
        try {
          if (m.getLayer(id)) m.moveLayer(id)
        } catch {
          /* ignore */
        }
      }
    }

    if (m.isStyleLoaded()) promote()
    else m.once("load", promote)
    m.on("style.load", promote)
    const t = window.setTimeout(promote, 300)
    return () => {
      m.off("style.load", promote)
      window.clearTimeout(t)
    }
  }, [map])

  return null
}

/** Hide heavier basemap layers on mobile (same style, thinner). */
function MobileBasemapDiet({ enabled }: { enabled: boolean }) {
  const { current: map } = useMap()

  useEffect(() => {
    if (!map) return
    const m = map.getMap()

    const apply = () => {
      for (const id of RTA_MOBILE_HIDDEN_LAYERS) {
        try {
          if (m.getLayer(id)) {
            m.setLayoutProperty(
              id,
              "visibility",
              enabled ? "none" : "visible",
            )
          }
        } catch {
          /* ignore */
        }
      }
    }

    if (m.isStyleLoaded()) apply()
    else m.once("load", apply)
    m.on("style.load", apply)
    return () => {
      m.off("style.load", apply)
    }
  }, [map, enabled])

  return null
}

/** DEM mesh + pitched camera for stage view; flat overview otherwise. */
function Terrain3d({ enabled }: { enabled: boolean }) {
  const { current: map } = useMap()

  useEffect(() => {
    if (!map) return
    const m = map.getMap()

    const apply = () => {
      if (!ensureDemSource(m)) return
      try {
        if (enabled) {
          m.setMaxPitch(70)
          m.setTerrain({
            source: "dem",
            exaggeration: mapTheme.terrainExaggeration,
          })
          // Pitch/bearing come from FitBounds together with stage bbox —
          // only nudge if still flat and no fit is about to run.
        } else {
          m.setTerrain(null)
          m.setMaxPitch(60)
          // Flattening happens via FitBounds (pitch: 0) on overview.
        }
      } catch (err) {
        console.warn("Terrain could not be applied:", err)
      }
    }

    if (m.isStyleLoaded()) apply()
    else m.once("load", apply)

    m.on("style.load", apply)
    return () => {
      m.off("style.load", apply)
      try {
        m.setTerrain(null)
      } catch {
        /* unmount */
      }
    }
  }, [map, enabled])

  return null
}

export function MapView({
  overview,
  activeStageNr,
  detailLine,
  fitBoundsTarget,
  introBounds,
  hoverPoint,
  followPoint,
  terrain3d = false,
  liteMode = false,
  fitEpoch = 0,
  resizeEpoch = 0,
  children,
  padding,
  onStageSelect,
  hideStageEnds = false,
}: MapViewProps) {
  const mapRef = useRef<MapRef>(null)
  const [mapStyle, setMapStyle] = useState<string | StyleSpecification>(() =>
    buildRtaBasemapStyleFallback(),
  )
  // Mobile: skip globe fly-in — go straight to the route.
  const [introComplete, setIntroComplete] = useState(liteMode)
  const scrubbing = followPoint != null
  const globeIntroBounds = introBounds ?? fitBoundsTarget

  useEffect(() => {
    if (liteMode) setIntroComplete(true)
  }, [liteMode])

  // Resolve real planet tile URLs so places source can keep maxzoom: 8 (overzoom).
  useEffect(() => {
    let cancelled = false
    loadRtaBasemapStyle()
      .then((style) => {
        if (!cancelled) setMapStyle(style)
      })
      .catch((err) => {
        console.warn("[map] OpenFreeMap style load failed:", err)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Manual resize only — avoids MapLibre thrashing during sidebar width CSS transition.
  useEffect(() => {
    const map = mapRef.current?.getMap()
    if (!map) return
    map.resize()
  }, [resizeEpoch])

  useEffect(() => {
    function onWinResize() {
      mapRef.current?.getMap()?.resize()
    }
    window.addEventListener("resize", onWinResize)
    return () => window.removeEventListener("resize", onWinResize)
  }, [])

  function setRouteCursor(cursor: string) {
    const canvas = mapRef.current?.getCanvas()
    if (canvas) canvas.style.cursor = cursor
  }

  function stageNrFromEvent(
    features: GeoJSON.Feature[] | undefined,
  ): number | null {
    const nrs: number[] = []
    for (const f of features ?? []) {
      if (f.properties && f.properties.kind != null) continue
      const raw = f.properties?.nr
      const nr =
        typeof raw === "number"
          ? raw
          : typeof raw === "string" && raw !== ""
            ? Number(raw)
            : NaN
      if (Number.isFinite(nr) && !nrs.includes(nr)) nrs.push(nr)
    }
    // Prefer a neighbouring (muted) stage over the currently active one
    const other = nrs.find((nr) => nr !== activeStageNr)
    return other ?? nrs[0] ?? null
  }

  // When a detail track is loaded, draw that instead of the overview
  // line for the active stage (avoids double lines).
  const showOverviewActive = detailLine == null

  // Lines have only `nr`; points also have `kind`.
  // `transport: true` = ferry / GPS gap → dashed.
  const activeLineFilter = useMemo((): FilterSpecification => {
    if (!showOverviewActive && activeStageNr != null) {
      // Hide overview active line; detail source draws it
      return ["==", ["get", "nr"], -999] as FilterSpecification
    }
    const stageMatch: FilterSpecification =
      activeStageNr == null
        ? (["!", ["has", "kind"]] as FilterSpecification)
        : ([
            "all",
            ["!", ["has", "kind"]],
            ["==", ["get", "nr"], activeStageNr],
          ] as FilterSpecification)
    return [
      "all",
      stageMatch,
      ["!=", ["get", "transport"], true],
    ] as FilterSpecification
  }, [activeStageNr, showOverviewActive])

  const activeTransportFilter = useMemo((): FilterSpecification => {
    if (!showOverviewActive && activeStageNr != null) {
      return ["==", ["get", "nr"], -999] as FilterSpecification
    }
    const stageMatch: FilterSpecification =
      activeStageNr == null
        ? (["!", ["has", "kind"]] as FilterSpecification)
        : ([
            "all",
            ["!", ["has", "kind"]],
            ["==", ["get", "nr"], activeStageNr],
          ] as FilterSpecification)
    return [
      "all",
      stageMatch,
      ["==", ["get", "transport"], true],
    ] as FilterSpecification
  }, [activeStageNr, showOverviewActive])

  const mutedLineFilter = useMemo((): FilterSpecification => {
    if (activeStageNr == null) {
      return ["==", ["get", "nr"], -999] as FilterSpecification
    }
    return [
      "all",
      ["!", ["has", "kind"]],
      ["!=", ["get", "nr"], activeStageNr],
      ["!=", ["get", "transport"], true],
    ] as FilterSpecification
  }, [activeStageNr])

  const mutedTransportFilter = useMemo((): FilterSpecification => {
    if (activeStageNr == null) {
      return ["==", ["get", "nr"], -999] as FilterSpecification
    }
    return [
      "all",
      ["!", ["has", "kind"]],
      ["!=", ["get", "nr"], activeStageNr],
      ["==", ["get", "transport"], true],
    ] as FilterSpecification
  }, [activeStageNr])

  const markerPoint = followPoint ?? hoverPoint

  const hoverFc = useMemo<GeoJSON.FeatureCollection | null>(() => {
    if (!markerPoint) return null
    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: markerPoint },
        },
      ],
    }
  }, [markerPoint])

  const overview2d = useMemo(
    () => (overview ? flattenFeatureCollection(overview) : null),
    [overview],
  )
  const detail2d = useMemo(
    () => (detailLine ? flattenLineFeature(detailLine) : null),
    [detailLine],
  )

  return (
    <Map
      ref={mapRef}
      mapStyle={mapStyle}
      // Use remote PBF glyphs only — local TinySDF often yields empty label boxes.
      localIdeographFontFamily={false}
      // Allow zooming out far enough to see black space around the globe.
      // (MapLibre permits -2…24; 0 alone is often not enough on tall phones.)
      minZoom={-1.5}
      maxZoom={18}
      initialViewState={
        liteMode
          ? { longitude: 15, latitude: 45, zoom: 4, pitch: 0, bearing: 0 }
          : GLOBE_INTRO_VIEW
      }
      style={{ width: "100%", height: "100%", background: mapTheme.space }}
      trackResize={false}
      // Fewer GPU fragments on phones (1–1.25× instead of 2–3× retina).
      pixelRatio={
        liteMode ? Math.min(typeof window !== "undefined" ? window.devicePixelRatio : 1, 1.25) : undefined
      }
      fadeDuration={liteMode ? 0 : undefined}
      onLoad={() => {
        const m = mapRef.current?.getMap()
        m?.resize()
        if (liteMode && m) {
          try {
            m.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25))
            // Re-assert after style load — some paths clamp minZoom back up.
            m.setMinZoom(-1.5)
            m.setProjection({ type: "globe" })
          } catch {
            /* ignore */
          }
        }
      }}
      attributionControl={false}
      interactiveLayerIds={
        onStageSelect ? [...ROUTE_HIT_LAYERS] : undefined
      }
      onMouseEnter={
        onStageSelect
          ? () => {
              setRouteCursor("pointer")
            }
          : undefined
      }
      onMouseLeave={
        onStageSelect
          ? () => {
              setRouteCursor("")
            }
          : undefined
      }
      onClick={
        onStageSelect
          ? (e) => {
              const nr = stageNrFromEvent(e.features)
              if (nr == null || nr === activeStageNr) return
              onStageSelect(nr)
            }
          : undefined
      }
      onError={(e) => {
        // Log only — never swap the whole style here. DEM/glyph/tile blips used
        // to replace our basemap with Positron and kill custom labels.
        console.warn("Map style/tile error:", e.error?.message ?? e)
      }}
    >
      <AttributionControl compact position="bottom-right" />
      {/* Zoom +/- also on mobile — pinch often can't reach globe/space zoom. */}
      <NavigationControl
        position="top-right"
        showCompass={!liteMode && !terrain3d}
      />
      {/* Globe is light enough with the minimal basemap — enable on mobile too. */}
      <GlobeProjection />
      <MobileBasemapDiet enabled={liteMode} />
      <PromotePlaceMarkers />
      <PlaceLabels />
      {!liteMode && !introComplete && (
        <GlobeIntro
          bounds={globeIntroBounds}
          padding={padding}
          onComplete={() => setIntroComplete(true)}
        />
      )}
      {/* Soft DEM hillshade on overview; stays under 3D mesh on stage. */}
      <Hillshade enabled />
      <Terrain3d enabled={terrain3d} />
      <FitBounds
        bounds={fitBoundsTarget}
        padding={padding}
        suspended={scrubbing}
        terrain3d={terrain3d}
        fitEpoch={fitEpoch}
        enabled={introComplete}
      />
      <FollowPoint
        point={followPoint}
        zoom={terrain3d ? 10 : 9}
        instant={liteMode}
      />

      {overview2d && (
        <Source id="overview" type="geojson" data={overview2d}>
          {/* Wide invisible hit target for easier route clicks */}
          <Layer
            id="route-hit"
            type="line"
            filter={["!", ["has", "kind"]]}
            layout={{ "line-cap": "round", "line-join": "round" }}
            paint={{
              "line-color": "#000000",
              "line-width": 18,
              "line-opacity": 0,
            }}
          />
          <Layer
            id="route-muted"
            type="line"
            filter={mutedLineFilter}
            layout={{ "line-cap": "round", "line-join": "round" }}
            paint={{
              "line-color": mapTheme.routeMuted,
              "line-width": mapTheme.routeWidth.muted,
            }}
          />
          <Layer
            id="route-muted-transport"
            type="line"
            filter={mutedTransportFilter}
            layout={{ "line-cap": "butt", "line-join": "round" }}
            paint={{
              "line-color": mapTheme.routeMuted,
              "line-width": mapTheme.routeWidth.muted,
              "line-dasharray": [1.5, 1.5],
            }}
          />
          <Layer
            id="route-casing"
            type="line"
            filter={activeLineFilter}
            layout={{ "line-cap": "round", "line-join": "round" }}
            paint={{
              "line-color": mapTheme.routeCasing,
              "line-width": mapTheme.routeWidth.casing,
              "line-opacity": 0.9,
            }}
          />
          <Layer
            id="route-active"
            type="line"
            filter={activeLineFilter}
            layout={{ "line-cap": "round", "line-join": "round" }}
            paint={{
              "line-color": mapTheme.route,
              "line-width": mapTheme.routeWidth.active,
            }}
          />
          <Layer
            id="route-active-transport"
            type="line"
            filter={activeTransportFilter}
            layout={{ "line-cap": "butt", "line-join": "round" }}
            paint={{
              "line-color": mapTheme.route,
              "line-width": mapTheme.routeWidth.active,
              "line-dasharray": [2, 2],
            }}
          />
          {!hideStageEnds && (
            <Layer
              id="stage-ends"
              type="circle"
              filter={[
                "all",
                ["has", "kind"],
                ["==", ["get", "kind"], "stage-end"],
              ]}
              paint={{
                "circle-radius": 6,
                "circle-color": mapTheme.stageEnd,
                "circle-stroke-width": 2,
                "circle-stroke-color": mapTheme.markerBorder,
              }}
            />
          )}
          <Layer
            id="start-point"
            type="circle"
            filter={[
              "all",
              ["has", "kind"],
              ["==", ["get", "kind"], "start"],
            ]}
            paint={{
              "circle-radius": 8,
              "circle-color": mapTheme.route,
              "circle-stroke-width": 2,
              "circle-stroke-color": mapTheme.markerBorder,
            }}
          />
          {/* Finish is covered by the last sleep marker (Airbnb) when hideStageEnds */}
          {!hideStageEnds && (
            <Layer
              id="finish-point"
              type="circle"
              filter={[
                "all",
                ["has", "kind"],
                ["==", ["get", "kind"], "finish"],
              ]}
              paint={{
                "circle-radius": 10,
                "circle-color": mapTheme.finish,
                "circle-stroke-width": 2,
                "circle-stroke-color": mapTheme.markerBorder,
              }}
            />
          )}
        </Source>
      )}

      {detail2d && activeStageNr != null && (
        <Source id="detail" type="geojson" data={detail2d}>
          <Layer
            id="detail-casing"
            type="line"
            filter={["!=", ["get", "transport"], true]}
            layout={{ "line-cap": "round", "line-join": "round" }}
            paint={{
              "line-color": mapTheme.routeCasing,
              "line-width": mapTheme.routeWidth.casing,
            }}
          />
          <Layer
            id="detail-line"
            type="line"
            filter={["!=", ["get", "transport"], true]}
            layout={{ "line-cap": "round", "line-join": "round" }}
            paint={{
              "line-color": mapTheme.route,
              "line-width": mapTheme.routeWidth.active,
            }}
          />
          <Layer
            id="detail-transport"
            type="line"
            filter={["==", ["get", "transport"], true]}
            layout={{ "line-cap": "butt", "line-join": "round" }}
            paint={{
              "line-color": mapTheme.route,
              "line-width": mapTheme.routeWidth.active,
              "line-dasharray": [2, 2],
            }}
          />
        </Source>
      )}

      {hoverFc && (
        <Source id="hover" type="geojson" data={hoverFc}>
          <Layer
            id="hover-point"
            type="circle"
            paint={{
              "circle-radius": 7,
              "circle-color": mapTheme.route,
              "circle-stroke-width": 2,
              "circle-stroke-color": mapTheme.markerBorder,
            }}
          />
        </Source>
      )}

      {children}
    </Map>
  )
}

import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  TimelineSheet,
  type TimelineSheetSnap,
} from "@/components/TimelineSheet"
import { useIsMobile } from "@/hooks/useIsMobile"
import { Icons } from "@/lib/icons"
import { cn } from "@/lib/utils"

type Props = {
  map: React.ReactNode
  /** Sidebar body: overview facts or stage detail. */
  panel: React.ReactNode
  /** Optional sticky footer under the scrollable panel (e.g. Überblick link). */
  sidebarFooter?: React.ReactNode
  /** Bottom-center timeline over the map (also sheet header on mobile). */
  timeline: React.ReactNode
  /**
   * Mobile map chrome (top-left), e.g. “Zur Übersicht” at the first/last stage.
   */
  mapTopLeft?: React.ReactNode
  /** Controlled collapse; defaults to internal state when omitted. */
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
  /**
   * Fired when sidebar width has settled (open/close transition end,
   * or drag-resize end) so the map can resize once — not every frame.
   */
  onMapLayoutSettled?: () => void
}

const PANEL_EASE = "cubic-bezier(0.22, 1, 0.36, 1)"
const PANEL_MS = 480

const SIDEBAR_MIN = 280
const SIDEBAR_MAX = 560
const SIDEBAR_DEFAULT = 360
const SIDEBAR_WIDTH_KEY = "rta-sidebar-width"

function clampSidebarWidth(n: number): number {
  return Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, Math.round(n)))
}

function readStoredWidth(): number {
  try {
    const raw = localStorage.getItem(SIDEBAR_WIDTH_KEY)
    if (!raw) return SIDEBAR_DEFAULT
    const n = Number(raw)
    return Number.isFinite(n) ? clampSidebarWidth(n) : SIDEBAR_DEFAULT
  } catch {
    return SIDEBAR_DEFAULT
  }
}

function BrandHeader({
  collapsed,
  onToggle,
}: {
  collapsed: boolean
  onToggle: () => void
}) {
  const toggle = (
    <button
      type="button"
      aria-label={collapsed ? "Sidebar öffnen" : "Sidebar einklappen"}
      onClick={onToggle}
      className={cn(
        "flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-none border-0",
        "text-primary outline-none transition-colors duration-150",
        "hover:bg-primary hover:text-primary-foreground",
        "focus-visible:bg-primary focus-visible:text-primary-foreground",
        collapsed ? "border border-border bg-background shadow-lg" : "bg-transparent",
      )}
    >
      {collapsed ? (
        <Icons.panelLeft className="size-4" strokeWidth={2} />
      ) : (
        <Icons.panelLeftClose className="size-4" strokeWidth={2} />
      )}
    </button>
  )

  // Collapsed over the map: icon only — title lives in the open sidebar.
  if (collapsed) return toggle

  return (
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <Link to="/">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-primary md:text-3xl">
            Road to Athen
          </h1>
        </Link>
        <p className="mt-2 text-sm text-muted-foreground">
          Mit dem Fahrrad von Leipzig nach Athen
        </p>
      </div>
      {toggle}
    </div>
  )
}

export function AppShell({
  map,
  panel,
  sidebarFooter,
  timeline,
  mapTopLeft,
  collapsed: collapsedProp,
  onCollapsedChange,
  onMapLayoutSettled,
}: Props) {
  const isMobile = useIsMobile()
  const [sheetSnap, setSheetSnap] =
    useState<TimelineSheetSnap>("collapsed")
  const [internalCollapsed, setInternalCollapsed] = useState(false)
  const collapsed = collapsedProp ?? internalCollapsed

  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT)
  const [resizing, setResizing] = useState(false)
  const widthRef = useRef(sidebarWidth)
  const settledRef = useRef(onMapLayoutSettled)
  settledRef.current = onMapLayoutSettled

  // One panel tree only — desktop sidebar stays in the DOM when hidden via CSS
  // and would otherwise double-mount StagePage (charts, fetches, lightbox).
  const desktopPanel = isMobile ? null : panel
  const mobilePanel = isMobile ? panel : null

  function onSheetSnapChange(next: TimelineSheetSnap) {
    setSheetSnap(next)
    requestAnimationFrame(() => notifyMapSettled())
  }

  useEffect(() => {
    setSidebarWidth(readStoredWidth())
  }, [])

  useEffect(() => {
    widthRef.current = sidebarWidth
  }, [sidebarWidth])

  function notifyMapSettled() {
    settledRef.current?.()
  }

  function setCollapsed(next: boolean) {
    onCollapsedChange?.(next)
    if (collapsedProp === undefined) setInternalCollapsed(next)
  }

  function onResizePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (collapsed) return
    e.preventDefault()
    const handle = e.currentTarget
    handle.setPointerCapture(e.pointerId)
    const startX = e.clientX
    const startW = widthRef.current
    setResizing(true)

    function onMove(ev: PointerEvent) {
      const next = clampSidebarWidth(startW + (ev.clientX - startX))
      widthRef.current = next
      setSidebarWidth(next)
    }

    function onUp(ev: PointerEvent) {
      handle.releasePointerCapture(ev.pointerId)
      handle.removeEventListener("pointermove", onMove)
      handle.removeEventListener("pointerup", onUp)
      handle.removeEventListener("pointercancel", onUp)
      setResizing(false)
      try {
        localStorage.setItem(SIDEBAR_WIDTH_KEY, String(widthRef.current))
      } catch {
        /* ignore */
      }
      notifyMapSettled()
    }

    handle.addEventListener("pointermove", onMove)
    handle.addEventListener("pointerup", onUp)
    handle.addEventListener("pointercancel", onUp)
  }

  return (
    <div className="relative flex h-full w-full flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "relative z-20 hidden h-full shrink-0 flex-col overflow-hidden border-r bg-map-panel md:flex",
          collapsed ? "border-r-0" : "border-border",
        )}
        style={{
          width: collapsed ? 0 : sidebarWidth,
          transition: resizing
            ? "none"
            : `width ${PANEL_MS}ms ${PANEL_EASE}`,
        }}
        onTransitionEnd={(e) => {
          if (e.propertyName === "width") notifyMapSettled()
        }}
      >
        <div
          className={cn(
            "flex h-full w-full flex-col",
            collapsed && "pointer-events-none opacity-0",
          )}
          style={{ width: sidebarWidth }}
        >
          <div className="shrink-0 border-b border-border px-6 py-5">
            <BrandHeader
              collapsed={false}
              onToggle={() => setCollapsed(true)}
            />
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <div className="flex flex-col gap-6 px-6 py-6">{desktopPanel}</div>
          </ScrollArea>
          {sidebarFooter ? (
            <div className="shrink-0 border-t border-border px-6 py-3">
              {sidebarFooter}
            </div>
          ) : null}
        </div>

        {!collapsed ? (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-valuenow={sidebarWidth}
            aria-valuemin={SIDEBAR_MIN}
            aria-valuemax={SIDEBAR_MAX}
            tabIndex={0}
            className="absolute inset-y-0 right-0 z-30 w-1.5 translate-x-1/2 cursor-col-resize touch-none bg-transparent"
            onPointerDown={onResizePointerDown}
            onKeyDown={(e) => {
              const step = e.shiftKey ? 32 : 16
              if (e.key === "ArrowLeft") {
                e.preventDefault()
                const next = clampSidebarWidth(sidebarWidth - step)
                setSidebarWidth(next)
                try {
                  localStorage.setItem(SIDEBAR_WIDTH_KEY, String(next))
                } catch {
                  /* ignore */
                }
                notifyMapSettled()
              } else if (e.key === "ArrowRight") {
                e.preventDefault()
                const next = clampSidebarWidth(sidebarWidth + step)
                setSidebarWidth(next)
                try {
                  localStorage.setItem(SIDEBAR_WIDTH_KEY, String(next))
                } catch {
                  /* ignore */
                }
                notifyMapSettled()
              }
            }}
          />
        ) : null}
      </aside>

      {/* Map column — starts where the sidebar ends */}
      <div
        className={cn(
          "relative min-h-0 min-w-0 flex-1",
          collapsed && "map-chrome-collapsed",
        )}
      >
        {/* Map stays full-bleed; timeline/sheet overlays it. */}
        <div className="absolute inset-0">{map}</div>

        {/* Collapsed desktop: sidebar toggle above the map “i”. */}
        {collapsed ? (
          <div className="pointer-events-none absolute top-0 left-0 z-20 hidden p-4 md:block">
            <div className="pointer-events-auto w-max">
              <BrandHeader
                collapsed
                onToggle={() => setCollapsed(false)}
              />
            </div>
          </div>
        ) : null}

        {/* Mobile: edge-stage control (mirrors zoom chrome padding). */}
        {isMobile && mapTopLeft ? (
          <div className="pointer-events-none absolute top-0 left-0 z-20 p-4 md:hidden">
            <div className="pointer-events-auto">{mapTopLeft}</div>
          </div>
        ) : null}

        {/* Mobile: timeline IS the bottom sheet (no burger drawer). */}
        {isMobile ? (
          <TimelineSheet
            snap={sheetSnap}
            onSnapChange={onSheetSnapChange}
            header={timeline}
            footer={sidebarFooter}
          >
            {mobilePanel}
          </TimelineSheet>
        ) : (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 hidden p-6 md:block">
            <div className="pointer-events-auto w-full">{timeline}</div>
          </div>
        )}
      </div>
    </div>
  )
}

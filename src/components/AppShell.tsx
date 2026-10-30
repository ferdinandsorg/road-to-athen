import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { useIsMobile } from "@/hooks/useIsMobile"
import { Icons } from "@/lib/icons"
import { cn } from "@/lib/utils"

type Props = {
  map: React.ReactNode
  /** Sidebar body: overview facts or stage detail. */
  panel: React.ReactNode
  /** Optional sticky footer under the scrollable panel (e.g. Überblick link). */
  sidebarFooter?: React.ReactNode
  /** Bottom-center timeline over the map. */
  timeline: React.ReactNode
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
  return (
    <div
      className={cn(
        "flex",
        collapsed ? "w-max items-center gap-2" : "items-start gap-3",
      )}
    >
      <div className={cn(collapsed ? "w-max" : "min-w-0 flex-1")}>
        <Link to="/" className="block">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-primary md:text-3xl">
            Road to Athen
          </h1>
        </Link>
        {!collapsed ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Mit dem Fahrrad von Leipzig nach Athen
          </p>
        ) : null}
      </div>
      <button
        type="button"
        aria-label={collapsed ? "Sidebar öffnen" : "Sidebar einklappen"}
        onClick={onToggle}
        className={cn(
          "flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-none border-0",
          "text-primary outline-none transition-colors duration-150",
          "hover:bg-primary hover:text-primary-foreground",
          "focus-visible:bg-primary focus-visible:text-primary-foreground",
          collapsed ? "bg-background" : "bg-transparent",
        )}
      >
        {collapsed ? (
          <Icons.panelLeft className="size-4" strokeWidth={2} />
        ) : (
          <Icons.panelLeftClose className="size-4" strokeWidth={2} />
        )}
      </button>
    </div>
  )
}

export function AppShell({
  map,
  panel,
  sidebarFooter,
  timeline,
  collapsed: collapsedProp,
  onCollapsedChange,
  onMapLayoutSettled,
}: Props) {
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)
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
      // One map resize after drag — not every pointermove frame.
      notifyMapSettled()
    }

    handle.addEventListener("pointermove", onMove)
    handle.addEventListener("pointerup", onUp)
    handle.addEventListener("pointercancel", onUp)
  }

  return (
    <div className="relative flex h-full w-full flex-col md:flex-row">
      {/* Desktop sidebar — layout sibling of the map (not an overlay) */}
      <aside
        className={cn(
          "relative z-20 hidden h-full shrink-0 flex-col overflow-hidden border-r bg-map-panel md:flex",
          collapsed ? "border-r-0" : "border-border",
        )}
        style={{
          width: collapsed ? 0 : sidebarWidth,
          transition: resizing
            ? "none"
            : `width ${PANEL_MS}ms ${PANEL_EASE}, border-color ${PANEL_MS}ms ${PANEL_EASE}`,
        }}
        aria-hidden={collapsed}
        onTransitionEnd={(e) => {
          if (e.target !== e.currentTarget) return
          if (e.propertyName !== "width") return
          notifyMapSettled()
        }}
      >
        <div
          className="flex h-full w-full min-w-0 flex-col"
          style={{ width: sidebarWidth }}
        >
          <div className="shrink-0 border-b border-border px-4 py-5 md:px-6 md:py-6">
            <BrandHeader
              collapsed={false}
              onToggle={() => setCollapsed(true)}
            />
          </div>

          <div className="grid min-h-0 flex-1 grid-rows-[1fr]">
            <div className="min-h-0 overflow-hidden">
              <div className="flex h-full min-h-0 flex-col">
                <ScrollArea
                  className={cn(
                    "min-w-0 w-full",
                    sidebarFooter
                      ? "h-[calc(100dvh-8.5rem-3.5rem)]"
                      : "h-[calc(100dvh-8.5rem)]",
                  )}
                >
                  <div className="box-border flex w-full min-w-0 flex-col gap-5 overflow-x-hidden px-4 py-5 md:gap-6 md:px-6 md:py-6">
                    {desktopPanel}
                  </div>
                </ScrollArea>
                {sidebarFooter ? (
                  <div className="shrink-0 border-t px-4 py-3 md:px-6 md:py-4">
                    {sidebarFooter}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* Drag handle — resize sidebar width */}
        {!collapsed ? (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Sidebar-Breite anpassen"
            aria-valuemin={SIDEBAR_MIN}
            aria-valuemax={SIDEBAR_MAX}
            aria-valuenow={sidebarWidth}
            tabIndex={0}
            className={cn(
              "absolute top-0 right-0 z-30 h-full w-1.5 cursor-col-resize touch-none",
              "bg-transparent hover:bg-primary/20 active:bg-primary/30",
              resizing && "bg-primary/30",
            )}
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
      <div className="relative min-h-0 min-w-0 flex-1">
        <div className="absolute inset-0">{map}</div>

        {/* Collapsed brand chip over the map */}
        {collapsed ? (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 hidden p-3 md:block md:p-6">
            <div className="pointer-events-auto w-max">
              <BrandHeader
                collapsed
                onToggle={() => setCollapsed(false)}
              />
            </div>
          </div>
        ) : null}

        {/* Mobile drawer */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-4 p-4 md:hidden">
          <div className="pointer-events-auto">
            <Drawer open={open} onOpenChange={setOpen}>
              <DrawerTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Details öffnen"
                  className="rounded-none border bg-background shadow-lg"
                >
                  <Icons.menu />
                </Button>
              </DrawerTrigger>
              <DrawerContent className="rounded-none">
                <DrawerHeader className="text-left">
                  <DrawerTitle className="font-heading text-primary">
                    <Link to="/" onClick={() => setOpen(false)}>
                      Road to Athen
                    </Link>
                  </DrawerTitle>
                </DrawerHeader>
                <div className="max-h-[70vh] overflow-y-auto px-4 pb-4">
                  <div className="flex flex-col gap-6">{mobilePanel}</div>
                  {sidebarFooter ? (
                    <div className="mt-8 border-t pt-4">{sidebarFooter}</div>
                  ) : null}
                </div>
              </DrawerContent>
            </Drawer>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:p-6">
          <div className="pointer-events-auto w-full">{timeline}</div>
        </div>
      </div>
    </div>
  )
}

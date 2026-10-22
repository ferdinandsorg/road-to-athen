import { useState } from "react"
import { Link } from "react-router-dom"
import { Menu, PanelLeft, PanelLeftClose } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
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
}

export function AppShell({
  map,
  panel,
  sidebarFooter,
  timeline,
  collapsed: collapsedProp,
  onCollapsedChange,
}: Props) {
  const [open, setOpen] = useState(false)
  const [internalCollapsed, setInternalCollapsed] = useState(false)
  const collapsed = collapsedProp ?? internalCollapsed

  function setCollapsed(next: boolean) {
    onCollapsedChange?.(next)
    if (collapsedProp === undefined) setInternalCollapsed(next)
  }

  return (
    <div className="relative flex h-full w-full flex-col md:flex-row">
      <aside
        className={cn(
          "z-20 hidden h-full min-w-0 shrink-0 flex-col overflow-hidden border-r bg-map-panel transition-[width] duration-300 ease-out md:flex",
          collapsed ? "w-0 border-r-0" : "w-80 lg:w-96",
        )}
        aria-hidden={collapsed}
      >
        <div className="flex h-full w-full min-w-0 flex-col">
          <div className="shrink-0 border-b p-6 md:p-8">
            <Link to="/" className="block">
              <h1 className="font-heading text-2xl font-bold tracking-tight text-primary md:text-3xl">
                Road to Athen
              </h1>
            </Link>
            <p className="mt-2 text-sm text-muted-foreground">
              Mit dem Fahrrad von Leipzig nach Athen
            </p>
          </div>
          <ScrollArea
            className={cn(
              "min-w-0 w-full",
              sidebarFooter
                ? "h-[calc(100dvh-8.5rem-3.5rem)]"
                : "h-[calc(100dvh-8.5rem)]",
            )}
          >
            <div className="box-border flex w-full min-w-0 flex-col gap-6 overflow-x-hidden p-6 md:gap-8 md:p-8">
              {panel}
            </div>
          </ScrollArea>
          {sidebarFooter ? (
            <div className="shrink-0 border-t px-6 py-4 md:px-8">
              {sidebarFooter}
            </div>
          ) : null}
        </div>
      </aside>

      <div className="relative min-h-0 min-w-0 flex-1">
        <div className="absolute inset-0">{map}</div>

        {/* Desktop sidebar toggle */}
        <div className="pointer-events-none absolute top-4 left-4 z-20 hidden md:block md:top-6 md:left-6">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={collapsed ? "Sidebar öffnen" : "Sidebar einklappen"}
            className="pointer-events-auto rounded-none border bg-map-panel shadow-lg"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <PanelLeft /> : <PanelLeftClose />}
          </Button>
        </div>

        {/* Mobile drawer */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-4 p-4 md:hidden">
          <div className="pointer-events-auto">
            <Drawer open={open} onOpenChange={setOpen}>
              <DrawerTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Details öffnen"
                  className="rounded-none border bg-map-panel shadow-lg"
                >
                  <Menu />
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
                  <div className="flex flex-col gap-6">{panel}</div>
                  {sidebarFooter ? (
                    <div className="mt-8 border-t pt-4">{sidebarFooter}</div>
                  ) : null}
                </div>
              </DrawerContent>
            </Drawer>
          </div>
        </div>

        {/* Timeline — full width, same padding on sides as bottom */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:p-6">
          <div className="pointer-events-auto w-full">{timeline}</div>
        </div>
      </div>
    </div>
  )
}

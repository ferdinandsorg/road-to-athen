import { useMemo } from "react"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

type Props = {
  profile: [number, number][]
  onHoverKm: (km: number | null) => void
}

const chartConfig = {
  elev: { label: "Höhe", color: "var(--chart-1)" },
} satisfies ChartConfig

const intDe = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 })

function formatKmTick(km: number): string {
  return `${intDe.format(Math.round(km))} km`
}

function formatElevTick(m: number): string {
  return `${intDe.format(Math.round(m))} m`
}

function niceCeil(n: number, step: number): number {
  if (n <= 0) return step
  return Math.ceil(n / step) * step
}

export function ElevationProfile({ profile, onHoverKm }: Props) {
  const data = useMemo(
    () =>
      profile.map(([km, elev]) => ({
        km,
        // GPS/baro noise can dip slightly below sea level – clamp for display
        elev: Math.max(0, elev),
      })),
    [profile],
  )

  const kmMax = data.at(-1)?.km ?? 0
  const elevMax = useMemo(() => {
    let max = 0
    for (const p of data) max = Math.max(max, p.elev)
    return niceCeil(max, max > 200 ? 100 : 50)
  }, [data])

  const kmTicks = useMemo(() => {
    if (kmMax <= 0) return [0]
    const steps = 4
    const ticks: number[] = []
    for (let i = 0; i <= steps; i++) {
      ticks.push(Math.round((kmMax * i) / steps))
    }
    return [...new Set(ticks)]
  }, [kmMax])

  if (data.length === 0) return null

  return (
    <div className="min-w-0 max-w-full">
      <p className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground">
        Höhenprofil
      </p>
      <ChartContainer
        config={chartConfig}
        className="aspect-[3/1] w-full min-w-0 max-w-full"
      >
        <AreaChart
          data={data}
          margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
          onMouseMove={(state) => {
            const payload = (
              state as {
                activePayload?: Array<{ payload?: { km?: number } }>
              }
            )?.activePayload?.[0]?.payload
            const km = payload?.km
            if (typeof km !== "number" || !Number.isFinite(km)) {
              onHoverKm(null)
              return
            }
            onHoverKm(km)
          }}
          onMouseLeave={() => onHoverKm(null)}
        >
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="km"
            domain={[0, kmMax]}
            ticks={kmTicks}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => formatKmTick(Number(v))}
          />
          <YAxis
            dataKey="elev"
            domain={[0, elevMax]}
            allowDataOverflow
            tickLine={false}
            axisLine={false}
            width={52}
            tickCount={4}
            tickFormatter={(v) => formatElevTick(Number(v))}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(_label, payload) => {
                  const km = payload?.[0]?.payload?.km
                  return formatKmTick(
                    typeof km === "number" && Number.isFinite(km) ? km : 0,
                  )
                }}
                formatter={(value) => formatElevTick(Number(value))}
              />
            }
          />
          <Area
            dataKey="elev"
            type="monotone"
            fill="var(--color-elev)"
            fillOpacity={0.25}
            stroke="var(--color-elev)"
            strokeWidth={2}
            baseValue={0}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  )
}

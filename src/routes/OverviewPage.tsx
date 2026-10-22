import { useOutletContext } from "react-router-dom"
import { OverviewStats } from "@/components/OverviewStats"
import type { TripOutletContext } from "@/routes/TripLayout"

export function OverviewPage() {
  const { stages } = useOutletContext<TripOutletContext>()
  return <OverviewStats stages={stages} />
}

import {
  BedDouble,
  Building2,
  Home,
  Tent,
  Trees,
  Users,
  type LucideIcon,
} from "lucide-react"
import type { SleepKind } from "@/data/sleeps"

export const sleepIcons: Record<SleepKind, LucideIcon> = {
  tent: Tent,
  wild: Trees,
  camping: Tent,
  hotel: Building2,
  hostel: BedDouble,
  airbnb: Home,
  friend: Users,
}

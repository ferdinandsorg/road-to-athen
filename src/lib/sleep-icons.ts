import type { LucideIcon } from "lucide-react"
import type { SleepKind } from "@/data/sleeps"
import { Icons } from "@/lib/icons"

export const sleepIcons: Record<SleepKind, LucideIcon> = {
  tent: Icons.tent,
  wild: Icons.trees,
  camping: Icons.tent,
  hotel: Icons.building,
  hostel: Icons.bed,
  airbnb: Icons.home,
  friend: Icons.users,
  garden: Icons.garden,
}

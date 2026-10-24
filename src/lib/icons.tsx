import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
} from "react"
import {
  ArrowLeft,
  ArrowRight,
  BedDouble,
  Building2,
  Home,
  Menu,
  PanelLeft,
  PanelLeftClose,
  Sprout,
  Tent,
  Trees,
  Users,
  XIcon,
  type LucideIcon,
  type LucideProps,
} from "lucide-react"

/**
 * Sharp stroke defaults — Lucide ships round caps/joins; our UI uses --radius: 0.
 * Prefer these wrappers (or the global `.lucide` CSS) over raw lucide imports.
 */
export const sharpIconProps = {
  strokeLinecap: "square",
  strokeLinejoin: "miter",
} as const satisfies Partial<LucideProps>

function sharp(Icon: LucideIcon) {
  const SharpIcon = forwardRef<
    ElementRef<typeof Icon>,
    ComponentPropsWithoutRef<typeof Icon>
  >(function SharpIcon(props, ref) {
    return (
      <Icon
        ref={ref}
        strokeLinecap={sharpIconProps.strokeLinecap}
        strokeLinejoin={sharpIconProps.strokeLinejoin}
        {...props}
      />
    )
  })
  SharpIcon.displayName = `Sharp(${Icon.displayName ?? Icon.name})`
  return SharpIcon
}

export const Icons = {
  panelLeft: sharp(PanelLeft),
  panelLeftClose: sharp(PanelLeftClose),
  menu: sharp(Menu),
  arrowLeft: sharp(ArrowLeft),
  arrowRight: sharp(ArrowRight),
  x: sharp(XIcon),
  tent: sharp(Tent),
  trees: sharp(Trees),
  building: sharp(Building2),
  bed: sharp(BedDouble),
  home: sharp(Home),
  users: sharp(Users),
  /** Private garden stay */
  garden: sharp(Sprout),
} as const

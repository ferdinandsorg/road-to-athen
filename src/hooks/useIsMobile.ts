import { useEffect, useState } from "react"

/** Matches Tailwind `md` breakpoint — phone / small tablet portrait. */
const QUERY = "(max-width: 767px)"

export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(() => {
    if (typeof window === "undefined") return false
    return window.matchMedia(QUERY).matches
  })

  useEffect(() => {
    const mql = window.matchMedia(QUERY)
    const onChange = () => setMobile(mql.matches)
    onChange()
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return mobile
}

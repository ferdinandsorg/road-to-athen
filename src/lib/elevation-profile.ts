/**
 * FIT exports often lack altitude for the first GPS fixes → stored as 0.
 * That draws a vertical cliff at km 0. Replace leading invalid zeros with
 * the first real elevation so the chart starts on the ground.
 */
export function sanitizeElevationProfile(
  profile: [number, number][],
): [number, number][] {
  if (profile.length === 0) return profile

  let firstValid = -1
  for (let i = 0; i < profile.length; i++) {
    const elev = profile[i]![1]
    if (Number.isFinite(elev) && elev > 0) {
      firstValid = i
      break
    }
  }
  if (firstValid <= 0) return profile

  const fill = profile[firstValid]![1]
  return profile.map(([km, elev], i) =>
    i < firstValid ? [km, fill] : [km, elev],
  )
}

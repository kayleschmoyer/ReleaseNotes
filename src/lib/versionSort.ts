/**
 * Natural sort for dotted version names ("7.0.10" > "7.0.9" > "6.0.15").
 * Non-numeric parts fall back to case-insensitive string comparison so
 * unexpected page names still sort deterministically.
 */
export function compareVersionsDesc(a: string, b: string): number {
  const pa = a.trim().split('.')
  const pb = b.trim().split('.')
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i++) {
    const sa = pa[i] ?? ''
    const sb = pb[i] ?? ''
    const na = Number(sa)
    const nb = Number(sb)
    const aNum = sa !== '' && !Number.isNaN(na)
    const bNum = sb !== '' && !Number.isNaN(nb)
    if (aNum && bNum) {
      if (na !== nb) return nb - na
    } else if (aNum !== bNum) {
      // numeric sorts above non-numeric
      return aNum ? -1 : 1
    } else {
      const c = sb.localeCompare(sa, undefined, { sensitivity: 'base' })
      if (c !== 0) return c
    }
  }
  return 0
}

/** Major series label used for sidebar grouping: "7.0.7" -> "7.x". */
export function majorSeries(version: string): string {
  const m = version.trim().match(/^(\d+)/)
  return m ? `${m[1]}.x` : 'Other'
}

/**
 * All versions strictly newer than `from` up to and including `to`,
 * in descending order. Used by the compare view.
 */
export function versionsBetween(all: string[], from: string, to: string): string[] {
  let [newer, older] = [to, from]
  if (compareVersionsDesc(newer, older) > 0) [newer, older] = [older, newer]
  return [...all]
    .sort(compareVersionsDesc)
    .filter((v) => compareVersionsDesc(v, older) < 0 && compareVersionsDesc(v, newer) >= 0)
}

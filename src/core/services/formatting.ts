/**
 * Display formatting helpers for catalog metadata. Pure functions so they are
 * trivially testable and reusable in a future mobile client.
 */

import type { GerminationRange, ToleranceLevel } from '../domain/plant'

export const MONTH_NAMES_ABBREVIATED = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const

function monthLabel(month: number): string {
  return MONTH_NAMES_ABBREVIATED[month - 1] ?? '?'
}

/** Renders bloom months compactly: "Year-round", "Mar-Oct", or "Mar-Jun, Sep-Nov". */
export function formatBloomMonths(bloomMonths: number[]): string {
  if (bloomMonths.length === 0) return 'Does not bloom'
  if (bloomMonths.length === 12) return 'Year-round'

  const sorted = [...new Set(bloomMonths)].sort((first, second) => first - second)
  const ranges: string[] = []
  let rangeStart = sorted[0]
  let rangeEnd = sorted[0]

  const flushRange = () => {
    ranges.push(
      rangeStart === rangeEnd
        ? monthLabel(rangeStart)
        : `${monthLabel(rangeStart)}-${monthLabel(rangeEnd)}`,
    )
  }

  for (const month of sorted.slice(1)) {
    if (month === rangeEnd + 1) {
      rangeEnd = month
      continue
    }
    flushRange()
    rangeStart = month
    rangeEnd = month
  }
  flushRange()

  return ranges.join(', ')
}

/** Capitalizes the stored lowercase vocabulary value ("high" -> "High"). */
export function formatTolerance(tolerance: ToleranceLevel): string {
  return tolerance.charAt(0).toUpperCase() + tolerance.slice(1)
}

/** "65-85 F" for seed-grown species; friendly text otherwise. */
export function formatGerminationRange(range: GerminationRange | null): string {
  if (!range) return 'Not grown from seed'
  return `${range.minFahrenheit}-${range.maxFahrenheit} F`
}

/** "0.4 years" reads awkwardly; surface sub-year values in months. */
export function formatYearsToMaturity(years: number): string {
  if (years < 1) {
    const months = Math.round(years * 12)
    return `${months} month${months === 1 ? '' : 's'}`
  }
  const rounded = Number(years.toFixed(1))
  return `${rounded} year${rounded === 1 ? '' : 's'}`
}

/** "9 ft tall x 6 ft wide" summary for cards and panels. */
export function formatMatureSize(heightFeet: number, spreadFeet: number): string {
  return `${heightFeet} ft H x ${spreadFeet} ft W`
}

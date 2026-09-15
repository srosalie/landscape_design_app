/**
 * Pure catalog filtering used by the catalog screen. Kept free of React so it
 * is directly unit-testable and reusable by future search surfaces (command
 * palette, AI advisor prefiltering).
 */

import type { Plant, PlantCategory, SunExposure, ToleranceLevel } from '@core/domain/plant'

export interface CatalogFilters {
  searchText: string
  /** Empty list = no category restriction. */
  categories: PlantCategory[]
  /** Plants must tolerate this exposure; null = any. */
  sunExposure: SunExposure | null
  /** Minimum drought tolerance on the none<low<moderate<high ladder; null = any. */
  minimumDroughtTolerance: ToleranceLevel | null
  minimumSaltTolerance: ToleranceLevel | null
  /** Calendar month 1-12 during which the plant blooms; null = any. */
  bloomMonth: number | null
}

export const EMPTY_CATALOG_FILTERS: CatalogFilters = {
  searchText: '',
  categories: [],
  sunExposure: null,
  minimumDroughtTolerance: null,
  minimumSaltTolerance: null,
  bloomMonth: null,
}

const TOLERANCE_RANK: Record<ToleranceLevel, number> = {
  none: 0,
  low: 1,
  moderate: 2,
  high: 3,
}

function matchesSearchText(plant: Plant, searchText: string): boolean {
  if (searchText === '') return true
  const needle = searchText.toLowerCase()
  const haystack = [plant.commonName, plant.scientificName, ...plant.tags].join(' ').toLowerCase()
  return haystack.includes(needle)
}

function meetsMinimumTolerance(
  plantTolerance: ToleranceLevel,
  minimum: ToleranceLevel | null,
): boolean {
  if (!minimum) return true
  return TOLERANCE_RANK[plantTolerance] >= TOLERANCE_RANK[minimum]
}

/** Applies all filters conjunctively (AND); each individual filter is an OR within itself. */
export function filterPlants(plants: Plant[], filters: CatalogFilters): Plant[] {
  return plants.filter((plant) => {
    const categoryMatches =
      filters.categories.length === 0 || filters.categories.includes(plant.category)
    const sunMatches = !filters.sunExposure || plant.sunExposure.includes(filters.sunExposure)

    return (
      matchesSearchText(plant, filters.searchText) &&
      categoryMatches &&
      sunMatches &&
      meetsMinimumTolerance(plant.droughtTolerance, filters.minimumDroughtTolerance) &&
      meetsMinimumTolerance(plant.saltTolerance, filters.minimumSaltTolerance) &&
      (filters.bloomMonth === null || plant.bloomMonths.includes(filters.bloomMonth))
    )
  })
}

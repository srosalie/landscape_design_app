import { describe, expect, it } from 'vitest'
import type { Plant } from '@core/domain/plant'
import { EMPTY_CATALOG_FILTERS, filterPlants } from './filterPlants'
import type { CatalogFilters } from './filterPlants'

function makePlant(overrides: Partial<Plant>): Plant {
  return {
    id: 'test-plant',
    commonName: 'Test Plant',
    scientificName: 'Testus plantus',
    category: 'native',
    form: 'shrub',
    images: { juvenileUrl: '', matureUrl: '' },
    bloomMonths: [],
    yearsToMaturity: 2,
    matureHeightFeet: 5,
    matureSpreadFeet: 4,
    sunExposure: ['full'],
    soilTextures: ['sand'],
    soilMoisture: ['dry'],
    saltTolerance: 'low',
    droughtTolerance: 'moderate',
    germinationTempF: null,
    notes: '',
    tags: ['wildlife'],
    attributes: {},
    ...overrides,
  }
}

const catalog = [
  makePlant({ id: 'a', commonName: 'Firebush', tags: ['hummingbird'], droughtTolerance: 'high', bloomMonths: [6, 7] }),
  makePlant({ id: 'b', commonName: 'Loquat', category: 'edible', scientificName: 'Eriobotrya japonica', droughtTolerance: 'moderate', saltTolerance: 'moderate' }),
  makePlant({ id: 'c', commonName: 'Saw Palmetto', sunExposure: ['full', 'part', 'shade'], droughtTolerance: 'high', saltTolerance: 'high' }),
]

describe('filterPlants', () => {
  it('returns everything for empty filters', () => {
    expect(filterPlants(catalog, EMPTY_CATALOG_FILTERS)).toHaveLength(3)
  })

  it('matches search text against names, scientific names, and tags, case-insensitively', () => {
    const byCommon = filterPlants(catalog, { ...EMPTY_CATALOG_FILTERS, searchText: 'fireb' })
    expect(byPlants(byCommon)).toEqual(['a'])

    const byScientific = filterPlants(catalog, { ...EMPTY_CATALOG_FILTERS, searchText: 'eriobotrya' })
    expect(byPlants(byScientific)).toEqual(['b'])

    const byTag = filterPlants(catalog, { ...EMPTY_CATALOG_FILTERS, searchText: 'HUMMINGBIRD' })
    expect(byPlants(byTag)).toEqual(['a'])
  })

  it('filters to any of the selected categories', () => {
    const filters: CatalogFilters = { ...EMPTY_CATALOG_FILTERS, categories: ['native', 'edible'] }
    expect(filterPlants(catalog, filters)).toHaveLength(3)

    const edibleOnly: CatalogFilters = { ...EMPTY_CATALOG_FILTERS, categories: ['edible'] }
    expect(byPlants(filterPlants(catalog, edibleOnly))).toEqual(['b'])
  })

  it('requires the plant to tolerate the requested sun exposure', () => {
    const shadeOnly: CatalogFilters = { ...EMPTY_CATALOG_FILTERS, sunExposure: 'shade' }
    expect(byPlants(filterPlants(catalog, shadeOnly))).toEqual(['c'])
  })

  it('applies tolerance minimums on the none<low<moderate<high ladder', () => {
    const highDrought: CatalogFilters = { ...EMPTY_CATALOG_FILTERS, minimumDroughtTolerance: 'high' }
    expect(byPlants(filterPlants(catalog, highDrought))).toEqual(['a', 'c'])

    const moderateSalt: CatalogFilters = { ...EMPTY_CATALOG_FILTERS, minimumSaltTolerance: 'moderate' }
    expect(byPlants(filterPlants(catalog, moderateSalt))).toEqual(['b', 'c'])
  })

  it('filters by bloom month membership', () => {
    const julyBlooms: CatalogFilters = { ...EMPTY_CATALOG_FILTERS, bloomMonth: 7 }
    expect(byPlants(filterPlants(catalog, julyBlooms))).toEqual(['a'])
  })

  it('combines all filters conjunctively', () => {
    const combined: CatalogFilters = {
      ...EMPTY_CATALOG_FILTERS,
      sunExposure: 'full',
      minimumDroughtTolerance: 'high',
      bloomMonth: 6,
    }
    expect(byPlants(filterPlants(catalog, combined))).toEqual(['a'])
  })
})

function byPlants(plants: Plant[]): string[] {
  return plants.map((plant) => plant.id)
}

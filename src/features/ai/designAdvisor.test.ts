import { describe, expect, it } from 'vitest'
import type { Plant } from '@core/domain/plant'
import { RuleBasedDesignAdvisor } from './designAdvisor'
import type { SiteProfile } from './designAdvisor'

function makePlant(overrides: Partial<Plant>): Plant {
  return {
    id: 'x',
    commonName: 'X',
    scientificName: 'X x',
    category: 'native',
    form: 'shrub',
    images: { juvenileUrl: '', matureUrl: '' },
    bloomMonths: [],
    yearsToMaturity: 1,
    matureHeightFeet: 4,
    matureSpreadFeet: 3,
    sunExposure: ['full'],
    soilTextures: ['sand'],
    soilMoisture: ['dry'],
    saltTolerance: 'low',
    droughtTolerance: 'moderate',
    germinationTempF: null,
    notes: '',
    tags: [],
    attributes: {},
    ...overrides,
  }
}

const catalog = [
  makePlant({ id: 'sun-native', droughtTolerance: 'high' }),
  makePlant({ id: 'shade-edible', category: 'edible', sunExposure: ['shade'], droughtTolerance: 'high', saltTolerance: 'high' }),
  makePlant({ id: 'coastal-edible', category: 'edible', saltTolerance: 'high', droughtTolerance: 'moderate' }),
]

const advisor = new RuleBasedDesignAdvisor()

describe('RuleBasedDesignAdvisor', () => {
  it('excludes plants that cannot handle the site sun exposure', async () => {
    const profile: SiteProfile = {
      sunExposure: 'full',
      requiresSaltTolerance: false,
      preferredCategories: [],
      freeTextNotes: '',
    }
    const ids = (await advisor.recommendPlants(profile, catalog)).map((plant) => plant.id)
    expect(ids).toContain('sun-native')
    expect(ids).not.toContain('shade-edible')
  })

  it('respects the salt constraint for coastal sites', async () => {
    const coastalProfile: SiteProfile = {
      sunExposure: null,
      requiresSaltTolerance: true,
      preferredCategories: [],
      freeTextNotes: '',
    }
    const ids = (await advisor.recommendPlants(coastalProfile, catalog)).map((plant) => plant.id)
    expect(ids).not.toContain('sun-native')
  })

  it('ranks preferred categories above non-preferred ones', async () => {
    const ediblePreference: SiteProfile = {
      sunExposure: null,
      requiresSaltTolerance: false,
      preferredCategories: ['edible'],
      freeTextNotes: '',
    }
    const topTwo = (await advisor.recommendPlants(ediblePreference, catalog))
      .slice(0, 2)
      .map((plant) => plant.id)
      .sort()
    expect(topTwo).toEqual(['coastal-edible', 'shade-edible'])
  })

  it('caps the number of recommendations', async () => {
    const bigCatalog = Array.from({ length: 30 }, (_, index) =>
      makePlant({ id: `plant-${index}` }),
    )
    const recommendations = await advisor.recommendPlants(
      { sunExposure: null, requiresSaltTolerance: false, preferredCategories: [], freeTextNotes: '' },
      bigCatalog,
    )
    expect(recommendations.length).toBeLessThanOrEqual(8)
  })
})

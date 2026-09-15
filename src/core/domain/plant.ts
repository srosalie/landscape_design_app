/**
 * Plant catalog domain types.
 *
 * Field values use controlled vocabularies (the const arrays below) so filters,
 * storage, and future server queries all agree. The same vocabularies exist in
 * src/data/vocabulary.json for build scripts; a unit test asserts the two stay
 * in sync.
 *
 * Extensibility notes:
 *  - New catalog domains (mulch, rock, water features...) start with a new
 *    PlantCategory; species-specific extras belong in `attributes` until they
 *    graduate to real columns/fields.
 *  - `germinationTempF` is nullable because many edible species are propagated
 *    by cuttings/slips/pups rather than seed.
 */

import vocabularyJson from '@data/vocabulary.json'

export type PlantCategory =
  | 'native'
  | 'edible'
  | 'ornamental'
  | 'material'
  | 'water'

export type PlantForm =
  | 'tree'
  | 'shrub'
  | 'palm'
  | 'grass'
  | 'groundcover'
  | 'vine'
  | 'herb'

export type SunExposure = 'full' | 'part' | 'shade'
export type SoilTexture = 'sand' | 'loam' | 'clay'
export type SoilMoisture = 'dry' | 'moist' | 'wet'
export type ToleranceLevel = 'none' | 'low' | 'moderate' | 'high'

export const PLANT_CATEGORIES: readonly PlantCategory[] = [
  'native',
  'edible',
  'ornamental',
  'material',
  'water',
]
export const PLANT_FORMS: readonly PlantForm[] = [
  'tree',
  'shrub',
  'palm',
  'grass',
  'groundcover',
  'vine',
  'herb',
]
export const SUN_EXPOSURES: readonly SunExposure[] = ['full', 'part', 'shade']
export const SOIL_TEXTURES: readonly SoilTexture[] = ['sand', 'loam', 'clay']
export const SOIL_MOISTURES: readonly SoilMoisture[] = ['dry', 'moist', 'wet']
export const TOLERANCE_LEVELS: readonly ToleranceLevel[] = ['none', 'low', 'moderate', 'high']

const vocabulary = vocabularyJson as {
  plantCategories: string[]
  plantForms: string[]
  sunExposures: string[]
  soilTextures: string[]
  soilMoistures: string[]
}

/**
 * Runtime access to the script-side vocabulary, exposed so UI filter controls
 * and drift-check tests share one source. Cast through unknown because JSON
 * imports lose literal narrowing.
 */
export function getScriptVocabulary(): Record<string, string[]> {
  return { ...vocabulary }
}

export interface SpeciesImages {
  /** Small starter plant (1 gallon pot look). */
  juvenileUrl: string
  /** Full-grown specimen. */
  matureUrl: string
}

export interface GerminationRange {
  minFahrenheit: number
  maxFahrenheit: number
}

export interface Plant {
  id: string
  commonName: string
  scientificName: string
  category: PlantCategory
  form: PlantForm
  images: SpeciesImages
  /** Month numbers 1-12; empty for non-blooming entries. */
  bloomMonths: number[]
  yearsToMaturity: number
  matureHeightFeet: number
  matureSpreadFeet: number
  sunExposure: SunExposure[]
  soilTextures: SoilTexture[]
  soilMoisture: SoilMoisture[]
  saltTolerance: ToleranceLevel
  droughtTolerance: ToleranceLevel
  germinationTempF: GerminationRange | null
  notes: string
  tags: string[]
  /**
   * Open-ended extension bag for future fields (water needs, wildlife value,
   * price tiers...). Never required by app logic today.
   */
  attributes: Record<string, unknown>
}

import { describe, expect, it } from 'vitest'
import { getScriptVocabulary } from './plant'

/**
 * Guards the single-source-of-truth contract: src/data/vocabulary.json drives
 * the build scripts, while this module's literal types drive the app. If these
 * drift apart, seeds can carry values the UI cannot render.
 */
describe('vocabulary sync', () => {
  it('matches vocabulary.json exactly', () => {
    const scriptVocabulary = getScriptVocabulary()
    expect(scriptVocabulary.plantCategories.sort()).toEqual(
      ['edible', 'material', 'native', 'ornamental', 'water'].sort(),
    )
    expect(scriptVocabulary.plantForms.sort()).toEqual(
      ['grass', 'groundcover', 'herb', 'palm', 'shrub', 'tree', 'vine'].sort(),
    )
    expect(scriptVocabulary.sunExposures.sort()).toEqual(['full', 'part', 'shade'].sort())
    expect(scriptVocabulary.soilTextures.sort()).toEqual(['clay', 'loam', 'sand'].sort())
    expect(scriptVocabulary.soilMoistures.sort()).toEqual(['dry', 'moist', 'wet'].sort())
  })
})

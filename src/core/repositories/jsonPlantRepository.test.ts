import { describe, expect, it } from 'vitest'
import { getPlantRepository } from './jsonPlantRepository'

describe('jsonPlantRepository', () => {
  it('serves the full generated catalog', async () => {
    const plants = await getPlantRepository().getAllPlants()
    expect(plants.length).toBeGreaterThanOrEqual(20)
    expect(plants[0].id).toBeTruthy()
  })

  it('resolves species by id with derived image URLs', async () => {
    const firebush = await getPlantRepository().getPlantById('firebush')
    expect(firebush?.commonName).toBe('Firebush')
    expect(firebush?.images.matureUrl).toBe('/plants/firebush-mature.svg')
    expect(firebush?.images.juvenileUrl).toBe('/plants/firebush-juvenile.svg')
  })

  it('returns undefined for unknown ids', async () => {
    await expect(getPlantRepository().getPlantById('not-a-plant')).resolves.toBeUndefined()
  })
})

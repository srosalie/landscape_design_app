/**
 * JSON-snapshot implementation of PlantRepository.
 *
 * The snapshot (src/data/generated/plants.json) is produced by `npm run seed`
 * from db/seed/species.json and bundled with the app, so catalog loads are
 * instant and work offline. A runtime guard fails loudly if the snapshot is
 * missing or empty - a silent empty catalog would look like a bug.
 */

import catalogSnapshot from '@data/generated/plants.json'
import type { Plant } from '../domain/plant'
import type { PlantRepository } from './plantRepository'

let cachedRepository: PlantRepository | null = null

function assertSnapshotIsValid(plants: unknown): asserts plants is Plant[] {
  if (!Array.isArray(plants) || plants.length === 0) {
    throw new Error(
      'Plant catalog snapshot is missing or empty. Run "npm run data" to regenerate it.',
    )
  }
}

export function getPlantRepository(): PlantRepository {
  if (cachedRepository) return cachedRepository

  assertSnapshotIsValid(catalogSnapshot)
  // JSON imports widen discriminated fields to string; cast through unknown.
  const plants = catalogSnapshot as unknown as Plant[]
  const plantsById = new Map(plants.map((plant) => [plant.id, plant]))

  const repository: PlantRepository = {
    async getAllPlants() {
      return plants
    },
    async getPlantById(id: string) {
      return plantsById.get(id)
    },
  }
  cachedRepository = repository
  return repository
}

/**
 * Repository boundary for the plant catalog.
 *
 * The whole app reads species data through this interface only. Today it is
 * backed by a generated JSON snapshot; swapping in a REST/SQLite backend later
 * means implementing the interface and changing the single factory call site
 * (see usePlantCatalog) - no feature code changes.
 */

import type { Plant } from '../domain/plant'

export interface PlantRepository {
  getAllPlants(): Promise<Plant[]>
  getPlantById(id: string): Promise<Plant | undefined>
}

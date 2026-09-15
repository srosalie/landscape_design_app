/**
 * React hook exposing the plant catalog to feature components.
 *
 * This is the ONLY place that resolves the PlantRepository implementation.
 * When a backend arrives, change the factory call here and every consumer
 * follows automatically.
 */

import { useEffect, useMemo, useState } from 'react'
import type { Plant } from '@core/domain/plant'
import { getPlantRepository } from '@core/repositories/jsonPlantRepository'

export interface PlantCatalog {
  plants: Plant[]
  plantsById: Map<string, Plant>
  loadError: string | null
}

export function usePlantCatalog(): PlantCatalog {
  const [plants, setPlants] = useState<Plant[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getPlantRepository()
      .getAllPlants()
      .then((loaded) => {
        if (!cancelled) setPlants(loaded)
      })
      .catch((error: unknown) => {
        console.error('Failed to load plant catalog', error)
        if (!cancelled) setLoadError(String(error))
      })
    return () => {
      cancelled = true
    }
  }, [])

  const plantsById = useMemo(() => new Map(plants.map((plant) => [plant.id, plant])), [plants])
  return { plants, plantsById, loadError }
}

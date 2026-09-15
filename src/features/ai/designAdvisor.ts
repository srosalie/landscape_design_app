/**
 * AI design-assistant boundary.
 *
 * The app will eventually call an LLM to suggest species and layout concepts.
 * All feature code should depend on the DesignAdvisor interface, never on a
 * concrete provider, so the real integration is a one-line swap here. The
 * rule-based implementation ships as both the MVP behavior and the fallback
 * whenever no API key/configured backend exists.
 */

import type { PlantCategory, Plant, SunExposure } from '@core/domain/plant'

export interface SiteProfile {
  sunExposure: SunExposure | null
  /** Coastal properties should get salt-tolerant picks only. */
  requiresSaltTolerance: boolean
  preferredCategories: PlantCategory[]
  freeTextNotes: string
}

export interface DesignAdvisor {
  recommendPlants(profile: SiteProfile, catalog: Plant[]): Promise<Plant[]>
}

/** Hard cap so a chatty future LLM implementation cannot flood the UI. */
const MAX_RECOMMENDATIONS = 8

/**
 * Deterministic advisor: hard-filters on site constraints, prefers the
 * requested categories, then ranks by drought tolerance. Deliberately simple;
 * replace with an API-backed implementation when AI features come online.
 */
export class RuleBasedDesignAdvisor implements DesignAdvisor {
  async recommendPlants(profile: SiteProfile, catalog: Plant[]): Promise<Plant[]> {
    const eligible = catalog.filter((plant) => {
      const sunMatches = !profile.sunExposure || plant.sunExposure.includes(profile.sunExposure)
      const saltMatches =
        !profile.requiresSaltTolerance ||
        plant.saltTolerance === 'high' ||
        plant.saltTolerance === 'moderate'
      return sunMatches && saltMatches
    })

    const scorePlant = (plant: Plant): number => {
      let score = plant.droughtTolerance === 'high' ? 2 : 1
      if (profile.preferredCategories.includes(plant.category)) score += 3
      return score
    }

    return [...eligible]
      .sort((first, second) => scorePlant(second) - scorePlant(first))
      .slice(0, MAX_RECOMMENDATIONS)
  }
}

export const designAdvisor: DesignAdvisor = new RuleBasedDesignAdvisor()

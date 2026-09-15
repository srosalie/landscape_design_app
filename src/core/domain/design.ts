/**
 * Design scene domain types and scale math.
 *
 * Coordinates are deliberately stored in FEET (world units), not pixels:
 * recalibrating the photo rescales drawings automatically, and world-unit
 * storage keeps the door open to GIS/CAD interchange later (GeoJSON, DXF).
 * Conversion to pixels happens only at render time via pixelsPerFoot().
 *
 * Placements render bottom-anchored at their center X, centered vertically on
 * centerYFeet. Z-ordering equals array order in `placements`.
 */

import type { Plant } from './plant'

/** Assumed property width when no calibration exists yet (rough estimate only). */
export const ESTIMATED_SCENE_WIDTH_FEET = 50

/** A 1 gallon nursery plant occupies roughly this footprint regardless of species. */
export const JUVENILE_SPREAD_FEET = 1

/** User-adjustable size multiplier bounds around the species' natural size. */
export const MIN_SIZE_SCALE_FACTOR = 0.25
export const MAX_SIZE_SCALE_FACTOR = 3

/** Mature art aspect ratio clamps; mirrors scripts/generate-art.mjs. */
export const MIN_HEIGHT_TO_SPREAD_RATIO = 0.7
export const MAX_HEIGHT_TO_SPREAD_RATIO = 1.7

export type SizeMode = 'juvenile' | 'mature'

export interface Placement {
  id: string
  plantId: string
  centerXFeet: number
  centerYFeet: number
  rotationDegrees: number
  /**
   * Multiplier around the natural size (1 = true to scale). Lets users fine
   * tune individual specimens without breaking overall scene calibration.
   */
  sizeScaleFactor: number
  sizeMode: SizeMode
}

/** How many photo pixels correspond to a known real-world distance. */
export interface PhotoCalibration {
  pixelLength: number
  feetLength: number
}

export interface DesignScene {
  /** Uploaded property photo as a data URL (self-contained projects). */
  photoDataUrl: string
  photoPixelWidth: number
  photoPixelHeight: number
  calibration: PhotoCalibration | null
  placements: Placement[]
}

/**
 * Scale factor for the scene. Uses the calibration when available, otherwise
 * assumes ESTIMATED_SCENE_WIDTH_FEET across the photo so the editor remains
 * usable before the user calibrates (placements then show an estimate badge).
 */
export function pixelsPerFoot(scene: Pick<DesignScene, 'photoPixelWidth' | 'calibration'>): number {
  if (scene.calibration && scene.calibration.feetLength > 0) {
    return scene.calibration.pixelLength / scene.calibration.feetLength
  }
  return scene.photoPixelWidth / ESTIMATED_SCENE_WIDTH_FEET
}

function heightToSpreadRatio(plant: Plant): number {
  const rawRatio = plant.matureHeightFeet / plant.matureSpreadFeet
  return Math.min(MAX_HEIGHT_TO_SPREAD_RATIO, Math.max(MIN_HEIGHT_TO_SPREAD_RATIO, rawRatio))
}

/** Rendered footprint of one placement in real-world feet, honoring size mode. */
export function placementSizeFeet(plant: Plant, placement: Placement): { widthFeet: number; heightFeet: number } {
  const baseSpread =
    placement.sizeMode === 'juvenile' ? JUVENILE_SPREAD_FEET : plant.matureSpreadFeet
  const widthFeet = baseSpread * placement.sizeScaleFactor
  return { widthFeet, heightFeet: widthFeet * heightToSpreadRatio(plant) }
}

/**
 * Small pure geometry helpers shared by the designer canvas and tests.
 * Kept dependency-free so they run identically in browsers, tests, and a
 * future React Native client.
 */

export interface Point2D {
  x: number
  y: number
}

export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

/** Rotates `point` around `center` by the given angle (degrees, clockwise in screen space). */
export function rotatePoint(point: Point2D, center: Point2D, rotationDegrees: number): Point2D {
  const radians = degreesToRadians(rotationDegrees)
  const offsetX = point.x - center.x
  const offsetY = point.y - center.y
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  return {
    x: center.x + offsetX * cos - offsetY * sin,
    y: center.y + offsetX * sin + offsetY * cos,
  }
}

/** Angle of the vector center->point in degrees, normalized to (-180, 180]. */
export function angleFromCenterDegrees(point: Point2D, center: Point2D): number {
  const radians = Math.atan2(point.y - center.y, point.x - center.x)
  const degrees = (radians * 180) / Math.PI
  if (degrees > 180) return degrees - 360
  return degrees
}

/** Normalizes any angle to the equivalent value within [-180, 180). */
export function normalizeAngleDegrees(degrees: number): number {
  let normalized = degrees % 360
  if (normalized >= 180) normalized -= 360
  if (normalized < -180) normalized += 360
  return normalized
}

export function distanceBetween(first: Point2D, second: Point2D): number {
  const deltaX = first.x - second.x
  const deltaY = first.y - second.y
  return Math.hypot(deltaX, deltaY)
}

export function clampValue(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

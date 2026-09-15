import { describe, expect, it } from 'vitest'
import {
  angleFromCenterDegrees,
  clampValue,
  distanceBetween,
  normalizeAngleDegrees,
  rotatePoint,
} from './geometry'

describe('rotatePoint', () => {
  it('rotates a quarter turn clockwise around the origin', () => {
    const rotated = rotatePoint({ x: 1, y: 0 }, { x: 0, y: 0 }, 90)
    expect(rotated.x).toBeCloseTo(0)
    expect(rotated.y).toBeCloseTo(1)
  })

  it('leaves the center point fixed', () => {
    const center = { x: 3, y: -2 }
    expect(rotatePoint(center, center, 137)).toEqual(center)
  })
})

describe('angleFromCenterDegrees', () => {
  it('reports cardinal directions', () => {
    const center = { x: 0, y: 0 }
    expect(angleFromCenterDegrees({ x: 5, y: 0 }, center)).toBe(0)
    expect(angleFromCenterDegrees({ x: 0, y: 5 }, center)).toBe(90)
  })
})

describe('normalizeAngleDegrees', () => {
  it('wraps angles into the (-180, 180] range', () => {
    expect(normalizeAngleDegrees(370)).toBe(10)
    expect(normalizeAngleDegrees(-190)).toBe(170)
    expect(normalizeAngleDegrees(180)).toBe(-180)
  })
})

describe('distanceBetween', () => {
  it('computes euclidean distance', () => {
    expect(distanceBetween({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5)
  })
})

describe('clampValue', () => {
  it('clamps to bounds and passes interior values through', () => {
    expect(clampValue(5, 0, 3)).toBe(3)
    expect(clampValue(-2, 0, 3)).toBe(0)
    expect(clampValue(2, 0, 3)).toBe(2)
  })
})

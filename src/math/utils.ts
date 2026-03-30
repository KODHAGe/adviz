/** π as a constant (avoids repeated Math.PI). */
export const PI = Math.PI

/** 2π — full rotation in radians. */
export const TWO_PI = Math.PI * 2

/** π/2 — quarter rotation in radians. */
export const HALF_PI = Math.PI / 2

/** Converts degrees to radians. */
export function degToRad(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/** Converts radians to degrees. */
export function radToDeg(radians: number): number {
  return radians * (180 / Math.PI)
}

/**
 * Clamps `value` to the range [min, max].
 *
 * @example
 * clamp(1.5, 0, 1) // returns 1
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * Linear interpolation between `a` and `b`.
 * @param t - Interpolation factor in [0, 1].
 *
 * @example
 * lerp(0, 10, 0.5) // returns 5
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/**
 * Maps `value` from range [inMin, inMax] to [outMin, outMax].
 *
 * @example
 * remap(0.5, 0, 1, 0, 100) // returns 50
 */
export function remap(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin)
}

/**
 * Returns the fractional part of `value` (value - floor(value)).
 *
 * @example
 * fract(3.75) // returns 0.75
 */
export function fract(value: number): number {
  return value - Math.floor(value)
}

/**
 * Smooth step: smoothly interpolates between 0 and 1 for `t` in [edge0, edge1].
 * Uses the Ken Perlin smoothstep formula.
 *
 * @example
 * smoothstep(0, 1, 0.5) // returns 0.5
 * smoothstep(0, 1, 0.25) // returns 0.15625
 */
export function smoothstep(edge0: number, edge1: number, t: number): number {
  const x = clamp((t - edge0) / (edge1 - edge0), 0, 1)
  return x * x * (3 - 2 * x)
}

/**
 * Returns true if `value` is approximately equal to `target` within `epsilon`.
 *
 * @example
 * approxEqual(0.1 + 0.2, 0.3) // returns true
 */
export function approxEqual(value: number, target: number, epsilon = 1e-6): boolean {
  return Math.abs(value - target) < epsilon
}

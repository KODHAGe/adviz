/**
 * @module adviz/animation
 *
 * Easing functions and a simple tween utility.
 */

/** A function that maps a linear `t` in [0, 1] to an eased value. */
export type EasingFn = (t: number) => number

/** Linear (no easing). */
export const easeLinear: EasingFn = (t) => t

/** Ease in — slow start. */
export const easeInQuad: EasingFn = (t) => t * t

/** Ease out — slow end. */
export const easeOutQuad: EasingFn = (t) => t * (2 - t)

/** Ease in-out — slow start and end. */
export const easeInOutQuad: EasingFn = (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t)

/** Ease in cubic. */
export const easeInCubic: EasingFn = (t) => t * t * t

/** Ease out cubic. */
export const easeOutCubic: EasingFn = (t) => --t * t * t + 1

/** Ease in-out cubic. */
export const easeInOutCubic: EasingFn = (t) =>
  t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1

/** Exponential ease in. */
export const easeInExpo: EasingFn = (t) => (t === 0 ? 0 : Math.pow(2, 10 * (t - 1)))

/** Exponential ease out. */
export const easeOutExpo: EasingFn = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t))

/**
 * Returns the eased value for `t` in [0, 1] given a duration and elapsed time.
 *
 * @param elapsed - Elapsed time in ms since the tween started.
 * @param duration - Total tween duration in ms.
 * @param from - Start value.
 * @param to - End value.
 * @param easing - Easing function. Defaults to easeLinear.
 *
 * @example
 * const x = tween(info.elapsed, 1000, 0, 100) // 0 → 100 over 1 second
 */
export function tween(
  elapsed: number,
  duration: number,
  from: number,
  to: number,
  easing: EasingFn = easeLinear
): number {
  const t = Math.min(elapsed / duration, 1)
  return from + (to - from) * easing(t)
}

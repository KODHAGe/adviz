/**
 * 2-component float vector.
 *
 * @example
 * const v = vec2(1, 2)
 * const len = v.length()
 * const normalized = v.normalize()
 */
export class Vec2 {
  constructor(
    public x: number,
    public y: number
  ) {}

  /** Returns the Euclidean length of this vector. */
  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y)
  }

  /** Returns the squared length (avoids sqrt — use for comparisons). */
  lengthSq(): number {
    return this.x * this.x + this.y * this.y
  }

  /** Returns a new normalized Vec2. Does not modify this vector. */
  normalize(): Vec2 {
    const len = this.length()
    if (len === 0) return new Vec2(0, 0)
    return new Vec2(this.x / len, this.y / len)
  }

  /** Returns a new Vec2 that is the sum of this and `other`. */
  add(other: Vec2): Vec2 {
    return new Vec2(this.x + other.x, this.y + other.y)
  }

  /** Returns a new Vec2 that is this minus `other`. */
  sub(other: Vec2): Vec2 {
    return new Vec2(this.x - other.x, this.y - other.y)
  }

  /** Returns a new Vec2 scaled by `scalar`. */
  scale(scalar: number): Vec2 {
    return new Vec2(this.x * scalar, this.y * scalar)
  }

  /** Returns the dot product of this and `other`. */
  dot(other: Vec2): number {
    return this.x * other.x + this.y * other.y
  }

  /** Returns the 2D cross product (z-component of 3D cross). */
  cross(other: Vec2): number {
    return this.x * other.y - this.y * other.x
  }

  /** Returns a new Vec2 linearly interpolated between this and `other` by `t` (0–1). */
  lerp(other: Vec2, t: number): Vec2 {
    return new Vec2(this.x + (other.x - this.x) * t, this.y + (other.y - this.y) * t)
  }

  /** Returns a new Vec2 component-wise multiplied with `other`. */
  mul(other: Vec2): Vec2 {
    return new Vec2(this.x * other.x, this.y * other.y)
  }

  /** Returns a new Vec2 with both components negated. */
  negate(): Vec2 {
    return new Vec2(-this.x, -this.y)
  }

  /** Returns the distance from this vector to `other`. */
  distanceTo(other: Vec2): number {
    return this.sub(other).length()
  }

  /** Returns a flat [x, y] Float32Array for GPU upload. */
  toFloat32Array(): Float32Array {
    return new Float32Array([this.x, this.y])
  }

  /** Returns a copy of this Vec2. */
  clone(): Vec2 {
    return new Vec2(this.x, this.y)
  }

  toString(): string {
    return `Vec2(${this.x}, ${this.y})`
  }
}

/**
 * Constructs a Vec2.
 *
 * @example
 * const v = vec2(3, 4)
 */
export function vec2(x: number, y: number): Vec2 {
  return new Vec2(x, y)
}

/** Vec2 with both components set to 0. */
export const VEC2_ZERO: Readonly<Vec2> = Object.freeze(new Vec2(0, 0))

/** Vec2 with both components set to 1. */
export const VEC2_ONE: Readonly<Vec2> = Object.freeze(new Vec2(1, 1))

/** Unit Vec2 pointing right (+X). */
export const VEC2_RIGHT: Readonly<Vec2> = Object.freeze(new Vec2(1, 0))

/** Unit Vec2 pointing up (+Y). */
export const VEC2_UP: Readonly<Vec2> = Object.freeze(new Vec2(0, 1))

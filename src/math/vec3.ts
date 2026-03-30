/**
 * 3-component float vector.
 *
 * @example
 * const v = vec3(1, 2, 3)
 * const cross = v.cross(vec3(0, 1, 0))
 */
export class Vec3 {
  constructor(
    public x: number,
    public y: number,
    public z: number
  ) {}

  /** Returns the Euclidean length of this vector. */
  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z)
  }

  /** Returns the squared length (avoids sqrt — use for comparisons). */
  lengthSq(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z
  }

  /** Returns a new normalized Vec3. Does not modify this vector. */
  normalize(): Vec3 {
    const len = this.length()
    if (len === 0) return new Vec3(0, 0, 0)
    return new Vec3(this.x / len, this.y / len, this.z / len)
  }

  /** Returns a new Vec3 that is the sum of this and `other`. */
  add(other: Vec3): Vec3 {
    return new Vec3(this.x + other.x, this.y + other.y, this.z + other.z)
  }

  /** Returns a new Vec3 that is this minus `other`. */
  sub(other: Vec3): Vec3 {
    return new Vec3(this.x - other.x, this.y - other.y, this.z - other.z)
  }

  /** Returns a new Vec3 scaled by `scalar`. */
  scale(scalar: number): Vec3 {
    return new Vec3(this.x * scalar, this.y * scalar, this.z * scalar)
  }

  /** Returns the dot product of this and `other`. */
  dot(other: Vec3): number {
    return this.x * other.x + this.y * other.y + this.z * other.z
  }

  /**
   * Returns the cross product of this and `other`.
   * The result is perpendicular to both input vectors.
   */
  cross(other: Vec3): Vec3 {
    return new Vec3(
      this.y * other.z - this.z * other.y,
      this.z * other.x - this.x * other.z,
      this.x * other.y - this.y * other.x
    )
  }

  /** Returns a new Vec3 linearly interpolated between this and `other` by `t` (0–1). */
  lerp(other: Vec3, t: number): Vec3 {
    return new Vec3(
      this.x + (other.x - this.x) * t,
      this.y + (other.y - this.y) * t,
      this.z + (other.z - this.z) * t
    )
  }

  /** Returns a new Vec3 component-wise multiplied with `other`. */
  mul(other: Vec3): Vec3 {
    return new Vec3(this.x * other.x, this.y * other.y, this.z * other.z)
  }

  /** Returns a new Vec3 with all components negated. */
  negate(): Vec3 {
    return new Vec3(-this.x, -this.y, -this.z)
  }

  /** Returns the distance from this vector to `other`. */
  distanceTo(other: Vec3): number {
    return this.sub(other).length()
  }

  /** Returns a flat [x, y, z] Float32Array for GPU upload. */
  toFloat32Array(): Float32Array {
    return new Float32Array([this.x, this.y, this.z])
  }

  /** Returns a copy of this Vec3. */
  clone(): Vec3 {
    return new Vec3(this.x, this.y, this.z)
  }

  toString(): string {
    return `Vec3(${this.x}, ${this.y}, ${this.z})`
  }
}

/**
 * Constructs a Vec3.
 *
 * @example
 * const v = vec3(0, 1, 0) // up vector
 */
export function vec3(x: number, y: number, z: number): Vec3 {
  return new Vec3(x, y, z)
}

/** Vec3 with all components set to 0. */
export const VEC3_ZERO: Readonly<Vec3> = Object.freeze(new Vec3(0, 0, 0))

/** Vec3 with all components set to 1. */
export const VEC3_ONE: Readonly<Vec3> = Object.freeze(new Vec3(1, 1, 1))

/** Unit Vec3 pointing right (+X). */
export const VEC3_RIGHT: Readonly<Vec3> = Object.freeze(new Vec3(1, 0, 0))

/** Unit Vec3 pointing up (+Y). */
export const VEC3_UP: Readonly<Vec3> = Object.freeze(new Vec3(0, 1, 0))

/** Unit Vec3 pointing forward (+Z). */
export const VEC3_FORWARD: Readonly<Vec3> = Object.freeze(new Vec3(0, 0, 1))

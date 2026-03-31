/**
 * 4-component float vector. Used for homogeneous coordinates and RGBA colors.
 *
 * @example
 * const v = vec4(0, 0, 0, 1) // homogeneous point at origin
 * const c = vec4(1, 0.5, 0, 1) // orange color
 */
export class Vec4 {
  constructor(
    public x: number,
    public y: number,
    public z: number,
    public w: number
  ) {}

  /** Returns the Euclidean length of this vector (all 4 components). */
  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w)
  }

  /** Returns a new normalized Vec4. Does not modify this vector. */
  normalize(): Vec4 {
    const len = this.length()
    if (len === 0) return new Vec4(0, 0, 0, 0)
    return new Vec4(this.x / len, this.y / len, this.z / len, this.w / len)
  }

  /** Returns a new Vec4 that is the sum of this and `other`. */
  add(other: Vec4): Vec4 {
    return new Vec4(this.x + other.x, this.y + other.y, this.z + other.z, this.w + other.w)
  }

  /** Returns a new Vec4 that is this minus `other`. */
  sub(other: Vec4): Vec4 {
    return new Vec4(this.x - other.x, this.y - other.y, this.z - other.z, this.w - other.w)
  }

  /** Returns a new Vec4 scaled by `scalar`. */
  scale(scalar: number): Vec4 {
    return new Vec4(this.x * scalar, this.y * scalar, this.z * scalar, this.w * scalar)
  }

  /** Returns the dot product of this and `other`. */
  dot(other: Vec4): number {
    return this.x * other.x + this.y * other.y + this.z * other.z + this.w * other.w
  }

  /** Returns a new Vec4 linearly interpolated between this and `other` by `t` (0–1). */
  lerp(other: Vec4, t: number): Vec4 {
    return new Vec4(
      this.x + (other.x - this.x) * t,
      this.y + (other.y - this.y) * t,
      this.z + (other.z - this.z) * t,
      this.w + (other.w - this.w) * t
    )
  }

  /** Returns a flat [x, y, z, w] Float32Array for GPU upload. */
  toFloat32Array(): Float32Array {
    return new Float32Array([this.x, this.y, this.z, this.w])
  }

  /** Returns a copy of this Vec4. */
  clone(): Vec4 {
    return new Vec4(this.x, this.y, this.z, this.w)
  }

  toString(): string {
    return `Vec4(${String(this.x)}, ${String(this.y)}, ${String(this.z)}, ${String(this.w)})`
  }
}

/**
 * Constructs a Vec4.
 *
 * @example
 * const v = vec4(1, 0, 0, 1) // red in RGBA
 */
export function vec4(x: number, y: number, z: number, w: number): Vec4 {
  return new Vec4(x, y, z, w)
}

/** Vec4 with all components set to 0. */
export const VEC4_ZERO: Readonly<Vec4> = Object.freeze(new Vec4(0, 0, 0, 0))

/** Vec4 identity for homogeneous coordinates (0,0,0,1). */
export const VEC4_IDENTITY: Readonly<Vec4> = Object.freeze(new Vec4(0, 0, 0, 1))

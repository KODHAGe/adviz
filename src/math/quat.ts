import type { Vec3 } from './vec3.js'
import { Vec3 as Vec3Class } from './vec3.js'
import { Mat4 } from './mat4.js'

/**
 * Unit quaternion representing a 3D rotation.
 * All operations are immutable — methods return new instances.
 * Stored as (x, y, z, w) where w is the scalar component.
 *
 * @example
 * const q = Quat.fromAxisAngle(vec3(0, 1, 0), Math.PI / 4)
 * const rotated = q.rotateVec3(vec3(1, 0, 0))
 */
export class Quat {
  constructor(
    public readonly x: number,
    public readonly y: number,
    public readonly z: number,
    public readonly w: number
  ) {}

  /** Returns the identity quaternion (no rotation). */
  static identity(): Quat {
    return new Quat(0, 0, 0, 1)
  }

  /**
   * Creates a quaternion from an axis and angle.
   *
   * @param axis - Unit vector defining the rotation axis.
   * @param angle - Rotation angle in radians.
   *
   * @example
   * const spin = Quat.fromAxisAngle(vec3(0, 1, 0), Math.PI / 2)
   */
  static fromAxisAngle(axis: Vec3, angle: number): Quat {
    const half = angle * 0.5
    const s = Math.sin(half)
    return new Quat(axis.x * s, axis.y * s, axis.z * s, Math.cos(half))
  }

  /**
   * Creates a quaternion from Euler angles using YXZ (yaw-pitch-roll) order.
   * This matches `SceneNode.worldMatrix`'s `Ry * Rx * Rz` composition order.
   *
   * @param pitch - Rotation around X in radians.
   * @param yaw   - Rotation around Y in radians.
   * @param roll  - Rotation around Z in radians.
   *
   * @example
   * const q = Quat.fromEuler(0, Math.PI / 4, 0) // 45° yaw
   */
  static fromEuler(pitch: number, yaw: number, roll: number): Quat {
    const hp = pitch * 0.5
    const hy = yaw * 0.5
    const hr = roll * 0.5
    const sp = Math.sin(hp), cp = Math.cos(hp)
    const sy = Math.sin(hy), cy = Math.cos(hy)
    const sr = Math.sin(hr), cr = Math.cos(hr)
    // YXZ: q = qY * qX * qZ
    return new Quat(
      cy * sp * cr + sy * cp * sr,
      sy * cp * cr - cy * sp * sr,
      cy * cp * sr - sy * sp * cr,
      cy * cp * cr + sy * sp * sr
    )
  }

  /**
   * Extracts the rotation from a Mat4 (upper-left 3×3).
   * Assumes the matrix is orthonormal (no shear or non-uniform scale).
   *
   * @example
   * const q = Quat.fromMat4(Mat4.rotationY(Math.PI / 4))
   */
  static fromMat4(m: Mat4): Quat {
    const d = m.data
    const m00 = d[0] ?? 0, m10 = d[1] ?? 0, m20 = d[2] ?? 0
    const m01 = d[4] ?? 0, m11 = d[5] ?? 0, m21 = d[6] ?? 0
    const m02 = d[8] ?? 0, m12 = d[9] ?? 0, m22 = d[10] ?? 0
    const trace = m00 + m11 + m22
    if (trace > 0) {
      const s = 0.5 / Math.sqrt(trace + 1)
      return new Quat(
        (m21 - m12) * s,
        (m02 - m20) * s,
        (m10 - m01) * s,
        0.25 / s
      )
    } else if (m00 > m11 && m00 > m22) {
      const s = 2 * Math.sqrt(1 + m00 - m11 - m22)
      return new Quat(
        0.25 * s,
        (m01 + m10) / s,
        (m02 + m20) / s,
        (m21 - m12) / s
      )
    } else if (m11 > m22) {
      const s = 2 * Math.sqrt(1 + m11 - m00 - m22)
      return new Quat(
        (m01 + m10) / s,
        0.25 * s,
        (m12 + m21) / s,
        (m02 - m20) / s
      )
    } else {
      const s = 2 * Math.sqrt(1 + m22 - m00 - m11)
      return new Quat(
        (m02 + m20) / s,
        (m12 + m21) / s,
        0.25 * s,
        (m10 - m01) / s
      )
    }
  }

  /** Returns the Hamilton product this × other. */
  mul(other: Quat): Quat {
    const { x: ax, y: ay, z: az, w: aw } = this
    const { x: bx, y: by, z: bz, w: bw } = other
    return new Quat(
      aw * bx + ax * bw + ay * bz - az * by,
      aw * by - ax * bz + ay * bw + az * bx,
      aw * bz + ax * by - ay * bx + az * bw,
      aw * bw - ax * bx - ay * by - az * bz
    )
  }

  /** Returns a new quaternion scaled to unit length. */
  normalize(): Quat {
    const len = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w)
    if (len === 0) return Quat.identity()
    return new Quat(this.x / len, this.y / len, this.z / len, this.w / len)
  }

  /** Returns the conjugate: (-x, -y, -z, w). Equal to the inverse for unit quaternions. */
  conjugate(): Quat {
    return new Quat(-this.x, -this.y, -this.z, this.w)
  }

  /** Returns the inverse: conjugate divided by squared length. */
  invert(): Quat {
    const lenSq = this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w
    if (lenSq === 0) return Quat.identity()
    return new Quat(-this.x / lenSq, -this.y / lenSq, -this.z / lenSq, this.w / lenSq)
  }

  /** Returns the dot product of this and `other`. */
  dot(other: Quat): number {
    return this.x * other.x + this.y * other.y + this.z * other.z + this.w * other.w
  }

  /**
   * Spherically interpolates between this and `other` by `t` (0–1).
   * Always takes the shortest arc.
   *
   * @example
   * const mid = qA.slerp(qB, 0.5)
   */
  slerp(other: Quat, t: number): Quat {
    let d = this.dot(other)
    // Ensure shortest path: flip other if dot < 0
    let bx = other.x, by = other.y, bz = other.z, bw = other.w
    if (d < 0) {
      bx = -bx; by = -by; bz = -bz; bw = -bw
      d = -d
    }
    // If very close, fall back to normalised lerp
    if (d > 0.9995) {
      return new Quat(
        this.x + (bx - this.x) * t,
        this.y + (by - this.y) * t,
        this.z + (bz - this.z) * t,
        this.w + (bw - this.w) * t
      ).normalize()
    }
    const theta0 = Math.acos(d)
    const theta = theta0 * t
    const sinTheta0 = Math.sin(theta0)
    const s0 = Math.cos(theta) - d * Math.sin(theta) / sinTheta0
    const s1 = Math.sin(theta) / sinTheta0
    return new Quat(
      this.x * s0 + bx * s1,
      this.y * s0 + by * s1,
      this.z * s0 + bz * s1,
      this.w * s0 + bw * s1
    )
  }

  /**
   * Rotates a Vec3 by this quaternion.
   * Uses the sandwich product: q * (v,0) * q⁻¹.
   *
   * @example
   * const up = Quat.fromAxisAngle(vec3(0, 0, 1), Math.PI / 2).rotateVec3(vec3(1, 0, 0))
   * // up ≈ (0, 1, 0)
   */
  rotateVec3(v: Vec3): Vec3 {
    // Optimised formula: t = 2 * cross(q.xyz, v); result = v + q.w * t + cross(q.xyz, t)
    const qx = this.x, qy = this.y, qz = this.z, qw = this.w
    const tx = 2 * (qy * v.z - qz * v.y)
    const ty = 2 * (qz * v.x - qx * v.z)
    const tz = 2 * (qx * v.y - qy * v.x)
    return new Vec3Class(
      v.x + qw * tx + qy * tz - qz * ty,
      v.y + qw * ty + qz * tx - qx * tz,
      v.z + qw * tz + qx * ty - qy * tx
    )
  }

  /**
   * Converts this quaternion to a column-major rotation Mat4.
   *
   * @example
   * const model = q.toMat4()
   * updateBuffer(device, modelBuffer, model.toFloat32Array())
   */
  toMat4(): Mat4 {
    const { x, y, z, w } = this
    const x2 = x + x, y2 = y + y, z2 = z + z
    const xx = x * x2, xy = x * y2, xz = x * z2
    const yy = y * y2, yz = y * z2, zz = z * z2
    const wx = w * x2, wy = w * y2, wz = w * z2
    const d = new Float32Array(16)
    d[0] = 1 - (yy + zz)
    d[1] = xy + wz
    d[2] = xz - wy
    d[3] = 0
    d[4] = xy - wz
    d[5] = 1 - (xx + zz)
    d[6] = yz + wx
    d[7] = 0
    d[8] = xz + wy
    d[9] = yz - wx
    d[10] = 1 - (xx + yy)
    d[11] = 0
    d[12] = 0
    d[13] = 0
    d[14] = 0
    d[15] = 1
    return new Mat4(d)
  }

  /**
   * Converts this quaternion to Euler angles (pitch, yaw, roll) in radians.
   * Uses YXZ decomposition to match `SceneNode.rotation` convention.
   *
   * Note: Euler representations are not unique and suffer from gimbal lock.
   * Prefer `toMat4()` directly when writing to a shader uniform.
   *
   * @example
   * const euler = q.toEuler() // Vec3(pitch, yaw, roll)
   * node.rotation = euler
   */
  toEuler(): Vec3 {
    const { x, y, z, w } = this
    // Rotation matrix elements (from standard quaternion → matrix formula):
    // R[1][2] = 2(yz - wx)  →  sin(pitch) = -R[1][2]
    // R[0][2] = 2(xz + wy)  →  sin(yaw) component
    // R[2][2] = 1-2(x²+y²)  →  cos(yaw) component
    // R[1][0] = 2(xy + wz)  →  sin(roll) component
    // R[1][1] = 1-2(x²+z²)  →  cos(roll) component
    const r12 = 2 * (y * z - w * x) // R[1][2]
    const pitch = Math.asin(Math.min(Math.max(-r12, -1), 1))

    let yaw: number
    let roll: number
    if (Math.abs(r12) < 0.9999) {
      const r02 = 2 * (x * z + w * y) // R[0][2]
      const r22 = 1 - 2 * (x * x + y * y) // R[2][2]
      const r10 = 2 * (x * y + w * z) // R[1][0]
      const r11 = 1 - 2 * (x * x + z * z) // R[1][1]
      yaw = Math.atan2(r02, r22)
      roll = Math.atan2(r10, r11)
    } else {
      // Gimbal lock: pitch ≈ ±90°, roll absorbed into yaw
      const r01 = 2 * (x * y - w * z) // R[0][1]
      const r00 = 1 - 2 * (y * y + z * z) // R[0][0]
      yaw = Math.atan2(-r01, r00)
      roll = 0
    }

    return new Vec3Class(pitch, yaw, roll)
  }

  /** Returns a [x, y, z, w] Float32Array for GPU upload. */
  toFloat32Array(): Float32Array {
    return new Float32Array([this.x, this.y, this.z, this.w])
  }

  /** Returns a copy of this Quat. */
  clone(): Quat {
    return new Quat(this.x, this.y, this.z, this.w)
  }

  toString(): string {
    return `Quat(${String(this.x)}, ${String(this.y)}, ${String(this.z)}, ${String(this.w)})`
  }
}

/**
 * Constructs a Quat.
 *
 * @example
 * const q = quat(0, 0, 0, 1) // identity
 */
export function quat(x: number, y: number, z: number, w: number): Quat {
  return new Quat(x, y, z, w)
}

/** Identity quaternion (no rotation). */
export const QUAT_IDENTITY: Readonly<Quat> = Object.freeze(new Quat(0, 0, 0, 1))

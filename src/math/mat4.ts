/**
 * Column-major 4x4 matrix for 3D transforms.
 *
 * Stored as a Float32Array of 16 values, column-major (matching WebGPU/WGSL convention).
 * Index layout: [m00, m10, m20, m30, m01, m11, m21, m31, m02, m12, m22, m32, m03, m13, m23, m33]
 *
 * @example
 * const model = Mat4.translation(vec3(1, 0, 0))
 *   .mul(Mat4.rotationY(Math.PI / 4))
 * const gpu = model.toFloat32Array() // ready for uniform upload
 */

import type { Vec3 } from './vec3.js'

export class Mat4 {
  /** Internal storage: 16 floats, column-major. */
  readonly data: Float32Array

  constructor(data?: Float32Array) {
    this.data = data ?? new Float32Array(16)
  }

  /** Returns the identity matrix. */
  static identity(): Mat4 {
    const m = new Mat4()
    m.data[0] = 1
    m.data[5] = 1
    m.data[10] = 1
    m.data[15] = 1
    return m
  }

  /**
   * Returns a translation matrix.
   *
   * @example
   * const t = Mat4.translation(vec3(10, 0, 0))
   */
  static translation(v: Vec3): Mat4 {
    const m = Mat4.identity()
    m.data[12] = v.x
    m.data[13] = v.y
    m.data[14] = v.z
    return m
  }

  /**
   * Returns a uniform scale matrix.
   *
   * @example
   * const s = Mat4.scale(vec3(2, 2, 2))
   */
  static scale(v: Vec3): Mat4 {
    const m = Mat4.identity()
    m.data[0] = v.x
    m.data[5] = v.y
    m.data[10] = v.z
    return m
  }

  /**
   * Returns a rotation matrix around the X axis.
   * @param radians - Angle in radians.
   */
  static rotationX(radians: number): Mat4 {
    const m = Mat4.identity()
    const c = Math.cos(radians)
    const s = Math.sin(radians)
    m.data[5] = c
    m.data[6] = s
    m.data[9] = -s
    m.data[10] = c
    return m
  }

  /**
   * Returns a rotation matrix around the Y axis.
   * @param radians - Angle in radians.
   */
  static rotationY(radians: number): Mat4 {
    const m = Mat4.identity()
    const c = Math.cos(radians)
    const s = Math.sin(radians)
    m.data[0] = c
    m.data[2] = -s
    m.data[8] = s
    m.data[10] = c
    return m
  }

  /**
   * Returns a rotation matrix around the Z axis.
   * @param radians - Angle in radians.
   */
  static rotationZ(radians: number): Mat4 {
    const m = Mat4.identity()
    const c = Math.cos(radians)
    const s = Math.sin(radians)
    m.data[0] = c
    m.data[1] = s
    m.data[4] = -s
    m.data[5] = c
    return m
  }

  /**
   * Returns a perspective projection matrix.
   *
   * @param fovY - Vertical field of view in radians.
   * @param aspect - Viewport width / height.
   * @param near - Near clip plane distance (positive).
   * @param far - Far clip plane distance (positive).
   *
   * @example
   * const proj = Mat4.perspective(Math.PI / 3, canvas.width / canvas.height, 0.1, 1000)
   */
  static perspective(fovY: number, aspect: number, near: number, far: number): Mat4 {
    const m = new Mat4()
    const f = 1.0 / Math.tan(fovY / 2)
    m.data[0] = f / aspect
    m.data[5] = f
    m.data[10] = far / (near - far)
    m.data[11] = -1
    m.data[14] = (near * far) / (near - far)
    return m
  }

  /**
   * Returns an orthographic projection matrix.
   *
   * @param left - Left clip plane.
   * @param right - Right clip plane.
   * @param bottom - Bottom clip plane.
   * @param top - Top clip plane.
   * @param near - Near clip plane.
   * @param far - Far clip plane.
   */
  static orthographic(
    left: number,
    right: number,
    bottom: number,
    top: number,
    near: number,
    far: number
  ): Mat4 {
    const m = new Mat4()
    m.data[0] = 2 / (right - left)
    m.data[5] = 2 / (top - bottom)
    m.data[10] = -2 / (far - near)
    m.data[12] = -(right + left) / (right - left)
    m.data[13] = -(top + bottom) / (top - bottom)
    m.data[14] = -(far + near) / (far - near)
    m.data[15] = 1
    return m
  }

  /**
   * Returns a lookAt view matrix.
   *
   * @param eye - Camera position.
   * @param center - Target to look at.
   * @param up - Up vector (usually VEC3_UP).
   *
   * @example
   * const view = Mat4.lookAt(vec3(0, 0, 5), VEC3_ZERO, VEC3_UP)
   */
  static lookAt(eye: Vec3, center: Vec3, up: Vec3): Mat4 {
    const f = center.sub(eye).normalize()
    const r = f.cross(up).normalize()
    const u = r.cross(f)
    const m = Mat4.identity()
    m.data[0] = r.x
    m.data[4] = r.y
    m.data[8] = r.z
    m.data[1] = u.x
    m.data[5] = u.y
    m.data[9] = u.z
    m.data[2] = -f.x
    m.data[6] = -f.y
    m.data[10] = -f.z
    m.data[12] = -r.dot(eye)
    m.data[13] = -u.dot(eye)
    m.data[14] = f.dot(eye)
    return m
  }

  /**
   * Returns the matrix product this × other.
   * Applies `other`'s transform first, then this (right-to-left composition).
   */
  mul(other: Mat4): Mat4 {
    const a = this.data
    const b = other.data
    const out = new Float32Array(16)
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        let sum = 0
        for (let k = 0; k < 4; k++) {
          sum += (a[row + k * 4] ?? 0) * (b[k + col * 4] ?? 0)
        }
        out[row + col * 4] = sum
      }
    }
    return new Mat4(out)
  }

  /** Returns the transposed matrix. */
  transpose(): Mat4 {
    const d = this.data
    const out = new Float32Array(16)
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        out[i * 4 + j] = d[j * 4 + i] ?? 0
      }
    }
    return new Mat4(out)
  }

  /** Returns the underlying Float32Array. Ready for WebGPU uniform upload. */
  toFloat32Array(): Float32Array {
    return this.data
  }

  /** Returns a copy of this Mat4. */
  clone(): Mat4 {
    return new Mat4(new Float32Array(this.data))
  }
}

import { describe, it, expect } from 'vitest'
import { Quat, quat, QUAT_IDENTITY } from './quat.js'
import { vec3, VEC3_UP, VEC3_RIGHT, VEC3_FORWARD } from './vec3.js'
import { Mat4 } from './mat4.js'
import { approxEqual } from './utils.js'

/** Helper: checks all four components of a Quat are approximately equal. */
function quatApproxEqual(a: Quat, b: Quat, eps = 1e-5): boolean {
  return (
    Math.abs(a.x - b.x) < eps &&
    Math.abs(a.y - b.y) < eps &&
    Math.abs(a.z - b.z) < eps &&
    Math.abs(a.w - b.w) < eps
  )
}

describe('Quat — identity', () => {
  it('factory produces (0,0,0,1)', () => {
    const q = Quat.identity()
    expect(q.x).toBe(0)
    expect(q.y).toBe(0)
    expect(q.z).toBe(0)
    expect(q.w).toBe(1)
  })

  it('QUAT_IDENTITY is frozen', () => {
    expect(Object.isFrozen(QUAT_IDENTITY)).toBe(true)
  })

  it('rotateVec3 with identity is a no-op', () => {
    const v = vec3(3, 1, 4)
    const r = Quat.identity().rotateVec3(v)
    expect(approxEqual(r.x, v.x)).toBe(true)
    expect(approxEqual(r.y, v.y)).toBe(true)
    expect(approxEqual(r.z, v.z)).toBe(true)
  })
})

describe('Quat — fromAxisAngle', () => {
  it('90° around Y rotates +X to -Z', () => {
    const q = Quat.fromAxisAngle(VEC3_UP, Math.PI / 2)
    const r = q.rotateVec3(VEC3_RIGHT)
    expect(approxEqual(r.x, 0)).toBe(true)
    expect(approxEqual(r.y, 0)).toBe(true)
    expect(approxEqual(r.z, -1)).toBe(true)
  })

  it('180° around Y maps +X to -X', () => {
    const q = Quat.fromAxisAngle(VEC3_UP, Math.PI)
    const r = q.rotateVec3(VEC3_RIGHT)
    expect(approxEqual(r.x, -1)).toBe(true)
    expect(approxEqual(r.y, 0)).toBe(true)
    expect(approxEqual(r.z, 0)).toBe(true)
  })

  it('0° rotation is identity', () => {
    const q = Quat.fromAxisAngle(VEC3_UP, 0)
    expect(approxEqual(q.w, 1)).toBe(true)
    expect(approxEqual(q.x, 0)).toBe(true)
  })
})

describe('Quat — fromEuler / toEuler round-trip', () => {
  it('round-trips (0.3, 0.5, 0.1)', () => {
    const pitch = 0.3, yaw = 0.5, roll = 0.1
    const q = Quat.fromEuler(pitch, yaw, roll)
    const euler = q.toEuler()
    expect(approxEqual(euler.x, pitch, 1e-5)).toBe(true)
    expect(approxEqual(euler.y, yaw, 1e-5)).toBe(true)
    expect(approxEqual(euler.z, roll, 1e-5)).toBe(true)
  })

  it('pure yaw', () => {
    const q = Quat.fromEuler(0, Math.PI / 4, 0)
    const euler = q.toEuler()
    expect(approxEqual(euler.x, 0)).toBe(true)
    expect(approxEqual(euler.y, Math.PI / 4)).toBe(true)
    expect(approxEqual(euler.z, 0)).toBe(true)
  })
})

describe('Quat — mul', () => {
  it('q * identity == q', () => {
    const q = Quat.fromAxisAngle(VEC3_FORWARD, 1.2)
    const r = q.mul(Quat.identity())
    expect(quatApproxEqual(q, r)).toBe(true)
  })

  it('chained 90° Y rotations produce 180°', () => {
    const q = Quat.fromAxisAngle(VEC3_UP, Math.PI / 2)
    const q180 = q.mul(q)
    const r = q180.rotateVec3(VEC3_RIGHT)
    expect(approxEqual(r.x, -1)).toBe(true)
    expect(approxEqual(r.y, 0)).toBe(true)
    expect(approxEqual(r.z, 0)).toBe(true)
  })
})

describe('Quat — normalize', () => {
  it('produces unit quaternion', () => {
    const q = new Quat(1, 2, 3, 4).normalize()
    const len = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w)
    expect(approxEqual(len, 1)).toBe(true)
  })

  it('zero quaternion returns identity', () => {
    const q = new Quat(0, 0, 0, 0).normalize()
    expect(q.w).toBe(1)
  })
})

describe('Quat — conjugate / invert', () => {
  it('q * conjugate(q) ≈ identity for unit q', () => {
    const q = Quat.fromAxisAngle(VEC3_UP, 0.7).normalize()
    const r = q.mul(q.conjugate()).normalize()
    expect(approxEqual(r.w, 1)).toBe(true)
    expect(approxEqual(r.x, 0)).toBe(true)
  })
})

describe('Quat — slerp', () => {
  it('t=0 returns this', () => {
    const a = Quat.fromAxisAngle(VEC3_UP, 0)
    const b = Quat.fromAxisAngle(VEC3_UP, Math.PI / 2)
    const r = a.slerp(b, 0).normalize()
    expect(quatApproxEqual(r, a.normalize())).toBe(true)
  })

  it('t=1 returns other', () => {
    const a = Quat.fromAxisAngle(VEC3_UP, 0)
    const b = Quat.fromAxisAngle(VEC3_UP, Math.PI / 2)
    const r = a.slerp(b, 1).normalize()
    expect(quatApproxEqual(r, b.normalize())).toBe(true)
  })

  it('t=0.5 is halfway rotation', () => {
    const a = Quat.fromAxisAngle(VEC3_UP, 0)
    const b = Quat.fromAxisAngle(VEC3_UP, Math.PI / 2)
    const mid = a.slerp(b, 0.5)
    const r = mid.rotateVec3(VEC3_RIGHT)
    // 45° around Y: +X rotated to (cos45, 0, -sin45)
    expect(approxEqual(r.x, Math.cos(Math.PI / 4))).toBe(true)
    expect(approxEqual(r.z, -Math.sin(Math.PI / 4))).toBe(true)
  })

  it('takes shortest path (handles dot < 0)', () => {
    const a = Quat.identity()
    const b = new Quat(0, 0, 0, -1) // same rotation as identity but negated
    const r = a.slerp(b, 0.5).normalize()
    expect(approxEqual(Math.abs(r.w), 1)).toBe(true)
  })
})

describe('Quat — toMat4', () => {
  it('identity quat → identity matrix', () => {
    const m = Quat.identity().toMat4()
    const id = Mat4.identity()
    for (let i = 0; i < 16; i++) {
      expect(approxEqual(m.data[i] ?? 0, id.data[i] ?? 0)).toBe(true)
    }
  })

  it('90° Y rotation matches Mat4.rotationY(PI/2)', () => {
    const q = Quat.fromAxisAngle(VEC3_UP, Math.PI / 2)
    const qMat = q.toMat4()
    const mMat = Mat4.rotationY(Math.PI / 2)
    for (let i = 0; i < 16; i++) {
      expect(approxEqual(qMat.data[i] ?? 0, mMat.data[i] ?? 0)).toBe(true)
    }
  })
})

describe('Quat — fromMat4', () => {
  it('round-trips identity', () => {
    const q = Quat.fromMat4(Mat4.identity())
    expect(quatApproxEqual(q, Quat.identity())).toBe(true)
  })

  it('round-trips 90° Y rotation', () => {
    const original = Quat.fromAxisAngle(VEC3_UP, Math.PI / 2)
    const mat = original.toMat4()
    const recovered = Quat.fromMat4(mat).normalize()
    // May be negated — check both forms
    const pos = quatApproxEqual(recovered, original)
    const neg = quatApproxEqual(recovered, new Quat(-original.x, -original.y, -original.z, -original.w))
    expect(pos || neg).toBe(true)
  })
})

describe('Quat — toFloat32Array / clone', () => {
  it('toFloat32Array returns [x,y,z,w]', () => {
    const q = quat(1, 2, 3, 4)
    const arr = q.toFloat32Array()
    expect(arr).toBeInstanceOf(Float32Array)
    expect(arr.length).toBe(4)
    expect(arr[0]).toBe(1)
    expect(arr[3]).toBe(4)
  })

  it('clone produces equal but distinct instance', () => {
    const q = quat(1, 2, 3, 4)
    const c = q.clone()
    expect(c.x).toBe(q.x)
    expect(c.w).toBe(q.w)
    expect(c).not.toBe(q)
  })
})

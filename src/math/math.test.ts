import { describe, it, expect } from 'vitest'
import { vec2, VEC2_ZERO } from './vec2.js'
import { vec3, VEC3_UP, VEC3_FORWARD } from './vec3.js'
import { vec4 } from './vec4.js'
import { Mat4 } from './mat4.js'
import { color, Color as ColorClass } from './color.js'
import { clamp, lerp, smoothstep, approxEqual, degToRad } from './utils.js'

describe('Vec2', () => {
  it('computes length', () => {
    expect(vec2(3, 4).length()).toBe(5)
  })
  it('normalizes', () => {
    const n = vec2(3, 4).normalize()
    expect(approxEqual(n.length(), 1)).toBe(true)
  })
  it('adds', () => {
    const r = vec2(1, 2).add(vec2(3, 4))
    expect(r.x).toBe(4)
    expect(r.y).toBe(6)
  })
  it('VEC2_ZERO is frozen', () => {
    expect(Object.isFrozen(VEC2_ZERO)).toBe(true)
  })
})

describe('Vec3', () => {
  it('cross product of UP and FORWARD is RIGHT (+X)', () => {
    const cross = VEC3_UP.cross(VEC3_FORWARD)
    expect(approxEqual(cross.x, 1)).toBe(true)
    expect(approxEqual(cross.y, 0)).toBe(true)
    expect(approxEqual(cross.z, 0)).toBe(true)
  })
  it('dot product', () => {
    expect(vec3(1, 0, 0).dot(vec3(1, 0, 0))).toBe(1)
    expect(vec3(1, 0, 0).dot(vec3(0, 1, 0))).toBe(0)
  })
  it('lerp', () => {
    const r = vec3(0, 0, 0).lerp(vec3(10, 10, 10), 0.5)
    expect(r.x).toBe(5)
  })
  it('toFloat32Array', () => {
    const arr = vec3(1, 2, 3).toFloat32Array()
    expect(arr).toBeInstanceOf(Float32Array)
    expect(arr.length).toBe(3)
  })
})

describe('Vec4', () => {
  it('scales', () => {
    const v = vec4(1, 2, 3, 4).scale(2)
    expect(v.x).toBe(2)
    expect(v.w).toBe(8)
  })
})

describe('Mat4', () => {
  it('identity mul identity is identity', () => {
    const id = Mat4.identity()
    const result = id.mul(id)
    expect(approxEqual(result.data[0] ?? 0, 1)).toBe(true)
    expect(approxEqual(result.data[5] ?? 0, 1)).toBe(true)
    expect(approxEqual(result.data[10] ?? 0, 1)).toBe(true)
    expect(approxEqual(result.data[15] ?? 0, 1)).toBe(true)
    expect(approxEqual(result.data[1] ?? 0, 0)).toBe(true)
  })
  it('translation sets correct matrix cells', () => {
    const t = Mat4.translation(vec3(5, 6, 7))
    expect(t.data[12]).toBe(5)
    expect(t.data[13]).toBe(6)
    expect(t.data[14]).toBe(7)
  })
  it('toFloat32Array returns Float32Array of length 16', () => {
    const arr = Mat4.identity().toFloat32Array()
    expect(arr).toBeInstanceOf(Float32Array)
    expect(arr.length).toBe(16)
  })
})

describe('Color', () => {
  it('fromHex parses 6-char hex', () => {
    const c = ColorClass.fromHex('#ff0000')
    expect(approxEqual(c.r, 1)).toBe(true)
    expect(approxEqual(c.g, 0)).toBe(true)
    expect(approxEqual(c.b, 0)).toBe(true)
  })
  it('lerp interpolates', () => {
    const white = color(1, 1, 1)
    const black = color(0, 0, 0)
    const mid = white.lerp(black, 0.5)
    expect(approxEqual(mid.r, 0.5)).toBe(true)
  })
  it('withAlpha returns new Color', () => {
    const c = color(1, 0, 0).withAlpha(0.5)
    expect(c.a).toBe(0.5)
    expect(c.r).toBe(1)
  })
})

describe('Math utils', () => {
  it('clamp', () => {
    expect(clamp(5, 0, 3)).toBe(3)
    expect(clamp(-1, 0, 1)).toBe(0)
    expect(clamp(0.5, 0, 1)).toBe(0.5)
  })
  it('lerp', () => {
    expect(lerp(0, 10, 0.5)).toBe(5)
    expect(lerp(0, 10, 0)).toBe(0)
    expect(lerp(0, 10, 1)).toBe(10)
  })
  it('smoothstep', () => {
    expect(smoothstep(0, 1, 0)).toBe(0)
    expect(smoothstep(0, 1, 1)).toBe(1)
    expect(approxEqual(smoothstep(0, 1, 0.5), 0.5)).toBe(true)
  })
  it('degToRad', () => {
    expect(approxEqual(degToRad(180), Math.PI)).toBe(true)
  })
})

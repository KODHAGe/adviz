/**
 * @module adviz/math
 *
 * Zero-dependency math primitives for WebGPU creative coding.
 * All types produce Float32Arrays for direct GPU buffer upload.
 *
 * @example
 * import { vec3, Mat4, Color, lerp } from 'adviz/math'
 */

export { Vec2, vec2, VEC2_ZERO, VEC2_ONE, VEC2_RIGHT, VEC2_UP } from './vec2.js'
export { Vec3, vec3, VEC3_ZERO, VEC3_ONE, VEC3_RIGHT, VEC3_UP, VEC3_FORWARD } from './vec3.js'
export {
  Vec4,
  vec4,
  VEC4_ZERO,
  VEC4_IDENTITY,
} from './vec4.js'
export { Mat4 } from './mat4.js'
export {
  Color,
  color,
  COLOR_WHITE,
  COLOR_BLACK,
  COLOR_TRANSPARENT,
  COLOR_RED,
  COLOR_GREEN,
  COLOR_BLUE,
} from './color.js'
export {
  PI,
  TWO_PI,
  HALF_PI,
  degToRad,
  radToDeg,
  clamp,
  lerp,
  remap,
  fract,
  smoothstep,
  approxEqual,
} from './utils.js'

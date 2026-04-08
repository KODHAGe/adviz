/**
 * @module adviz/physics
 *
 * CPU and GPU physics for 2D and 3D simulations — no external dependencies.
 *
 * - `createWorld2D` / `createWorld3D` — integration worlds
 * - `createBody2D` / `createBody3D` — rigid bodies
 * - `applyForce2D/3D`, `applyImpulse2D/3D`, `applyTorque3D` — force application
 * - `syncBody2DToNode` / `syncBody3DToNode` — bridge to `SceneNode`
 * - `createGPUParticleSystem2D` / `createGPUParticleSystem3D` — GPU compute particle systems
 *
 * @example
 * import { createWorld3D, createBody3D, applyTorque3D, syncBody3DToNode } from 'adviz/physics'
 */

export type {
  Body2D,
  Body2DOptions,
  World2D,
  World2DOptions,
  Body3D,
  Body3DOptions,
  World3D,
  World3DOptions,
} from './types.js'

export {
  createBody2D,
  applyForce2D,
  applyImpulse2D,
  syncBody2DToNode,
} from './body2d.js'

export { createWorld2D } from './world2d.js'

export {
  createBody3D,
  applyForce3D,
  applyTorque3D,
  applyImpulse3D,
  syncBody3DToNode,
} from './body3d.js'

export { createWorld3D } from './world3d.js'

export type {
  GPUParticleSystem2D,
  GPUParticleSystem3D,
  GpuParticleOptions2D,
  GpuParticleOptions3D,
} from './gpu/index.js'

export {
  createGPUParticleSystem2D,
  createGPUParticleSystem3D,
} from './gpu/index.js'

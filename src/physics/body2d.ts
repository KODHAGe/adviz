import type { Vec2 } from '../math/vec2.js'
import { vec2 } from '../math/vec2.js'
import type { Body2D, Body2DOptions } from './types.js'
import type { SceneNode } from '../scene/index.js'
import { vec3 } from '../math/vec3.js'

/**
 * Internal per-body force accumulator.
 * Using WeakMap keeps the public Body2D interface clean.
 */
const forceAccumulators = new WeakMap<Body2D, Vec2>()

/**
 * Creates a 2D physics body.
 *
 * @example
 * const ball = createBody2D({ position: vec2(0, 5), mass: 2 })
 * applyForce2D(ball, vec2(10, 0)) // push right
 */
export function createBody2D(options?: Body2DOptions): Body2D {
  const mass = options?.mass ?? 1
  const isKinematic = options?.isKinematic ?? false
  const inverseMass = isKinematic || mass === 0 ? 0 : 1 / mass

  let position = options?.position?.clone() ?? vec2(0, 0)
  let velocity = options?.velocity?.clone() ?? vec2(0, 0)

  const body: Body2D = {
    get position(): Vec2 { return position },
    set position(v: Vec2) { position = v },
    get velocity(): Vec2 { return velocity },
    set velocity(v: Vec2) { velocity = v },
    mass,
    inverseMass,
    damping: options?.damping ?? 1,
    isKinematic,
  }

  forceAccumulators.set(body, vec2(0, 0))
  return body
}

/**
 * Retrieves the current force accumulator for a body.
 * Intended for internal use by `World2D.step`.
 *
 * @internal
 */
export function getForce2D(body: Body2D): Vec2 {
  return forceAccumulators.get(body) ?? vec2(0, 0)
}

/**
 * Resets the force accumulator to zero after each integration step.
 *
 * @internal
 */
export function resetForce2D(body: Body2D): void {
  forceAccumulators.set(body, vec2(0, 0))
}

/**
 * Accumulates a force on a body. The force is applied during the next `world.step()`.
 * Forces are cleared after each step.
 *
 * @example
 * applyForce2D(body, vec2(0, -9.8 * body.mass)) // manual gravity
 */
export function applyForce2D(body: Body2D, force: Vec2): void {
  const current = forceAccumulators.get(body) ?? vec2(0, 0)
  forceAccumulators.set(body, current.add(force))
}

/**
 * Applies an instant velocity change (impulse = change in momentum / mass).
 * Useful for collisions and one-shot boosts.
 *
 * @example
 * applyImpulse2D(body, vec2(5, 0)) // kick right
 */
export function applyImpulse2D(body: Body2D, impulse: Vec2): void {
  if (body.isKinematic) return
  body.velocity = body.velocity.add(impulse.scale(body.inverseMass))
}

/**
 * Copies the body's position into a scene node.
 * The z-component is set to 0 so the node rests in the XY plane.
 *
 * @example
 * syncBody2DToNode(ball, ballNode)
 * updateBuffer(device, modelBuffer, ballNode.worldMatrix().toFloat32Array())
 */
export function syncBody2DToNode(body: Body2D, node: SceneNode): void {
  node.position = vec3(body.position.x, body.position.y, 0)
}

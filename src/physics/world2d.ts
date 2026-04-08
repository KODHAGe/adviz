import { vec2 } from '../math/vec2.js'
import type { Body2D, World2D, World2DOptions } from './types.js'
import { getForce2D, resetForce2D } from './body2d.js'

/**
 * Creates a 2D physics world.
 *
 * @example
 * const world = createWorld2D({ gravity: vec2(0, -9.8) })
 * world.addBody(ball)
 * // in render loop:
 * world.step(info.delta / 1000)
 * syncBody2DToNode(ball, ballNode)
 */
export function createWorld2D(options?: World2DOptions): World2D {
  const bodies: Body2D[] = []
  let gravity = options?.gravity?.clone() ?? vec2(0, -9.8)

  const world: World2D = {
    get gravity() { return gravity },
    set gravity(v) { gravity = v },

    get bodies(): readonly Body2D[] { return bodies },

    addBody(body: Body2D): void {
      bodies.push(body)
    },

    removeBody(body: Body2D): void {
      const idx = bodies.indexOf(body)
      if (idx !== -1) bodies.splice(idx, 1)
    },

    step(dt: number): void {
      for (const body of bodies) {
        if (body.isKinematic) {
          resetForce2D(body)
          continue
        }

        const force = getForce2D(body)

        // Semi-implicit Euler:
        // 1. accumulate acceleration from forces + gravity
        const accel = force.scale(body.inverseMass).add(gravity)
        // 2. integrate velocity
        body.velocity = body.velocity.add(accel.scale(dt)).scale(body.damping)
        // 3. integrate position
        body.position = body.position.add(body.velocity.scale(dt))

        resetForce2D(body)
      }
    },
  }

  return world
}

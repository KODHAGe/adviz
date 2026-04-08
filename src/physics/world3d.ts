import { vec3 } from '../math/vec3.js'
import { Quat } from '../math/quat.js'
import type { Body3D, World3D, World3DOptions } from './types.js'
import { getForce3D, getTorque3D, resetAccumulators3D } from './body3d.js'

/**
 * Creates a 3D physics world with linear and angular integration.
 *
 * @example
 * const world = createWorld3D()
 * world.addBody(cube)
 * // in render loop:
 * world.step(info.delta / 1000)
 * syncBody3DToNode(cube, cubeNode)
 */
export function createWorld3D(options?: World3DOptions): World3D {
  const bodies: Body3D[] = []
  let gravity = options?.gravity?.clone() ?? vec3(0, -9.8, 0)

  const world: World3D = {
    get gravity() { return gravity },
    set gravity(v) { gravity = v },

    get bodies(): readonly Body3D[] { return bodies },

    addBody(body: Body3D): void {
      bodies.push(body)
    },

    removeBody(body: Body3D): void {
      const idx = bodies.indexOf(body)
      if (idx !== -1) bodies.splice(idx, 1)
    },

    step(dt: number): void {
      for (const body of bodies) {
        if (body.isKinematic) {
          resetAccumulators3D(body)
          continue
        }

        const force = getForce3D(body)
        const torque = getTorque3D(body)

        // ── Linear integration (semi-implicit Euler) ──────────────────────
        const accel = force.scale(body.inverseMass).add(gravity)
        body.velocity = body.velocity.add(accel.scale(dt)).scale(body.damping)
        body.position = body.position.add(body.velocity.scale(dt))

        // ── Angular integration ───────────────────────────────────────────
        // Angular acceleration = torque * inverseInertia
        const angularAccel = torque.scale(body.inverseInertia)
        body.angularVelocity = body.angularVelocity
          .add(angularAccel.scale(dt))
          .scale(body.angularDamping)

        // Integrate orientation via axis-angle:
        // angle turned this step = |omega| * dt
        const angle = body.angularVelocity.length() * dt
        if (angle > 1e-10) {
          const axis = body.angularVelocity.normalize()
          const deltaQ = Quat.fromAxisAngle(axis, angle)
          // Apply delta rotation (left-multiply keeps world-space convention)
          body.orientation = deltaQ.mul(body.orientation).normalize()
        }

        resetAccumulators3D(body)
      }
    },
  }

  return world
}

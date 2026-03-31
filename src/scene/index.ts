import type { Vec3 } from '../math/vec3.js'
import type { Mat4 } from '../math/mat4.js'
import { vec3, VEC3_ZERO, VEC3_ONE } from '../math/vec3.js'
import { Mat4 as Mat4Class } from '../math/mat4.js'

/**
 * A scene node with position, rotation (Euler angles), and scale.
 * Computes a world matrix for use in vertex shaders.
 *
 * @example
 * const node = createNode()
 * node.position = vec3(0, 1, 0)
 * node.rotation = vec3(0, Math.PI / 4, 0)
 * const modelMatrix = node.worldMatrix()
 */
export interface SceneNode {
  position: Vec3
  rotation: Vec3  // Euler angles in radians: (pitch, yaw, roll)
  scale: Vec3
  /** Computes the TRS world matrix. Allocates a new Mat4 each call. */
  worldMatrix(): Mat4
}

/**
 * Creates a scene node at the origin with identity transform.
 */
export function createNode(): SceneNode {
  let position = vec3(0, 0, 0)
  let rotation = vec3(0, 0, 0)
  let scale = VEC3_ONE.clone()

  return {
    get position(): Vec3 { return position },
    set position(v: Vec3) { position = v },
    get rotation(): Vec3 { return rotation },
    set rotation(v: Vec3) { rotation = v },
    get scale(): Vec3 { return scale },
    set scale(v: Vec3) { scale = v },
    worldMatrix(): Mat4 {
      const t = Mat4Class.translation(position)
      const rx = Mat4Class.rotationX(rotation.x)
      const ry = Mat4Class.rotationY(rotation.y)
      const rz = Mat4Class.rotationZ(rotation.z)
      const s = Mat4Class.scale(scale)
      return t.mul(ry).mul(rx).mul(rz).mul(s)
    },
  }
}

// Re-export for convenience
export { VEC3_ZERO, VEC3_ONE }

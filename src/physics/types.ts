import type { Vec2 } from '../math/vec2.js'
import type { Vec3 } from '../math/vec3.js'
import type { Quat } from '../math/quat.js'

// ─── 2D ──────────────────────────────────────────────────────────────────────

/** Options for creating a 2D physics body. */
export interface Body2DOptions {
  /** Initial position in world-space. Default: (0, 0). */
  readonly position?: Vec2
  /** Initial velocity. Default: (0, 0). */
  readonly velocity?: Vec2
  /** Mass in kg. Default: 1. Use `Infinity` for static bodies (sets `isKinematic`). */
  readonly mass?: number
  /** Velocity damping per step (0–1). 1 = no damping. Default: 1. */
  readonly damping?: number
  /** If true this body is not integrated by the world's step. Default: false. */
  readonly isKinematic?: boolean
}

/** A 2D rigid body with no rotational degrees of freedom. */
export interface Body2D {
  /** Current world-space position. */
  position: Vec2
  /** Current velocity in units per second. */
  velocity: Vec2
  /** Mass in kg. */
  readonly mass: number
  /** Reciprocal of mass. 0 for kinematic bodies. */
  readonly inverseMass: number
  /** Velocity damping factor applied each step (0–1). */
  readonly damping: number
  /** If true the world will not integrate this body. */
  readonly isKinematic: boolean
}

/** Options for creating a 2D physics world. */
export interface World2DOptions {
  /** Gravitational acceleration. Default: (0, -9.8). */
  readonly gravity?: Vec2
}

/** A 2D physics world that integrates bodies over time. */
export interface World2D {
  /** Gravitational acceleration applied to all non-kinematic bodies. */
  gravity: Vec2
  /** All bodies registered in this world. */
  readonly bodies: readonly Body2D[]
  /** Adds a body to the world. */
  addBody(body: Body2D): void
  /** Removes a body from the world. */
  removeBody(body: Body2D): void
  /**
   * Advances the simulation by `dt` seconds (semi-implicit Euler integration).
   * Call once per frame, passing `FrameInfo.delta / 1000`.
   */
  step(dt: number): void
}

// ─── 3D ──────────────────────────────────────────────────────────────────────

/** Options for creating a 3D physics body. */
export interface Body3DOptions {
  /** Initial position. Default: (0, 0, 0). */
  readonly position?: Vec3
  /** Initial linear velocity. Default: (0, 0, 0). */
  readonly velocity?: Vec3
  /** Initial orientation. Default: identity quaternion. */
  readonly orientation?: Quat
  /** Initial angular velocity in radians per second (world-space axis-angle vector). Default: (0, 0, 0). */
  readonly angularVelocity?: Vec3
  /** Mass in kg. Default: 1. */
  readonly mass?: number
  /**
   * Scalar moment of inertia (spherical approximation, kg·m²). Default: 1.
   * Used as a uniform inertia for all axes.
   */
  readonly inertiaTensor?: number
  /** Linear velocity damping per step (0–1). Default: 1. */
  readonly damping?: number
  /** Angular velocity damping per step (0–1). Default: 0.99. */
  readonly angularDamping?: number
  /** If true this body is not integrated by the world's step. Default: false. */
  readonly isKinematic?: boolean
}

/** A 3D rigid body with full angular dynamics (spherical inertia approximation). */
export interface Body3D {
  /** Current world-space position. */
  position: Vec3
  /** Current linear velocity in units per second. */
  velocity: Vec3
  /** Current orientation as a unit quaternion. */
  orientation: Quat
  /** Angular velocity in radians per second (world-space axis-angle vector). */
  angularVelocity: Vec3
  /** Mass in kg. */
  readonly mass: number
  /** Reciprocal of mass. 0 for kinematic bodies. */
  readonly inverseMass: number
  /**
   * Reciprocal of `inertiaTensor`. Used to convert torque to angular acceleration.
   * 0 for kinematic bodies.
   */
  readonly inverseInertia: number
  /** Linear velocity damping factor per step (0–1). */
  readonly damping: number
  /** Angular velocity damping factor per step (0–1). */
  readonly angularDamping: number
  /** If true the world will not integrate this body. */
  readonly isKinematic: boolean
}

/** Options for creating a 3D physics world. */
export interface World3DOptions {
  /** Gravitational acceleration. Default: (0, -9.8, 0). */
  readonly gravity?: Vec3
}

/** A 3D physics world with linear and angular integration. */
export interface World3D {
  /** Gravitational acceleration applied to all non-kinematic bodies. */
  gravity: Vec3
  /** All bodies registered in this world. */
  readonly bodies: readonly Body3D[]
  /** Adds a body to the world. */
  addBody(body: Body3D): void
  /** Removes a body from the world. */
  removeBody(body: Body3D): void
  /**
   * Advances the simulation by `dt` seconds (semi-implicit Euler integration).
   * Call once per frame, passing `FrameInfo.delta / 1000`.
   */
  step(dt: number): void
}

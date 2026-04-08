import { createStorageBuffer, createUniformBuffer, updateBuffer } from '../../renderer/buffers.js'
import { createShaderModule, wgsl, storageReadWriteLayoutEntry, uniformLayoutEntry, createBindGroup } from '../../shader/index.js'

// ─── Constants ───────────────────────────────────────────────────────────────

const WORKGROUP_SIZE = 64

// ─── 2D ──────────────────────────────────────────────────────────────────────

/** Options for a GPU-accelerated 2D particle system. */
export interface GpuParticleOptions2D {
  /** Gravitational acceleration. Default: (0, -9.8). */
  readonly gravity?: { x: number; y: number }
}

/**
 * A GPU-accelerated 2D particle system.
 *
 * `particleBuffer` stores `count` particles laid out as:
 * ```
 * struct Particle2D { position: vec2f, velocity: vec2f }  // 16 bytes
 * ```
 * Populate initial data with `updateBuffer(device, system.particleBuffer, data)` before the
 * first frame. The buffer can be bound read-only to any render pipeline (see example 02 pattern).
 */
export interface GPUParticleSystem2D {
  /** Total number of particles. */
  readonly count: number
  /** Storage buffer containing all particles. Bind read-only in vertex/fragment shaders. */
  readonly particleBuffer: GPUBuffer
  /** Uniform buffer containing per-step parameters. Do not write to this directly. */
  readonly paramsBuffer: GPUBuffer
  /**
   * Dispatches the compute pass to integrate particle positions.
   * Must be called inside an active `GPUComputePassEncoder`.
   *
   * @param pass - Active compute pass encoder.
   * @param dt   - Time step in seconds.
   */
  step(pass: GPUComputePassEncoder, dt: number): void
  /** Destroys all GPU resources owned by this system. */
  destroy(): void
}

const COMPUTE_SHADER_2D = wgsl`
  struct Particle2D {
    position : vec2f,
    velocity : vec2f,
  }

  struct Params2D {
    dt        : f32,
    gravity_x : f32,
    gravity_y : f32,
    _pad      : f32,
  }

  @group(0) @binding(0) var<storage, read_write> particles : array<Particle2D>;
  @group(0) @binding(1) var<uniform>             params    : Params2D;

  @compute @workgroup_size(${WORKGROUP_SIZE})
  fn cs_main(@builtin(global_invocation_id) id : vec3u) {
    let i = id.x;
    if (i >= arrayLength(&particles)) { return; }

    var p = particles[i];
    p.velocity += vec2f(params.gravity_x, params.gravity_y) * params.dt;
    p.position += p.velocity * params.dt;
    particles[i] = p;
  }
`

/**
 * Creates a GPU-accelerated 2D particle system.
 * Particles are stored as `struct Particle2D { position: vec2f, velocity: vec2f }` (16 bytes each).
 *
 * @param device  - The WebGPU device.
 * @param count   - Number of particles.
 * @param options - Optional configuration.
 *
 * @example
 * const ps = createGPUParticleSystem2D(device, 50_000)
 *
 * // Populate initial data
 * const data = new Float32Array(50_000 * 4)
 * // ... fill positions/velocities ...
 * updateBuffer(device, ps.particleBuffer, data)
 *
 * // In render loop, inside your command encoder:
 * const compute = encoder.beginComputePass()
 * ps.step(compute, info.delta / 1000)
 * compute.end()
 */
export function createGPUParticleSystem2D(
  device: GPUDevice,
  count: number,
  options?: GpuParticleOptions2D
): GPUParticleSystem2D {
  const gx = options?.gravity?.x ?? 0
  const gy = options?.gravity?.y ?? -9.8

  const particleBuffer = createStorageBuffer(device, count * 16, undefined, 'gpu-particles-2d')
  // Params: dt(f32) + gravity_x(f32) + gravity_y(f32) + _pad(f32) = 16 bytes
  const paramsBuffer = createUniformBuffer(device, 16, 'gpu-particles-2d-params')

  const shaderModule = createShaderModule(device, COMPUTE_SHADER_2D, 'gpu-particles-2d-cs')

  const bindGroupLayout = device.createBindGroupLayout({
    label: 'gpu-particles-2d-bgl',
    entries: [
      storageReadWriteLayoutEntry(0, GPUShaderStage.COMPUTE),
      uniformLayoutEntry(1, GPUShaderStage.COMPUTE),
    ],
  })

  const pipeline = device.createComputePipeline({
    label: 'gpu-particles-2d-pipeline',
    layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
    compute: { module: shaderModule, entryPoint: 'cs_main' },
  })

  const bindGroup = createBindGroup(
    device,
    bindGroupLayout,
    [particleBuffer, paramsBuffer],
    'gpu-particles-2d-bg'
  )

  const workgroups = Math.ceil(count / WORKGROUP_SIZE)

  return {
    count,
    particleBuffer,
    paramsBuffer,

    step(pass: GPUComputePassEncoder, dt: number): void {
      updateBuffer(device, paramsBuffer, new Float32Array([dt, gx, gy, 0]))
      pass.setPipeline(pipeline)
      pass.setBindGroup(0, bindGroup)
      pass.dispatchWorkgroups(workgroups)
    },

    destroy(): void {
      particleBuffer.destroy()
      paramsBuffer.destroy()
    },
  }
}

// ─── 3D ──────────────────────────────────────────────────────────────────────

/** Options for a GPU-accelerated 3D particle system. */
export interface GpuParticleOptions3D {
  /** Gravitational acceleration. Default: (0, -9.8, 0). */
  readonly gravity?: { x: number; y: number; z: number }
}

/**
 * A GPU-accelerated 3D particle system.
 *
 * `particleBuffer` stores `count` particles laid out as:
 * ```
 * struct Particle3D { position: vec4f, velocity: vec4f }  // 32 bytes
 * ```
 * The w-component of `position` can be used as a particle age or weight.
 * The w-component of `velocity` is padding (set to 0).
 */
export interface GPUParticleSystem3D {
  /** Total number of particles. */
  readonly count: number
  /** Storage buffer containing all particles. Bind read-only in vertex/fragment shaders. */
  readonly particleBuffer: GPUBuffer
  /** Uniform buffer containing per-step parameters. Do not write to this directly. */
  readonly paramsBuffer: GPUBuffer
  /**
   * Dispatches the compute pass to integrate particle positions.
   * Must be called inside an active `GPUComputePassEncoder`.
   *
   * @param pass - Active compute pass encoder.
   * @param dt   - Time step in seconds.
   */
  step(pass: GPUComputePassEncoder, dt: number): void
  /** Destroys all GPU resources owned by this system. */
  destroy(): void
}

const COMPUTE_SHADER_3D = wgsl`
  struct Particle3D {
    position : vec4f,  // .w = particle age (user-controlled)
    velocity : vec4f,  // .w = unused (padding)
  }

  struct Params3D {
    dt        : f32,
    gravity_x : f32,
    gravity_y : f32,
    gravity_z : f32,
  }

  @group(0) @binding(0) var<storage, read_write> particles : array<Particle3D>;
  @group(0) @binding(1) var<uniform>             params    : Params3D;

  @compute @workgroup_size(${WORKGROUP_SIZE})
  fn cs_main(@builtin(global_invocation_id) id : vec3u) {
    let i = id.x;
    if (i >= arrayLength(&particles)) { return; }

    var p = particles[i];
    let gravity = vec3f(params.gravity_x, params.gravity_y, params.gravity_z);
    p.velocity += vec4f(gravity * params.dt, 0.0);
    p.position += vec4f(p.velocity.xyz * params.dt, 0.0);
    particles[i] = p;
  }
`

/**
 * Creates a GPU-accelerated 3D particle system.
 * Particles are stored as `struct Particle3D { position: vec4f, velocity: vec4f }` (32 bytes each).
 * The w-component of `position` is available for per-particle data (e.g. age, size).
 *
 * @param device  - The WebGPU device.
 * @param count   - Number of particles.
 * @param options - Optional configuration.
 *
 * @example
 * const ps = createGPUParticleSystem3D(device, 100_000)
 *
 * // Populate initial data (position.xyz, position.w=age, velocity.xyz, velocity.w=0)
 * const data = new Float32Array(100_000 * 8)
 * updateBuffer(device, ps.particleBuffer, data)
 */
export function createGPUParticleSystem3D(
  device: GPUDevice,
  count: number,
  options?: GpuParticleOptions3D
): GPUParticleSystem3D {
  const gx = options?.gravity?.x ?? 0
  const gy = options?.gravity?.y ?? -9.8
  const gz = options?.gravity?.z ?? 0

  const particleBuffer = createStorageBuffer(device, count * 32, undefined, 'gpu-particles-3d')
  // Params: dt + gravity_x + gravity_y + gravity_z = 16 bytes
  const paramsBuffer = createUniformBuffer(device, 16, 'gpu-particles-3d-params')

  const shaderModule = createShaderModule(device, COMPUTE_SHADER_3D, 'gpu-particles-3d-cs')

  const bindGroupLayout = device.createBindGroupLayout({
    label: 'gpu-particles-3d-bgl',
    entries: [
      storageReadWriteLayoutEntry(0, GPUShaderStage.COMPUTE),
      uniformLayoutEntry(1, GPUShaderStage.COMPUTE),
    ],
  })

  const pipeline = device.createComputePipeline({
    label: 'gpu-particles-3d-pipeline',
    layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
    compute: { module: shaderModule, entryPoint: 'cs_main' },
  })

  const bindGroup = createBindGroup(
    device,
    bindGroupLayout,
    [particleBuffer, paramsBuffer],
    'gpu-particles-3d-bg'
  )

  const workgroups = Math.ceil(count / WORKGROUP_SIZE)

  return {
    count,
    particleBuffer,
    paramsBuffer,

    step(pass: GPUComputePassEncoder, dt: number): void {
      updateBuffer(device, paramsBuffer, new Float32Array([dt, gx, gy, gz]))
      pass.setPipeline(pipeline)
      pass.setBindGroup(0, bindGroup)
      pass.dispatchWorkgroups(workgroups)
    },

    destroy(): void {
      particleBuffer.destroy()
      paramsBuffer.destroy()
    },
  }
}

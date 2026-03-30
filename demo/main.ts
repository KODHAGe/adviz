/**
 * adviz frontend demo — interactive GPU particle field
 *
 * 100,000 particles simulated entirely on the GPU via a WebGPU compute shader.
 * Mouse position attracts particles; click inverts to repel.
 *
 * This file is the canonical "how to bootstrap an adviz app" reference.
 */

import { initDevice, createCanvas, createLoop } from '../src/core/index.js'
import {
  RenderPipelineBuilder,
  createRenderPassDescriptor,
  createStorageBuffer,
  createUniformBuffer,
  updateBuffer,
} from '../src/renderer/index.js'
import {
  createShaderModule,
  wgsl,
  storageReadWriteLayoutEntry,
  storageLayoutEntry,
  uniformLayoutEntry,
  createBindGroup,
} from '../src/shader/index.js'
import { createPointerTracker } from '../src/input/index.js'
import { COLOR_BLACK } from '../src/math/index.js'

// ─── Constants ───────────────────────────────────────────────────────────────

const PARTICLE_COUNT = 100_000
const WORKGROUP_SIZE = 64

// ─── Shaders ─────────────────────────────────────────────────────────────────

/**
 * Compute shader: updates particle positions and velocities.
 *
 * Uniforms layout (64 bytes, 16-byte aligned):
 *   offset  0: f32 deltaTime
 *   offset  4: f32 time
 *   offset  8: f32 mouseX   (NDC -1..1)
 *   offset 12: f32 mouseY   (NDC -1..1)
 *   offset 16: f32 attract  (1 = attract, -1 = repel)
 */
const COMPUTE_SHADER = wgsl`
  struct Particle {
    position : vec2f,
    velocity : vec2f,
  }

  struct Uniforms {
    deltaTime : f32,
    time      : f32,
    mouseX    : f32,
    mouseY    : f32,
    attract   : f32,
  }

  @group(0) @binding(0) var<storage, read_write> particles : array<Particle>;
  @group(0) @binding(1) var<uniform>             u         : Uniforms;

  @compute @workgroup_size(${WORKGROUP_SIZE})
  fn cs_main(@builtin(global_invocation_id) id: vec3u) {
    let i = id.x;
    if (i >= arrayLength(&particles)) { return; }

    var p = particles[i];

    // Mouse attractor / repulsor
    let mouse     = vec2f(u.mouseX, u.mouseY);
    let toMouse   = mouse - p.position;
    let dist      = length(toMouse) + 0.001;
    let influence = u.attract / (dist * dist * 600.0 + 1.0);
    p.velocity   += normalize(toMouse) * influence;

    // Slow swirling background field
    let angle     = atan2(p.position.y, p.position.x) + u.time * 0.12;
    let swirl     = vec2f(cos(angle), sin(angle)) * 0.0003;
    p.velocity   += swirl;

    // Damping keeps things stable
    p.velocity *= 0.97;

    p.position += p.velocity * u.deltaTime * 60.0;

    // Soft wrap at edges
    if (p.position.x >  1.1) { p.position.x = -1.1; }
    if (p.position.x < -1.1) { p.position.x =  1.1; }
    if (p.position.y >  1.1) { p.position.y = -1.1; }
    if (p.position.y < -1.1) { p.position.y =  1.1; }

    particles[i] = p;
  }
`

/**
 * Vertex shader: reads particle from storage buffer, maps speed to a color.
 */
const VERTEX_SHADER = wgsl`
  struct Particle {
    position : vec2f,
    velocity : vec2f,
  }

  @group(0) @binding(0) var<storage, read> particles: array<Particle>;

  struct VertexOutput {
    @builtin(position) position : vec4f,
    @location(0)       speed    : f32,
  }

  @vertex
  fn vs_main(@builtin(vertex_index) vi: u32) -> VertexOutput {
    let p     = particles[vi];
    let speed = length(p.velocity);
    return VertexOutput(vec4f(p.position, 0.0, 1.0), speed);
  }
`

/**
 * Fragment shader: maps speed to a deep-blue → cyan → white palette.
 */
const FRAGMENT_SHADER = wgsl`
  @fragment
  fn fs_main(@location(0) speed: f32) -> @location(0) vec4f {
    let t   = clamp(speed * 80.0, 0.0, 1.0);
    let low  = vec4f(0.02, 0.05, 0.18, 1.0); // deep navy
    let mid  = vec4f(0.0,  0.6,  1.0,  1.0); // bright cyan
    let high = vec4f(1.0,  1.0,  1.0,  1.0); // white

    if (t < 0.5) {
      return mix(low, mid, t * 2.0);
    }
    return mix(mid, high, (t - 0.5) * 2.0);
  }
`

// ─── Bootstrap ───────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const container = document.getElementById('app')
  if (!container) throw new Error('#app element not found')

  const { device } = await initDevice({ powerPreference: 'high-performance' })

  const canvas = createCanvas({ container, autoResize: true })

  const context = canvas.element.getContext('webgpu')
  if (!context) throw new Error('Could not get WebGPU canvas context.')

  const presentationFormat = navigator.gpu.getPreferredCanvasFormat()
  context.configure({ device, format: presentationFormat, alphaMode: 'premultiplied' })

  canvas.onResize(() => {
    context.configure({ device, format: presentationFormat, alphaMode: 'premultiplied' })
  })

  // ─── Input ─────────────────────────────────────────────────────────────

  const { state: pointer } = createPointerTracker(canvas.element)

  // ─── Particle buffer ───────────────────────────────────────────────────

  // Each particle: position (vec2f) + velocity (vec2f) = 4 floats = 16 bytes
  const particleData = new Float32Array(PARTICLE_COUNT * 4)
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2
    const r = Math.sqrt(Math.random()) * 1.0
    particleData[i * 4 + 0] = Math.cos(angle) * r    // position.x
    particleData[i * 4 + 1] = Math.sin(angle) * r    // position.y
    particleData[i * 4 + 2] = (Math.random() - 0.5) * 0.002 // velocity.x
    particleData[i * 4 + 3] = (Math.random() - 0.5) * 0.002 // velocity.y
  }

  const particleBuffer = createStorageBuffer(
    device,
    particleData.byteLength,
    particleData,
    'particle-buffer'
  )

  // Uniforms: deltaTime, time, mouseX, mouseY, attract + 3 pad = 8 floats = 32 bytes
  const uniformBuffer = createUniformBuffer(device, 32, 'particle-uniforms')

  // ─── Compute pipeline ──────────────────────────────────────────────────

  const computeModule = createShaderModule(device, COMPUTE_SHADER, 'compute-shader')

  const computeBGL = device.createBindGroupLayout({
    label: 'compute-bgl',
    entries: [
      storageReadWriteLayoutEntry(0, GPUShaderStage.COMPUTE),
      uniformLayoutEntry(1, GPUShaderStage.COMPUTE),
    ],
  })

  const computePipeline = device.createComputePipeline({
    label: 'compute-pipeline',
    layout: device.createPipelineLayout({ bindGroupLayouts: [computeBGL] }),
    compute: { module: computeModule, entryPoint: 'cs_main' },
  })

  const computeBindGroup = createBindGroup(
    device,
    computeBGL,
    [particleBuffer, uniformBuffer],
    'compute-bind-group'
  )

  // ─── Render pipeline ───────────────────────────────────────────────────

  const vertexModule = createShaderModule(device, VERTEX_SHADER, 'vertex-shader')
  const fragmentModule = createShaderModule(device, FRAGMENT_SHADER, 'fragment-shader')

  const renderBGL = device.createBindGroupLayout({
    label: 'render-bgl',
    entries: [storageLayoutEntry(0, GPUShaderStage.VERTEX)],
  })

  const renderPipeline = new RenderPipelineBuilder(device)
    .setShaders(vertexModule, fragmentModule)
    .setBindGroupLayouts([renderBGL])
    .setTargetFormat(presentationFormat)
    .setTopology('point-list')
    .build()

  const renderBindGroup = createBindGroup(
    device,
    renderBGL,
    [particleBuffer],
    'render-bind-group'
  )

  // ─── Render loop ───────────────────────────────────────────────────────

  const loop = createLoop((info) => {
    // Map mouse UV [0,1] → NDC [-1,1], flip Y (canvas Y is down, NDC Y is up)
    const mouseX = pointer.uv.x * 2 - 1
    const mouseY = -(pointer.uv.y * 2 - 1)
    const attract = pointer.pressed ? -1.0 : 1.0

    const uniforms = new Float32Array([
      info.delta / 1000,    // deltaTime (seconds)
      info.elapsed / 1000,  // time (seconds)
      mouseX,
      mouseY,
      attract,
    ])
    updateBuffer(device, uniformBuffer, uniforms)

    const encoder = device.createCommandEncoder({ label: 'frame-encoder' })

    // Compute pass
    const computePass = encoder.beginComputePass({ label: 'compute-pass' })
    computePass.setPipeline(computePipeline)
    computePass.setBindGroup(0, computeBindGroup)
    computePass.dispatchWorkgroups(Math.ceil(PARTICLE_COUNT / WORKGROUP_SIZE))
    computePass.end()

    // Render pass
    const renderPass = encoder.beginRenderPass(
      createRenderPassDescriptor({
        colorView: context.getCurrentTexture().createView(),
        clearColor: COLOR_BLACK,
      })
    )
    renderPass.setPipeline(renderPipeline)
    renderPass.setBindGroup(0, renderBindGroup)
    renderPass.draw(PARTICLE_COUNT)
    renderPass.end()

    device.queue.submit([encoder.finish()])
  })

  loop.start()
}

// Show a friendly error if WebGPU isn't available
main().catch((err: unknown) => {
  const errorEl = document.getElementById('error')
  if (errorEl) {
    errorEl.style.display = 'block'
    errorEl.textContent = [
      'Failed to initialize adviz.',
      '',
      err instanceof Error ? err.message : String(err),
      '',
      'WebGPU requires Chrome 113+, Edge 113+, or Safari 18+.',
      'On macOS, make sure "Develop > Experimental Features > WebGPU" is enabled in Safari.',
    ].join('\n')
  }
  console.error(err)
})

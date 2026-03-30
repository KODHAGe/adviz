/**
 * Example 02: GPU Particle System (Compute Shader)
 *
 * Demonstrates WebGPU compute shaders via a particle simulation.
 * 100,000 particles are updated on the GPU every frame using a compute pass,
 * then rendered in a render pass.
 *
 * Patterns demonstrated:
 *  - Compute pipeline (ComputePipelineBuilder pattern)
 *  - Storage buffers (read-write from compute, read-only from vertex)
 *  - Double-buffering particle state
 *  - Dispatch workgroups
 *  - Combining a compute pass and a render pass in one command encoder
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
import { COLOR_BLACK } from '../src/math/index.js'

// ─── Constants ───────────────────────────────────────────────────────────────

const PARTICLE_COUNT = 100_000
const WORKGROUP_SIZE = 64

// ─── Shader source ───────────────────────────────────────────────────────────

const COMPUTE_SHADER = wgsl`
  struct Particle {
    position : vec2f,
    velocity : vec2f,
  }

  struct Uniforms {
    deltaTime : f32,
    time      : f32,
  }

  @group(0) @binding(0) var<storage, read_write> particles : array<Particle>;
  @group(0) @binding(1) var<uniform>             uniforms  : Uniforms;

  @compute @workgroup_size(${WORKGROUP_SIZE})
  fn cs_main(@builtin(global_invocation_id) id: vec3u) {
    let i = id.x;
    if (i >= arrayLength(&particles)) { return; }

    var p = particles[i];

    // Simple attractor: pull toward origin with velocity damping
    let attractDir = normalize(-p.position);
    let dist = length(p.position);
    p.velocity += attractDir * (1.0 / (dist + 0.1)) * 0.002;
    p.velocity *= 0.99; // damping

    // Add a swirl based on time
    let swirl = vec2f(-p.position.y, p.position.x) * sin(uniforms.time * 0.5) * 0.003;
    p.velocity += swirl;

    p.position += p.velocity * uniforms.deltaTime;

    // Wrap at edges
    if (p.position.x > 1.0)  { p.position.x = -1.0; }
    if (p.position.x < -1.0) { p.position.x =  1.0; }
    if (p.position.y > 1.0)  { p.position.y = -1.0; }
    if (p.position.y < -1.0) { p.position.y =  1.0; }

    particles[i] = p;
  }
`

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
    let p = particles[vi];
    let speed = length(p.velocity);
    return VertexOutput(vec4f(p.position, 0.0, 1.0), speed);
  }
`

const FRAGMENT_SHADER = wgsl`
  @fragment
  fn fs_main(@location(0) speed: f32) -> @location(0) vec4f {
    // Map speed to a blue → white color
    let t = clamp(speed * 50.0, 0.0, 1.0);
    return mix(vec4f(0.0, 0.2, 1.0, 1.0), vec4f(1.0, 1.0, 1.0, 1.0), t);
  }
`

// ─── Bootstrap ───────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const { device } = await initDevice()
  const canvas = createCanvas({ container: document.body })

  const context = canvas.element.getContext('webgpu')
  if (!context) throw new Error('Could not get WebGPU canvas context.')

  const presentationFormat = navigator.gpu.getPreferredCanvasFormat()
  context.configure({ device, format: presentationFormat, alphaMode: 'premultiplied' })

  // ─── Initial particle data (position: vec2f + velocity: vec2f = 16 bytes each) ──

  const particleData = new Float32Array(PARTICLE_COUNT * 4)
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particleData[i * 4 + 0] = (Math.random() - 0.5) * 2  // position.x
    particleData[i * 4 + 1] = (Math.random() - 0.5) * 2  // position.y
    particleData[i * 4 + 2] = (Math.random() - 0.5) * 0.01 // velocity.x
    particleData[i * 4 + 3] = (Math.random() - 0.5) * 0.01 // velocity.y
  }

  const particleBuffer = createStorageBuffer(
    device,
    particleData.byteLength,
    particleData,
    'particle-buffer'
  )

  // Uniforms: deltaTime (f32) + time (f32) = 8 bytes → padded to 16
  const uniformBuffer = createUniformBuffer(device, 16, 'particle-uniforms')

  // ─── Compute pipeline ────────────────────────────────────────────────────

  const computeModule = createShaderModule(device, COMPUTE_SHADER, '02-compute')

  const computeBindGroupLayout = device.createBindGroupLayout({
    label: 'compute-bgl',
    entries: [
      storageReadWriteLayoutEntry(0, GPUShaderStage.COMPUTE),
      uniformLayoutEntry(1, GPUShaderStage.COMPUTE),
    ],
  })

  const computePipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [computeBindGroupLayout] }),
    compute: { module: computeModule, entryPoint: 'cs_main' },
  })

  const computeBindGroup = createBindGroup(
    device,
    computeBindGroupLayout,
    [particleBuffer, uniformBuffer],
    'compute-bind-group'
  )

  // ─── Render pipeline ─────────────────────────────────────────────────────

  const vertexModule = createShaderModule(device, VERTEX_SHADER, '02-vertex')
  const fragmentModule = createShaderModule(device, FRAGMENT_SHADER, '02-fragment')

  const renderBindGroupLayout = device.createBindGroupLayout({
    label: 'render-bgl',
    entries: [storageLayoutEntry(0, GPUShaderStage.VERTEX)],
  })

  const renderPipeline = new RenderPipelineBuilder(device)
    .setShaders(vertexModule, fragmentModule)
    .setBindGroupLayouts([renderBindGroupLayout])
    .setTargetFormat(presentationFormat)
    .setTopology('point-list')
    .build()

  const renderBindGroup = createBindGroup(
    device,
    renderBindGroupLayout,
    [particleBuffer],
    'render-bind-group'
  )

  // ─── Render loop ─────────────────────────────────────────────────────────

  const loop = createLoop((info) => {
    // Update uniforms
    const uniforms = new Float32Array([info.delta / 1000, info.elapsed / 1000])
    updateBuffer(device, uniformBuffer, uniforms)

    const encoder = device.createCommandEncoder({ label: '02-frame-encoder' })

    // Compute pass: update particle positions
    const computePass = encoder.beginComputePass({ label: '02-compute-pass' })
    computePass.setPipeline(computePipeline)
    computePass.setBindGroup(0, computeBindGroup)
    computePass.dispatchWorkgroups(Math.ceil(PARTICLE_COUNT / WORKGROUP_SIZE))
    computePass.end()

    // Render pass: draw particles
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

main().catch(console.error)

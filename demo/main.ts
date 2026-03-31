/**
 * adviz frontend demo — interactive GPU particle field
 *
 * 100,000 particles simulated entirely on the GPU via a WebGPU compute shader.
 *
 * Interactions:
 *   move              → passive swirl (gentle gravity well)
 *   left hold         → attract  — pull everything toward cursor
 *   right hold        → repel    — push particles away
 *   double click      → burst    — radial explosion from click point
 *   middle hold       → vortex   — orbital spin around cursor
 *
 * Color ramp (by speed):
 *   still             → dark warm brown
 *   slow              → burgundy / mahogany
 *   medium            → deep rose / hot pink
 *   fast              → soft pink
 *   very fast         → blush cream / white
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
import { color } from '../src/math/index.js'

// ─── Constants ───────────────────────────────────────────────────────────────

const PARTICLE_COUNT = 100_000
const WORKGROUP_SIZE = 64

/** Seconds until a burst force decays to near-zero. */
const BURST_DURATION = 0.9

/**
 * Interaction modes — encoded as a float in the uniform buffer.
 * Must match the constants used in COMPUTE_SHADER below.
 */
const MODE_PASSIVE = 0
const MODE_ATTRACT = 1
const MODE_REPEL   = 2
const MODE_BURST   = 3
const MODE_VORTEX  = 4

// ─── Shaders ─────────────────────────────────────────────────────────────────

/**
 * Uniform buffer layout (8 × f32 = 32 bytes, 16-byte aligned):
 *   [0] deltaTime  — frame time in seconds
 *   [1] time       — total elapsed in seconds
 *   [2] mouseX     — cursor X in NDC [-1, 1]
 *   [3] mouseY     — cursor Y in NDC [-1, 1]
 *   [4] mode       — interaction mode (0–4, see MODE_* constants)
 *   [5] burstTime  — seconds since burst fired (for exponential decay)
 *   [6] burstX     — burst origin X in NDC
 *   [7] burstY     — burst origin Y in NDC
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
    mode      : f32,
    burstTime : f32,
    burstX    : f32,
    burstY    : f32,
  }

  @group(0) @binding(0) var<storage, read_write> particles : array<Particle>;
  @group(0) @binding(1) var<uniform>             u         : Uniforms;

  @compute @workgroup_size(${WORKGROUP_SIZE})
  fn cs_main(@builtin(global_invocation_id) id: vec3u) {
    let i = id.x;
    if (i >= arrayLength(&particles)) { return; }
    var p = particles[i];

    let mouse     = vec2f(u.mouseX, u.mouseY);
    let toMouse   = mouse - p.position;
    let mouseDist = length(toMouse) + 0.001;

    // ── Mode 0: passive — gentle hover gravity ─────────────────────────────
    if (u.mode == ${MODE_PASSIVE}.0) {
      let gravity = normalize(toMouse) * (1.0 / (mouseDist * mouseDist * 2500.0 + 1.0)) * 0.004;
      p.velocity += gravity;
    }

    // ── Mode 1: attract — strong pull toward cursor ────────────────────────
    if (u.mode == ${MODE_ATTRACT}.0) {
      let pull = normalize(toMouse) * (1.0 / (mouseDist * mouseDist * 180.0 + 1.0)) * 0.025;
      p.velocity += pull;
    }

    // ── Mode 2: repel — continuous push away from cursor ──────────────────
    if (u.mode == ${MODE_REPEL}.0) {
      let push = -normalize(toMouse) * (1.0 / (mouseDist * mouseDist * 180.0 + 1.0)) * 0.030;
      p.velocity += push;
    }

    // ── Mode 3: burst — radial explosion from burst origin, decays fast ───
    if (u.mode == ${MODE_BURST}.0) {
      let origin    = vec2f(u.burstX, u.burstY);
      let fromBurst = p.position - origin;
      let bDist     = length(fromBurst) + 0.001;
      // Exponential decay: full force at t=0, near-zero by t=BURST_DURATION
      let decay     = exp(-u.burstTime * 7.0);
      let force     = normalize(fromBurst) * decay * 0.10 / (bDist * 2.5 + 0.4);
      p.velocity   += force;
    }

    // ── Mode 4: vortex — orbital spin around cursor ────────────────────────
    if (u.mode == ${MODE_VORTEX}.0) {
      // Clockwise tangent + slight inward pull to form stable orbits
      let tangent = vec2f(toMouse.y, -toMouse.x) / (mouseDist + 0.01);
      let inward  = normalize(toMouse) / (mouseDist * 5.0 + 1.0);
      p.velocity += tangent * 0.018 + inward * 0.004;
    }

    // ── Background swirl (always active) ──────────────────────────────────
    let angle  = atan2(p.position.y, p.position.x) + u.time * 0.10;
    let swirl  = vec2f(cos(angle), sin(angle)) * 0.00022;
    p.velocity += swirl;

    // ── Damping ───────────────────────────────────────────────────────────
    p.velocity *= 0.973;

    p.position += p.velocity * u.deltaTime * 60.0;

    // ── Soft edge wrap ────────────────────────────────────────────────────
    if (p.position.x >  1.1) { p.position.x = -1.1; }
    if (p.position.x < -1.1) { p.position.x =  1.1; }
    if (p.position.y >  1.1) { p.position.y = -1.1; }
    if (p.position.y < -1.1) { p.position.y =  1.1; }

    particles[i] = p;
  }
`

const VERTEX_SHADER = wgsl`
  struct Particle {
    position : vec2f,
    velocity : vec2f,
  }

  @group(0) @binding(0) var<storage, read> particles : array<Particle>;

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
 * 5-stop warm color ramp from dark brown → blush cream, mapped by particle speed.
 *
 *   dark warm brown  →  burgundy/mahogany  →  hot pink  →  soft pink  →  blush cream
 */
const FRAGMENT_SHADER = wgsl`
  @fragment
  fn fs_main(@location(0) speed: f32) -> @location(0) vec4f {
    let t  = clamp(speed * 130.0, 0.0, 1.0);

    let c0 = vec4f(0.18, 0.06, 0.08, 1.0);  // dark warm brown
    let c1 = vec4f(0.42, 0.10, 0.24, 1.0);  // burgundy / mahogany
    let c2 = vec4f(0.80, 0.20, 0.46, 1.0);  // hot pink / deep rose
    let c3 = vec4f(0.96, 0.56, 0.76, 1.0);  // soft pink
    let c4 = vec4f(1.00, 0.93, 0.95, 1.0);  // blush cream

    if      (t < 0.25) { return mix(c0, c1, t * 4.0); }
    else if (t < 0.50) { return mix(c1, c2, (t - 0.25) * 4.0); }
    else if (t < 0.75) { return mix(c2, c3, (t - 0.50) * 4.0); }
    else               { return mix(c3, c4, (t - 0.75) * 4.0); }
  }
`

// ─── Clear color — very dark warm maroon ─────────────────────────────────────
const CLEAR_COLOR = color(0.04, 0.01, 0.02)

// ─── Bootstrap ───────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const container = document.getElementById('app')
  if (!container) throw new Error('#app element not found')

  const { device } = await initDevice({ powerPreference: 'high-performance' })
  const canvas = createCanvas({ container, autoResize: true })

  const context = canvas.element.getContext('webgpu')
  if (!context) throw new Error('Could not get WebGPU canvas context.')

  const presentationFormat = navigator.gpu.getPreferredCanvasFormat()
  const configureCtx = (): void => {
    context.configure({ device, format: presentationFormat, alphaMode: 'premultiplied' })
  }
  configureCtx()
  canvas.onResize(configureCtx)

  // ─── Input state ───────────────────────────────────────────────────────

  let mouseX = 0
  let mouseY = 0
  let buttonMode = MODE_PASSIVE  // mode driven by held buttons
  let burstActive = false
  let burstStartTime = 0         // elapsed seconds when burst fired
  let burstOriginX = 0
  let burstOriginY = 0
  let currentElapsed = 0         // updated each frame

  function toNDC(e: PointerEvent | MouseEvent): { x: number; y: number } {
    const rect = canvas.element.getBoundingClientRect()
    return {
      x:  ((e.clientX - rect.left) / rect.width)  * 2 - 1,
      y: -(((e.clientY - rect.top)  / rect.height) * 2 - 1),
    }
  }

  canvas.element.addEventListener('pointermove', (e) => {
    const ndc = toNDC(e); mouseX = ndc.x; mouseY = ndc.y
  })

  canvas.element.addEventListener('pointerdown', (e) => {
    const ndc = toNDC(e); mouseX = ndc.x; mouseY = ndc.y
    if (e.button === 0) buttonMode = MODE_ATTRACT
    if (e.button === 1) buttonMode = MODE_VORTEX   // middle
    if (e.button === 2) buttonMode = MODE_REPEL
    canvas.element.setPointerCapture(e.pointerId)
  })

  canvas.element.addEventListener('pointerup', (e) => {
    if (e.button === 0 && buttonMode === MODE_ATTRACT) buttonMode = MODE_PASSIVE
    if (e.button === 1 && buttonMode === MODE_VORTEX)  buttonMode = MODE_PASSIVE
    if (e.button === 2 && buttonMode === MODE_REPEL)   buttonMode = MODE_PASSIVE
  })

  canvas.element.addEventListener('dblclick', (e) => {
    const ndc = toNDC(e)
    burstOriginX = ndc.x; burstOriginY = ndc.y
    burstActive = true
    burstStartTime = currentElapsed
  })

  canvas.element.addEventListener('contextmenu', (e) => e.preventDefault())

  // ─── Particle buffer ───────────────────────────────────────────────────
  // Layout: position (vec2f) + velocity (vec2f) = 4 × f32 = 16 bytes/particle

  const particleData = new Float32Array(PARTICLE_COUNT * 4)
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2
    const r = Math.sqrt(Math.random())
    particleData[i * 4 + 0] = Math.cos(angle) * r
    particleData[i * 4 + 1] = Math.sin(angle) * r
    particleData[i * 4 + 2] = (Math.random() - 0.5) * 0.002
    particleData[i * 4 + 3] = (Math.random() - 0.5) * 0.002
  }

  const particleBuffer = createStorageBuffer(device, particleData.byteLength, particleData, 'particles')
  const uniformBuffer  = createUniformBuffer(device, 32, 'uniforms')

  // ─── Compute pipeline ──────────────────────────────────────────────────

  const computeModule = createShaderModule(device, COMPUTE_SHADER, 'compute')

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

  const computeBindGroup = createBindGroup(device, computeBGL, [particleBuffer, uniformBuffer], 'compute-bg')

  // ─── Render pipeline ───────────────────────────────────────────────────

  const renderBGL = device.createBindGroupLayout({
    label: 'render-bgl',
    entries: [storageLayoutEntry(0, GPUShaderStage.VERTEX)],
  })

  const renderPipeline = new RenderPipelineBuilder(device)
    .setShaders(
      createShaderModule(device, VERTEX_SHADER, 'vertex'),
      createShaderModule(device, FRAGMENT_SHADER, 'fragment')
    )
    .setBindGroupLayouts([renderBGL])
    .setTargetFormat(presentationFormat)
    .setTopology('point-list')
    .build()

  const renderBindGroup = createBindGroup(device, renderBGL, [particleBuffer], 'render-bg')

  // ─── Render loop ───────────────────────────────────────────────────────

  const loop = createLoop((info) => {
    currentElapsed = info.elapsed / 1000

    // Resolve the active mode — burst overrides button mode while decaying
    let activeMode = buttonMode
    let burstTime  = 0

    if (burstActive) {
      burstTime = currentElapsed - burstStartTime
      if (burstTime > BURST_DURATION) {
        burstActive = false
      } else {
        activeMode = MODE_BURST
      }
    }

    updateBuffer(device, uniformBuffer, new Float32Array([
      info.delta / 1000,   // deltaTime
      currentElapsed,      // time
      mouseX,
      mouseY,
      activeMode,
      burstTime,
      burstOriginX,
      burstOriginY,
    ]))

    const encoder = device.createCommandEncoder({ label: 'frame' })

    const computePass = encoder.beginComputePass({ label: 'compute' })
    computePass.setPipeline(computePipeline)
    computePass.setBindGroup(0, computeBindGroup)
    computePass.dispatchWorkgroups(Math.ceil(PARTICLE_COUNT / WORKGROUP_SIZE))
    computePass.end()

    const renderPass = encoder.beginRenderPass(
      createRenderPassDescriptor({
        colorView: context.getCurrentTexture().createView(),
        clearColor: CLEAR_COLOR,
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
    ].join('\n')
  }
  console.error(err)
})


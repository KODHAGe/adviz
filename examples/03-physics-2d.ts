/**
 * Example 03: 2D CPU Physics
 *
 * Demonstrates the adviz physics module for 2D rigid-body integration.
 * 200 bodies fall under gravity. Clicking the canvas applies an upward radial
 * impulse to all bodies near the click point.
 *
 * Patterns demonstrated:
 *  - createWorld2D / createBody2D
 *  - applyImpulse2D for interactive forces
 *  - syncBody2DToNode to bridge physics → scene graph
 *  - Rendering bodies as colored circles via a shared circle mesh
 *  - Uploading per-body transform as a uniform each draw call
 */

import { initDevice, createCanvas, createLoop } from '../src/core/index.js'
import {
  RenderPipelineBuilder,
  createRenderPassDescriptor,
  createUniformBuffer,
  updateBuffer,
} from '../src/renderer/index.js'
import { createShaderModule, wgsl, uniformLayoutEntry, createBindGroup } from '../src/shader/index.js'
import { Mat4 } from '../src/math/index.js'
import { vec2 } from '../src/math/index.js'
import { COLOR_BLACK } from '../src/math/index.js'
import { createCircle } from '../src/geometry/index.js'
import { createNode } from '../src/scene/index.js'
import { createPointerTracker } from '../src/input/index.js'
import {
  createWorld2D,
  createBody2D,
  applyImpulse2D,
  syncBody2DToNode,
} from '../src/physics/index.js'

// ─── Constants ───────────────────────────────────────────────────────────────

const BODY_COUNT = 200
const SPAWN_RANGE = 1.8   // initial spawn range in clip-space units
const CIRCLE_RADIUS = 0.04

// ─── Shaders ─────────────────────────────────────────────────────────────────

const VERTEX_SHADER = wgsl`
  struct Uniforms {
    mvp : mat4x4f,
  }

  struct VertexInput {
    @location(0) position : vec3f,
    @location(1) color    : vec4f,
  }

  struct VertexOutput {
    @builtin(position) position : vec4f,
    @location(0)       color    : vec4f,
  }

  @group(0) @binding(0) var<uniform> u : Uniforms;

  @vertex
  fn vs_main(in : VertexInput) -> VertexOutput {
    return VertexOutput(u.mvp * vec4f(in.position, 1.0), in.color);
  }
`

const FRAGMENT_SHADER = wgsl`
  @fragment
  fn fs_main(@location(0) color : vec4f) -> @location(0) vec4f {
    return color;
  }
`

// ─── Bootstrap ───────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const { device } = await initDevice()
  const canvas = createCanvas({ container: document.body })

  const context = canvas.element.getContext('webgpu')
  if (!context) throw new Error('Could not get WebGPU context.')

  const format = navigator.gpu.getPreferredCanvasFormat()
  context.configure({ device, format, alphaMode: 'premultiplied' })

  // ─── Input ───────────────────────────────────────────────────────────────

  const pointer = createPointerTracker(canvas.element)

  // ─── Physics world ───────────────────────────────────────────────────────

  const world = createWorld2D({ gravity: vec2(0, -4) })

  const bodies = Array.from({ length: BODY_COUNT }, () => {
    const x = (Math.random() - 0.5) * SPAWN_RANGE
    const y = (Math.random() - 0.5) * SPAWN_RANGE + 0.2
    const body = createBody2D({
      position: vec2(x, y),
      velocity: vec2((Math.random() - 0.5) * 0.5, Math.random() * 0.5),
      mass: 0.5 + Math.random() * 1.5,
      damping: 0.999,
    })
    world.addBody(body)
    return body
  })

  // Scene nodes: one per body for transform
  const nodes = bodies.map(() => createNode())

  // ─── GPU resources ───────────────────────────────────────────────────────

  // Shared circle mesh (reused for all bodies)
  const circleMesh = createCircle(device, 32, CIRCLE_RADIUS)

  // Per-body uniform buffer (mvp mat4 = 64 bytes)
  const uniformBuffer = createUniformBuffer(device, 64, 'body-mvp')

  const vsModule = createShaderModule(device, VERTEX_SHADER, '03-vertex')
  const fsModule = createShaderModule(device, FRAGMENT_SHADER, '03-fragment')

  const bindGroupLayout = device.createBindGroupLayout({
    label: '03-bgl',
    entries: [uniformLayoutEntry(0, GPUShaderStage.VERTEX)],
  })

  const pipeline = new RenderPipelineBuilder(device)
    .setShaders(vsModule, fsModule)
    .setVertexLayout([
      { shaderLocation: 0, offset: 0,  format: 'float32x3' },
      { shaderLocation: 1, offset: 12, format: 'float32x4' },
    ], 28)
    .setBindGroupLayouts([bindGroupLayout])
    .setTargetFormat(format)
    .build()

  const bindGroup = createBindGroup(device, bindGroupLayout, [uniformBuffer], '03-bg')

  // Orthographic projection covering [-1.8, 1.8] in both axes
  const proj = Mat4.orthographic(-1.8, 1.8, -1.8, 1.8, -1, 1)

  // ─── Interaction ─────────────────────────────────────────────────────────

  let wasPressed = false

  // ─── Render loop ─────────────────────────────────────────────────────────

  const loop = createLoop((info) => {
    const dt = Math.min(info.delta / 1000, 0.05) // cap at 50 ms to avoid explosion

    // On click: apply an upward radial impulse near the cursor
    if (pointer.state.pressed && !wasPressed) {
      // Convert UV [0,1] → clip-space [-1,1]
      const cx = (pointer.state.uv.x * 2 - 1) * 1.8
      const cy = -(pointer.state.uv.y * 2 - 1) * 1.8

      for (const body of bodies) {
        const dx = body.position.x - cx
        const dy = body.position.y - cy
        const distSq = dx * dx + dy * dy
        if (distSq < 0.5 * 0.5) {
          const dist = Math.sqrt(distSq) + 0.01
          const strength = 4 * (1 - dist / 0.5)
          applyImpulse2D(body, vec2((dx / dist) * strength, (dy / dist) * strength + 2))
        }
      }
    }
    wasPressed = pointer.state.pressed

    // Wrap bodies that leave the viewport
    for (const body of bodies) {
      if (body.position.y < -2.2) {
        body.position = vec2((Math.random() - 0.5) * SPAWN_RANGE, 2.0)
        body.velocity = vec2((Math.random() - 0.5) * 0.5, 0)
      }
    }

    world.step(dt)

    // Sync physics → scene nodes
    for (let i = 0; i < bodies.length; i++) {
      const body = bodies[i]
      const node = nodes[i]
      if (body !== undefined && node !== undefined) {
        syncBody2DToNode(body, node)
      }
    }

    // ── Draw ──────────────────────────────────────────────────────────────
    const encoder = device.createCommandEncoder({ label: '03-frame' })
    const pass = encoder.beginRenderPass(
      createRenderPassDescriptor({
        colorView: context.getCurrentTexture().createView(),
        clearColor: COLOR_BLACK,
      })
    )
    pass.setPipeline(pipeline)
    pass.setBindGroup(0, bindGroup)
    pass.setVertexBuffer(0, circleMesh.vertexBuffer)
    if (circleMesh.indexBuffer !== null) {
      pass.setIndexBuffer(circleMesh.indexBuffer, circleMesh.indexFormat)
    }

    for (const node of nodes) {
      const mvp = proj.mul(node.worldMatrix())
      updateBuffer(device, uniformBuffer, mvp.toFloat32Array())
      if (circleMesh.indexBuffer !== null) {
        pass.drawIndexed(circleMesh.drawCount)
      } else {
        pass.draw(circleMesh.drawCount)
      }
    }

    pass.end()
    device.queue.submit([encoder.finish()])
  })

  loop.start()
}

main().catch(console.error)

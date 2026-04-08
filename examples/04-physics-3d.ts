/**
 * Example 04: 3D CPU Physics (Angular Dynamics)
 *
 * Demonstrates the adviz physics module for 3D rigid-body integration with
 * full angular dynamics. 20 boxes spin in space under applied torques, with
 * gravity pulling them down. A perspective camera orbits the scene.
 *
 * Patterns demonstrated:
 *  - createWorld3D / createBody3D
 *  - applyTorque3D for initial spin
 *  - syncBody3DToNode to bridge physics → scene graph
 *  - Uploading orientation directly as body.orientation.toMat4() (avoids Euler conversion)
 *  - Quat.fromAxisAngle for initial spin impulse
 *  - Mat4.perspective + Mat4.lookAt for camera
 */

import { initDevice, createCanvas, createLoop } from '../src/core/index.js'
import {
  RenderPipelineBuilder,
  createRenderPassDescriptor,
  createUniformBuffer,
  updateBuffer,
  createVertexBuffer,
  createIndexBuffer,
} from '../src/renderer/index.js'
import {
  createShaderModule,
  wgsl,
  uniformLayoutEntry,
  createBindGroup,
} from '../src/shader/index.js'
import { Mat4, vec3, VEC3_UP, VEC3_ZERO, Quat, COLOR_BLACK } from '../src/math/index.js'
import { createNode } from '../src/scene/index.js'
import {
  createWorld3D,
  createBody3D,
  applyTorque3D,
} from '../src/physics/index.js'

// ─── Constants ───────────────────────────────────────────────────────────────

const BOX_COUNT = 20
const SPAWN_SPREAD = 3

// ─── Box geometry (unit cube: 2×2×2, centred at origin) ─────────────────────
// Vertex layout: vec3f position (12 bytes) + vec4f color (16 bytes) = 28 bytes stride

function buildBoxGeometry(): { vertices: Float32Array; indices: Uint16Array } {
  const p = 0.5
  type V3 = [number, number, number]
  type V4 = [number, number, number, number]
  // Each face: 4 vertices (position + color), 2 triangles → 6 indices
  function face(a: V3, b: V3, c: V3, d: V3, col: V4): { v: number[]; i: number[] } {
    return {
      v: [...a, ...col, ...b, ...col, ...c, ...col, ...d, ...col],
      i: [0, 1, 2, 0, 2, 3],
    }
  }
  const red:     V4 = [0.9, 0.2, 0.2, 1]
  const green:   V4 = [0.2, 0.9, 0.2, 1]
  const blue:    V4 = [0.2, 0.2, 0.9, 1]
  const yellow:  V4 = [0.9, 0.9, 0.2, 1]
  const cyan:    V4 = [0.2, 0.9, 0.9, 1]
  const magenta: V4 = [0.9, 0.2, 0.9, 1]
  const faces = [
    face([-p,-p,-p],[p,-p,-p],[p,p,-p],[-p,p,-p], red),     // -Z back
    face([p,-p,p],[-p,-p,p],[-p,p,p],[p,p,p],     green),   // +Z front
    face([-p,-p,p],[-p,-p,-p],[-p,p,-p],[-p,p,p], blue),    // -X left
    face([p,-p,-p],[p,-p,p],[p,p,p],[p,p,-p],      yellow),  // +X right
    face([-p,-p,p],[p,-p,p],[p,-p,-p],[-p,-p,-p],  cyan),    // -Y bottom
    face([-p,p,-p],[p,p,-p],[p,p,p],[-p,p,p],      magenta), // +Y top
  ]
  const vData: number[] = []
  const iData: number[] = []
  for (const { v, i } of faces) {
    const base = vData.length / 7
    vData.push(...v)
    iData.push(...i.map(idx => base + idx))
  }
  return {
    vertices: new Float32Array(vData),
    indices: new Uint16Array(iData),
  }
}

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

  // ─── Geometry ────────────────────────────────────────────────────────────

  const { vertices, indices } = buildBoxGeometry()
  const vertexBuffer = createVertexBuffer(device, vertices, '04-box-verts')
  const indexBuffer = createIndexBuffer(device, indices, '04-box-indices')

  // ─── Physics world ───────────────────────────────────────────────────────

  const world = createWorld3D({ gravity: vec3(0, -3, 0) })

  const bodies = Array.from({ length: BOX_COUNT }, () => {
    const px = (Math.random() - 0.5) * SPAWN_SPREAD
    const py = (Math.random() - 0.5) * SPAWN_SPREAD
    const pz = (Math.random() - 0.5) * SPAWN_SPREAD
    const body = createBody3D({
      position: vec3(px, py, pz),
      mass: 1 + Math.random(),
      inertiaTensor: 0.1 + Math.random() * 0.2,
      damping: 0.999,
      angularDamping: 0.995,
      orientation: Quat.fromAxisAngle(
        vec3(Math.random(), Math.random(), Math.random()).normalize(),
        Math.random() * Math.PI * 2
      ),
    })
    world.addBody(body)
    // Give each box an initial spin
    applyTorque3D(body, vec3(
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2
    ))
    return body
  })

  const nodes = bodies.map(() => createNode())

  // ─── GPU pipeline ─────────────────────────────────────────────────────────

  const uniformBuffer = createUniformBuffer(device, 64, '04-mvp')

  const vsModule = createShaderModule(device, VERTEX_SHADER, '04-vertex')
  const fsModule = createShaderModule(device, FRAGMENT_SHADER, '04-fragment')

  const bindGroupLayout = device.createBindGroupLayout({
    label: '04-bgl',
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
    .setCullMode('back')
    .build()

  const bindGroup = createBindGroup(device, bindGroupLayout, [uniformBuffer], '04-bg')

  // ─── Render loop ─────────────────────────────────────────────────────────

  const loop = createLoop((info) => {
    const dt = Math.min(info.delta / 1000, 0.05)
    const t = info.elapsed / 1000

    world.step(dt)

    // Wrap falling bodies back to the top
    for (const body of bodies) {
      if (body.position.y < -4) {
        body.position = vec3(
          (Math.random() - 0.5) * SPAWN_SPREAD,
          4,
          (Math.random() - 0.5) * SPAWN_SPREAD
        )
        body.velocity = VEC3_ZERO.clone()
      }
    }

    // Sync physics → scene nodes (position only; we upload orientation quat directly)
    for (let i = 0; i < bodies.length; i++) {
      const node = nodes[i]
      const body = bodies[i]
      if (node !== undefined && body !== undefined) {
        node.position = body.position
        // Don't use syncBody3DToNode here — instead build MVP from quat directly
        // to avoid Euler gimbal lock at large angles.
      }
    }

    // Orbit camera
    const eye = vec3(Math.sin(t * 0.3) * 8, 2, Math.cos(t * 0.3) * 8)
    const view = Mat4.lookAt(eye, VEC3_ZERO, VEC3_UP)
    const proj = Mat4.perspective(
      Math.PI / 3,
      canvas.element.width / canvas.element.height,
      0.1,
      100
    )
    const vp = proj.mul(view)

    // ── Draw ──────────────────────────────────────────────────────────────
    const encoder = device.createCommandEncoder({ label: '04-frame' })
    const pass = encoder.beginRenderPass(
      createRenderPassDescriptor({
        colorView: context.getCurrentTexture().createView(),
        clearColor: COLOR_BLACK,
      })
    )
    pass.setPipeline(pipeline)
    pass.setBindGroup(0, bindGroup)
    pass.setVertexBuffer(0, vertexBuffer)
    pass.setIndexBuffer(indexBuffer, 'uint16')

    for (let i = 0; i < bodies.length; i++) {
      const body = bodies[i]
      const node = nodes[i]
      if (body === undefined || node === undefined) continue

      // Build model matrix: T * R (from quat, bypass Euler) * S
      const T = Mat4.translation(body.position)
      const R = body.orientation.toMat4()
      const S = Mat4.scale(node.scale)
      const model = T.mul(R).mul(S)
      const mvp = vp.mul(model)

      updateBuffer(device, uniformBuffer, mvp.toFloat32Array())
      pass.drawIndexed(indices.length)
    }

    pass.end()
    device.queue.submit([encoder.finish()])
  })

  loop.start()
}

main().catch(console.error)

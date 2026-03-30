/**
 * Example 01: Hello Triangle
 *
 * The minimal adviz program. Renders a colored triangle using a render pipeline.
 * This file is the canonical pattern reference for all future Copilot-generated code.
 *
 * Pattern demonstrated:
 *  1. initDevice()     — get GPU adapter + device
 *  2. createCanvas()   — mount canvas, handle resize
 *  3. createShaderModule() + wgsl — define WGSL shaders
 *  4. RenderPipelineBuilder — construct render pipeline
 *  5. createTriangle() — create vertex buffer from geometry primitive
 *  6. createLoop()     — start RAF loop, submit command buffer each frame
 */

import { initDevice, createCanvas, createLoop } from '../src/core/index.js'
import { RenderPipelineBuilder, createRenderPassDescriptor } from '../src/renderer/index.js'
import { createTriangle } from '../src/geometry/index.js'
import { createShaderModule, wgsl } from '../src/shader/index.js'
import { COLOR_BLACK } from '../src/math/index.js'

// ─── Shader source ───────────────────────────────────────────────────────────

const VERTEX_SHADER = wgsl`
  struct VertexInput {
    @location(0) position : vec3f,
    @location(1) color    : vec4f,
  }

  struct VertexOutput {
    @builtin(position) position : vec4f,
    @location(0)       color    : vec4f,
  }

  @vertex
  fn vs_main(in: VertexInput) -> VertexOutput {
    var out: VertexOutput;
    out.position = vec4f(in.position, 1.0);
    out.color = in.color;
    return out;
  }
`

const FRAGMENT_SHADER = wgsl`
  @fragment
  fn fs_main(@location(0) color: vec4f) -> @location(0) vec4f {
    return color;
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

  // ─── Shaders ─────────────────────────────────────────────────────────────

  const vertexModule = createShaderModule(device, VERTEX_SHADER, '01-vertex')
  const fragmentModule = createShaderModule(device, FRAGMENT_SHADER, '01-fragment')

  // ─── Pipeline ────────────────────────────────────────────────────────────

  // Vertex layout must match the Float32Array layout in createTriangle():
  //   offset  0: vec3f position (12 bytes)
  //   offset 12: vec4f color    (16 bytes)
  //   stride = 28 bytes

  const pipeline = new RenderPipelineBuilder(device)
    .setShaders(vertexModule, fragmentModule)
    .setVertexLayout(
      [
        { shaderLocation: 0, offset: 0, format: 'float32x3' },   // position
        { shaderLocation: 1, offset: 12, format: 'float32x4' },  // color
      ],
      28 // stride in bytes
    )
    .setTargetFormat(presentationFormat)
    .build()

  // ─── Geometry ────────────────────────────────────────────────────────────

  const triangle = createTriangle(device)

  // ─── Render loop ─────────────────────────────────────────────────────────

  const loop = createLoop((_info) => {
    const encoder = device.createCommandEncoder({ label: '01-frame-encoder' })

    const pass = encoder.beginRenderPass(
      createRenderPassDescriptor({
        colorView: context.getCurrentTexture().createView(),
        clearColor: COLOR_BLACK,
      })
    )

    pass.setPipeline(pipeline)
    pass.setVertexBuffer(0, triangle.vertexBuffer)
    pass.draw(triangle.drawCount)
    pass.end()

    device.queue.submit([encoder.finish()])
  })

  loop.start()
}

main().catch(console.error)

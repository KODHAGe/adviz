/**
 * @module adviz/renderer
 *
 * WebGPU pipeline construction, render/compute pass helpers, and buffer utilities.
 *
 * @example
 * import { RenderPipelineBuilder, createRenderPassDescriptor, createVertexBuffer } from 'adviz/renderer'
 */

export {
  RenderPipelineBuilder,
  BLEND_NORMAL,
  BLEND_ALPHA_PREMULTIPLIED,
  BLEND_ADDITIVE,
} from './pipeline.js'
export type { VertexAttribute } from './pipeline.js'

export { createRenderPassDescriptor, createComputePassDescriptor } from './pass.js'
export type { RenderPassOptions, ComputePassOptions } from './pass.js'

export {
  createVertexBuffer,
  createIndexBuffer,
  createUniformBuffer,
  createStorageBuffer,
  updateBuffer,
} from './buffers.js'

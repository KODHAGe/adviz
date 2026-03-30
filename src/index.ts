/**
 * adviz — LLM-led WebGPU creative graphics framework.
 *
 * @example
 * import { initDevice, createCanvas, createLoop } from 'adviz/core'
 * import { vec3, Mat4, Color } from 'adviz/math'
 * import { RenderPipelineBuilder, createVertexBuffer } from 'adviz/renderer'
 * import { createTriangle } from 'adviz/geometry'
 * import { wgsl, createShaderModule } from 'adviz/shader'
 */

// Re-export all public modules for convenience.
export * from './core/index.js'
export * from './math/index.js'
export * from './renderer/index.js'
export * from './geometry/index.js'
export * from './shader/index.js'
export * from './scene/index.js'
export * from './animation/index.js'
export * from './input/index.js'

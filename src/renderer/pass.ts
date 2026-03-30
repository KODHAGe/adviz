import type { Color } from '../math/color.js'

/**
 * Options for a render pass.
 */
export interface RenderPassOptions {
  /** Color attachment texture view. Usually `context.getCurrentTexture().createView()`. */
  colorView: GPUTextureView
  /**
   * Clear color for the color attachment.
   * Set to `null` to load the previous contents ('load' operation).
   * Defaults to opaque black.
   */
  clearColor?: Color | null
  /** Optional depth texture view. Required if the pipeline uses depth testing. */
  depthView?: GPUTextureView
  /**
   * Clear value for the depth attachment. Defaults to 1.0 (far plane).
   */
  depthClearValue?: number
}

/**
 * Creates a GPURenderPassDescriptor from options.
 * Use with `encoder.beginRenderPass(...)`.
 *
 * @example
 * const passDesc = createRenderPassDescriptor({
 *   colorView: context.getCurrentTexture().createView(),
 *   clearColor: COLOR_BLACK,
 * })
 * const pass = encoder.beginRenderPass(passDesc)
 */
export function createRenderPassDescriptor(options: RenderPassOptions): GPURenderPassDescriptor {
  const { colorView, clearColor = null, depthView, depthClearValue = 1.0 } = options

  const colorAttachment: GPURenderPassColorAttachment = {
    view: colorView,
    loadOp: clearColor !== null ? 'clear' : 'load',
    storeOp: 'store',
    ...(clearColor !== null
      ? { clearValue: { r: clearColor.r, g: clearColor.g, b: clearColor.b, a: clearColor.a } }
      : {}),
  }

  const depthAttachment: GPURenderPassDepthStencilAttachment | undefined =
    depthView !== undefined
      ? {
          view: depthView,
          depthLoadOp: 'clear',
          depthStoreOp: 'store',
          depthClearValue,
        }
      : undefined

  return {
    colorAttachments: [colorAttachment],
    ...(depthAttachment !== undefined ? { depthStencilAttachment: depthAttachment } : {}),
  }
}

/**
 * Options for a compute pass. Currently a placeholder for future extension.
 */
export type ComputePassOptions = Record<string, never>

/**
 * Creates a GPUComputePassDescriptor.
 * Use with `encoder.beginComputePass(...)`.
 *
 * @example
 * const computePass = encoder.beginComputePass(createComputePassDescriptor())
 */
export function createComputePassDescriptor(
  _options: ComputePassOptions = {}
): GPUComputePassDescriptor {
  return {}
}

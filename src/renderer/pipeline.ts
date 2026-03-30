/**
 * Describes a single vertex attribute within a vertex buffer layout.
 */
export interface VertexAttribute {
  /** WGSL attribute location, must match `@location(N)` in the vertex shader. */
  shaderLocation: number
  /** Byte offset of this attribute within one vertex. */
  offset: number
  /** Data format. Must match the WGSL type at the corresponding `@location`. */
  format: GPUVertexFormat
}

/**
 * Builder for a GPURenderPipelineDescriptor.
 * Enforces a consistent construction pattern across the codebase.
 *
 * @example
 * const pipeline = new RenderPipelineBuilder(device)
 *   .setShaders(vertexShaderModule, fragmentShaderModule)
 *   .setVertexLayout([
 *     { shaderLocation: 0, offset: 0, format: 'float32x3' },  // position
 *     { shaderLocation: 1, offset: 12, format: 'float32x4' }, // color
 *   ], 28)
 *   .setBindGroupLayouts([bindGroupLayout])
 *   .setTargetFormat(presentationFormat)
 *   .build()
 */
export class RenderPipelineBuilder {
  private vertexModule: GPUShaderModule | null = null
  private fragmentModule: GPUShaderModule | null = null
  private vertexAttributes: VertexAttribute[] = []
  private vertexStride = 0
  private bindGroupLayouts: GPUBindGroupLayout[] = []
  private targetFormat: GPUTextureFormat = 'bgra8unorm'
  private depthFormat: GPUTextureFormat | null = null
  private topology: GPUPrimitiveTopology = 'triangle-list'
  private cullMode: GPUCullMode = 'none'
  private blendMode: GPUBlendState | null = null

  constructor(private readonly device: GPUDevice) {}

  /**
   * Sets the vertex and fragment shader modules.
   * Both are required; calling `build()` without them throws.
   */
  setShaders(vertex: GPUShaderModule, fragment: GPUShaderModule): this {
    this.vertexModule = vertex
    this.fragmentModule = fragment
    return this
  }

  /**
   * Defines the interleaved vertex buffer layout.
   *
   * @param attributes - List of vertex attributes with their locations and formats.
   * @param stride - Total byte size of one vertex (arrayStride).
   */
  setVertexLayout(attributes: VertexAttribute[], stride: number): this {
    this.vertexAttributes = attributes
    this.vertexStride = stride
    return this
  }

  /**
   * Sets the bind group layouts for the pipeline's layout.
   * Must match the `@group(N)` declarations in your WGSL shaders.
   */
  setBindGroupLayouts(layouts: GPUBindGroupLayout[]): this {
    this.bindGroupLayouts = layouts
    return this
  }

  /**
   * Sets the color attachment texture format.
   * Use `context.getCurrentTexture().format` or the canvas's preferred format.
   */
  setTargetFormat(format: GPUTextureFormat): this {
    this.targetFormat = format
    return this
  }

  /**
   * Enables depth testing with the given depth texture format.
   * Typical value: `'depth24plus'`.
   */
  setDepthFormat(format: GPUTextureFormat): this {
    this.depthFormat = format
    return this
  }

  /** Sets the primitive topology. Defaults to `'triangle-list'`. */
  setTopology(topology: GPUPrimitiveTopology): this {
    this.topology = topology
    return this
  }

  /** Sets the face culling mode. Defaults to `'none'`. */
  setCullMode(cullMode: GPUCullMode): this {
    this.cullMode = cullMode
    return this
  }

  /**
   * Sets a blend state for the first color attachment.
   * Use `BLEND_ALPHA_PREMULTIPLIED` or `BLEND_NORMAL` from this module.
   */
  setBlend(blend: GPUBlendState): this {
    this.blendMode = blend
    return this
  }

  /**
   * Compiles and returns the GPURenderPipeline.
   * Throws if vertex or fragment shader modules have not been set.
   */
  build(): GPURenderPipeline {
    if (!this.vertexModule || !this.fragmentModule) {
      throw new Error('RenderPipelineBuilder: vertex and fragment shader modules are required.')
    }

    const layout =
      this.bindGroupLayouts.length > 0
        ? this.device.createPipelineLayout({ bindGroupLayouts: this.bindGroupLayouts })
        : 'auto'

    const descriptor: GPURenderPipelineDescriptor = {
      layout,
      vertex: {
        module: this.vertexModule,
        entryPoint: 'vs_main',
        buffers:
          this.vertexAttributes.length > 0
            ? [
                {
                  arrayStride: this.vertexStride,
                  attributes: this.vertexAttributes.map((a) => ({
                    shaderLocation: a.shaderLocation,
                    offset: a.offset,
                    format: a.format,
                  })),
                },
              ]
            : [],
      },
      fragment: {
        module: this.fragmentModule,
        entryPoint: 'fs_main',
        targets: [
          {
            format: this.targetFormat,
            ...(this.blendMode !== null ? { blend: this.blendMode } : {}),
          },
        ],
      },
      primitive: {
        topology: this.topology,
        cullMode: this.cullMode,
      },
      ...(this.depthFormat !== null
        ? {
            depthStencil: {
              format: this.depthFormat,
              depthWriteEnabled: true,
              depthCompare: 'less',
            },
          }
        : {}),
    }

    return this.device.createRenderPipeline(descriptor)
  }
}

/**
 * Standard alpha blending (non-premultiplied).
 * src_color * src_alpha + dst_color * (1 - src_alpha)
 */
export const BLEND_NORMAL: GPUBlendState = {
  color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
  alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
}

/**
 * Premultiplied alpha blending.
 * Use when your texture/shader outputs premultiplied alpha values.
 */
export const BLEND_ALPHA_PREMULTIPLIED: GPUBlendState = {
  color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
  alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
}

/** Additive blending — good for glowing particles. */
export const BLEND_ADDITIVE: GPUBlendState = {
  color: { srcFactor: 'src-alpha', dstFactor: 'one', operation: 'add' },
  alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
}

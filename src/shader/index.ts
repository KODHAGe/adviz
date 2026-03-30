/**
 * Creates a GPUShaderModule from a WGSL source string.
 *
 * @param device - The WebGPU device.
 * @param code - WGSL shader source code.
 * @param label - Optional debug label (shown in browser DevTools and error messages).
 * @returns A compiled GPUShaderModule.
 *
 * @example
 * const shader = createShaderModule(device, wgsl`
 *   @vertex fn vs_main(@builtin(vertex_index) vi: u32) -> @builtin(position) vec4f {
 *     // ...
 *   }
 * `, 'my-vertex-shader')
 */
export function createShaderModule(device: GPUDevice, code: string, label?: string): GPUShaderModule {
  return device.createShaderModule({ label, code })
}

/**
 * Template tag for WGSL shader strings.
 * Provides syntax hints in editors with WGSL highlighting extensions,
 * and is a no-op at runtime.
 *
 * @example
 * const src = wgsl`
 *   @fragment fn fs_main() -> @location(0) vec4f {
 *     return vec4f(1.0, 0.5, 0.0, 1.0);
 *   }
 * `
 */
export function wgsl(strings: TemplateStringsArray, ...values: unknown[]): string {
  return strings.reduce((result, str, i) => result + str + (i < values.length ? String(values[i]) : ''), '')
}

/**
 * Creates a bind group layout entry for a uniform buffer at `binding`.
 *
 * @param binding - The `@binding(N)` index in WGSL.
 * @param visibility - Which shader stages can access this binding.
 *
 * @example
 * const layout = device.createBindGroupLayout({
 *   entries: [
 *     uniformLayoutEntry(0, GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT),
 *   ]
 * })
 */
export function uniformLayoutEntry(
  binding: number,
  visibility: GPUShaderStageFlags = GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT
): GPUBindGroupLayoutEntry {
  return {
    binding,
    visibility,
    buffer: { type: 'uniform' },
  }
}

/**
 * Creates a bind group layout entry for a read-only storage buffer at `binding`.
 *
 * @param binding - The `@binding(N)` index in WGSL.
 * @param visibility - Which shader stages can access this binding.
 */
export function storageLayoutEntry(
  binding: number,
  visibility: GPUShaderStageFlags = GPUShaderStage.COMPUTE
): GPUBindGroupLayoutEntry {
  return {
    binding,
    visibility,
    buffer: { type: 'read-only-storage' },
  }
}

/**
 * Creates a bind group layout entry for a read-write storage buffer at `binding`.
 *
 * @param binding - The `@binding(N)` index in WGSL.
 * @param visibility - Defaults to COMPUTE only (read-write storage requires compute).
 */
export function storageReadWriteLayoutEntry(
  binding: number,
  visibility: GPUShaderStageFlags = GPUShaderStage.COMPUTE
): GPUBindGroupLayoutEntry {
  return {
    binding,
    visibility,
    buffer: { type: 'storage' },
  }
}

/**
 * Creates a bind group layout entry for a texture at `binding`.
 *
 * @param binding - The `@binding(N)` index in WGSL.
 * @param visibility - Defaults to FRAGMENT.
 * @param sampleType - Texture sample type. Defaults to 'float'.
 */
export function textureLayoutEntry(
  binding: number,
  visibility: GPUShaderStageFlags = GPUShaderStage.FRAGMENT,
  sampleType: GPUTextureSampleType = 'float'
): GPUBindGroupLayoutEntry {
  return {
    binding,
    visibility,
    texture: { sampleType },
  }
}

/**
 * Creates a bind group layout entry for a sampler at `binding`.
 *
 * @param binding - The `@binding(N)` index in WGSL.
 * @param visibility - Defaults to FRAGMENT.
 */
export function samplerLayoutEntry(
  binding: number,
  visibility: GPUShaderStageFlags = GPUShaderStage.FRAGMENT
): GPUBindGroupLayoutEntry {
  return {
    binding,
    visibility,
    sampler: { type: 'filtering' },
  }
}

/**
 * Creates a GPUBindGroup from a list of resources.
 *
 * @param device - The WebGPU device.
 * @param layout - The bind group layout.
 * @param entries - Resources to bind, in the same order as the layout entries.
 * @param label - Optional debug label.
 *
 * @example
 * const bindGroup = createBindGroup(device, layout, [
 *   uniformBuffer,          // binding 0
 *   storageBuffer,          // binding 1
 * ])
 */
export function createBindGroup(
  device: GPUDevice,
  layout: GPUBindGroupLayout,
  entries: (GPUBuffer | GPUTextureView | GPUSampler)[],
  label?: string
): GPUBindGroup {
  return device.createBindGroup({
    label,
    layout,
    entries: entries.map((resource, binding) => ({
      binding,
      resource: resource instanceof GPUBuffer ? { buffer: resource } : resource,
    })),
  })
}

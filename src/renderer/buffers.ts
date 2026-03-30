/**
 * Usage flags for GPU buffers. Combines multiple GPUBufferUsage flags
 * into commonly-used presets.
 */

/**
 * Creates a vertex buffer from a Float32Array.
 * The buffer is immediately populated with `data`.
 *
 * @param device - The WebGPU device.
 * @param data - Vertex data as a Float32Array.
 * @param label - Optional debug label visible in browser DevTools.
 * @returns A GPUBuffer with VERTEX | COPY_DST usage.
 *
 * @example
 * const verts = new Float32Array([0, 0.5, 0,   -0.5, -0.5, 0,   0.5, -0.5, 0])
 * const vb = createVertexBuffer(device, verts, 'triangle-positions')
 */
export function createVertexBuffer(
  device: GPUDevice,
  data: Float32Array,
  label?: string
): GPUBuffer {
  const buffer = device.createBuffer({
    label,
    size: data.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  })
  device.queue.writeBuffer(buffer, 0, data)
  return buffer
}

/**
 * Creates an index buffer from a Uint16Array or Uint32Array.
 * The buffer is immediately populated with `data`.
 *
 * @param device - The WebGPU device.
 * @param data - Index data as Uint16Array or Uint32Array.
 * @param label - Optional debug label.
 * @returns A GPUBuffer with INDEX | COPY_DST usage.
 *
 * @example
 * const indices = new Uint16Array([0, 1, 2])
 * const ib = createIndexBuffer(device, indices, 'triangle-indices')
 */
export function createIndexBuffer(
  device: GPUDevice,
  data: Uint16Array | Uint32Array,
  label?: string
): GPUBuffer {
  const buffer = device.createBuffer({
    label,
    size: data.byteLength,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
  })
  device.queue.writeBuffer(buffer, 0, data)
  return buffer
}

/**
 * Creates a uniform buffer of the given byte size.
 *
 * @param device - The WebGPU device.
 * @param byteSize - Size in bytes. WebGPU requires uniform buffers to be a multiple of 16.
 * @param label - Optional debug label.
 * @returns A GPUBuffer with UNIFORM | COPY_DST usage.
 *
 * @example
 * const uniforms = createUniformBuffer(device, 64, 'model-matrix') // 4x4 float matrix
 */
export function createUniformBuffer(device: GPUDevice, byteSize: number, label?: string): GPUBuffer {
  const alignedSize = Math.ceil(byteSize / 16) * 16
  return device.createBuffer({
    label,
    size: alignedSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  })
}

/**
 * Creates a storage buffer, optionally with initial data.
 *
 * @param device - The WebGPU device.
 * @param byteSize - Size in bytes.
 * @param data - Optional initial data. If provided, byteSize is ignored and data.byteLength is used.
 * @param label - Optional debug label.
 * @returns A GPUBuffer with STORAGE | COPY_DST | COPY_SRC usage.
 *
 * @example
 * // Particle positions: 10000 particles × (x, y, z, w) × 4 bytes
 * const particles = createStorageBuffer(device, 10000 * 16, undefined, 'particle-positions')
 */
export function createStorageBuffer(
  device: GPUDevice,
  byteSize: number,
  data?: ArrayBuffer,
  label?: string
): GPUBuffer {
  const size = data !== undefined ? data.byteLength : byteSize
  const buffer = device.createBuffer({
    label,
    size,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
  })
  if (data !== undefined) {
    device.queue.writeBuffer(buffer, 0, data)
  }
  return buffer
}

/**
 * Writes `data` into `buffer` at `offset` bytes.
 * Convenience wrapper around `device.queue.writeBuffer`.
 *
 * @example
 * updateBuffer(device, uniformBuffer, modelMatrix.toFloat32Array())
 */
export function updateBuffer(
  device: GPUDevice,
  buffer: GPUBuffer,
  data: ArrayBuffer | Float32Array | Uint16Array | Uint32Array,
  offset = 0
): void {
  device.queue.writeBuffer(buffer, offset, data)
}

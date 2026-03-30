import { createVertexBuffer, createIndexBuffer } from '../renderer/buffers.js'

/**
 * A GPU-resident mesh: vertex buffer, optional index buffer, and draw call parameters.
 */
export interface Mesh {
  /** The vertex data buffer. */
  readonly vertexBuffer: GPUBuffer
  /** The index buffer, or null if drawing non-indexed. */
  readonly indexBuffer: GPUBuffer | null
  /** Number of indices (indexed draw) or vertices (non-indexed draw). */
  readonly drawCount: number
  /** Index format: 'uint16' or 'uint32'. Only relevant when indexBuffer is set. */
  readonly indexFormat: GPUIndexFormat
}

/**
 * Creates a full-screen quad mesh with positions [-1, 1] and UV coords [0, 1].
 *
 * Vertex layout (stride = 20 bytes):
 * - @location(0): vec2f position (offset 0)
 * - @location(1): vec2f uv       (offset 8)
 *
 * @example
 * const quad = createFullscreenQuad(device)
 * // In render pass:
 * pass.setVertexBuffer(0, quad.vertexBuffer)
 * pass.setIndexBuffer(quad.indexBuffer!, quad.indexFormat)
 * pass.drawIndexed(quad.drawCount)
 */
export function createFullscreenQuad(device: GPUDevice): Mesh {
  // prettier-ignore
  const vertices = new Float32Array([
    // x      y      u     v
    -1.0,  1.0,   0.0,  0.0,
    -1.0, -1.0,   0.0,  1.0,
     1.0, -1.0,   1.0,  1.0,
     1.0,  1.0,   1.0,  0.0,
  ])
  const indices = new Uint16Array([0, 1, 2, 0, 2, 3])
  return {
    vertexBuffer: createVertexBuffer(device, vertices, 'fullscreen-quad-vertices'),
    indexBuffer: createIndexBuffer(device, indices, 'fullscreen-quad-indices'),
    drawCount: indices.length,
    indexFormat: 'uint16',
  }
}

/**
 * Creates a triangle mesh.
 *
 * Vertex layout (stride = 28 bytes):
 * - @location(0): vec3f position (offset 0)
 * - @location(1): vec4f color    (offset 12)
 *
 * @param a - First vertex position [x, y, z].
 * @param b - Second vertex position [x, y, z].
 * @param c - Third vertex position [x, y, z].
 * @param colorA - RGBA color for vertex A. Defaults to red.
 * @param colorB - RGBA color for vertex B. Defaults to green.
 * @param colorC - RGBA color for vertex C. Defaults to blue.
 *
 * @example
 * const tri = createTriangle(device,
 *   [0, 0.5, 0], [-0.5, -0.5, 0], [0.5, -0.5, 0],
 *   [1, 0, 0, 1], [0, 1, 0, 1], [0, 0, 1, 1]
 * )
 */
export function createTriangle(
  device: GPUDevice,
  a: [number, number, number] = [0.0, 0.5, 0.0],
  b: [number, number, number] = [-0.5, -0.5, 0.0],
  c: [number, number, number] = [0.5, -0.5, 0.0],
  colorA: [number, number, number, number] = [1, 0, 0, 1],
  colorB: [number, number, number, number] = [0, 1, 0, 1],
  colorC: [number, number, number, number] = [0, 0, 1, 1]
): Mesh {
  // prettier-ignore
  const vertices = new Float32Array([
    ...a, ...colorA,
    ...b, ...colorB,
    ...c, ...colorC,
  ])
  return {
    vertexBuffer: createVertexBuffer(device, vertices, 'triangle-vertices'),
    indexBuffer: null,
    drawCount: 3,
    indexFormat: 'uint16',
  }
}

/**
 * Creates a circle mesh as a triangle fan.
 *
 * Vertex layout (stride = 28 bytes):
 * - @location(0): vec3f position (offset 0)
 * - @location(1): vec4f color    (offset 12)
 *
 * @param device - The WebGPU device.
 * @param segments - Number of triangle segments. Higher = smoother. Defaults to 64.
 * @param radius - Circle radius. Defaults to 0.5.
 * @param centerColor - RGBA color of the center vertex. Defaults to white.
 * @param edgeColor - RGBA color of edge vertices. Defaults to white.
 *
 * @example
 * const circle = createCircle(device, 128, 0.5)
 */
export function createCircle(
  device: GPUDevice,
  segments = 64,
  radius = 0.5,
  centerColor: [number, number, number, number] = [1, 1, 1, 1],
  edgeColor: [number, number, number, number] = [1, 1, 1, 1]
): Mesh {
  const floatsPerVertex = 7 // xyz + rgba
  const vertexCount = segments + 2 // center + ring + close
  const vertices = new Float32Array(vertexCount * floatsPerVertex)
  const indices = new Uint16Array(segments * 3)

  // Center vertex
  vertices.set([0, 0, 0, ...centerColor], 0)

  // Ring vertices
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2
    const x = Math.cos(angle) * radius
    const y = Math.sin(angle) * radius
    vertices.set([x, y, 0, ...edgeColor], (i + 1) * floatsPerVertex)
  }

  // Triangle indices: center (0), ring[i] (i+1), ring[i+1] (i+2)
  for (let i = 0; i < segments; i++) {
    indices[i * 3] = 0
    indices[i * 3 + 1] = i + 1
    indices[i * 3 + 2] = i + 2
  }

  return {
    vertexBuffer: createVertexBuffer(device, vertices, 'circle-vertices'),
    indexBuffer: createIndexBuffer(device, indices, 'circle-indices'),
    drawCount: indices.length,
    indexFormat: 'uint16',
  }
}

# Geometry Expert Agent

You are creating GPU geometry and vertex buffer layouts for the **adviz** WebGPU creative graphics framework.

## Core type: Mesh
```ts
interface Mesh {
  vertexBuffer: GPUBuffer    // VERTEX | COPY_DST
  indexBuffer: GPUBuffer | null
  drawCount: number          // indices if indexed, vertices if not
  indexFormat: GPUIndexFormat
}
```

## Vertex buffer creation
Use `createVertexBuffer(device, float32Array, label)` from `src/renderer/buffers.ts`.
- Always pass a label for DevTools debugging.
- Data must be a `Float32Array`.
- Layout (stride, offsets) must exactly match the `@location(N)` attributes in the vertex shader.

## Standard vertex layouts in this project

| Layout name | Attributes | Stride |
|---|---|---|
| Position-only (2D) | `vec2f pos` | 8 bytes |
| Position-only (3D) | `vec3f pos` | 12 bytes |
| Position + Color | `vec3f pos, vec4f color` | 28 bytes |
| Position + UV | `vec2f pos, vec2f uv` | 16 bytes |
| Position + Normal + UV | `vec3f pos, vec3f normal, vec2f uv` | 32 bytes |

## Index buffers
- Use `Uint16Array` (max 65,535 vertices) for most geometry.
- Use `Uint32Array` only when vertex count exceeds 65,535.
- Pass `indexFormat: 'uint16'` or `'uint32'` in the Mesh object.

## Primitive constructors pattern
All primitive constructors in `src/geometry/primitives.ts` follow this signature:
```ts
export function createXxx(device: GPUDevice, ...params, label?: string): Mesh
```
- Takes device as first arg.
- Returns a `Mesh`.
- Allocates GPU buffers immediately.
- Caller is responsible for calling `.destroy()` on the buffers when done.

## Float32Array layout example (position + color, stride 28)
```ts
const vertices = new Float32Array([
  // px    py    pz    r     g     b     a
  0.0,  0.5, 0.0,  1.0, 0.0, 0.0, 1.0,  // vertex 0
 -0.5, -0.5, 0.0,  0.0, 1.0, 0.0, 1.0,  // vertex 1
  0.5, -0.5, 0.0,  0.0, 0.0, 1.0, 1.0,  // vertex 2
])
```

## Particle / instance geometry
For particle systems and instance rendering:
- Store particle data (position, velocity, color) in a **storage buffer** — not a vertex buffer.
- Access it in the vertex shader via `@group(0) @binding(0) var<storage, read> particles: array<Particle>`.
- Use `@builtin(vertex_index)` or `@builtin(instance_index)` to index into the storage buffer.
- See `examples/02-particles-compute.ts` for the canonical pattern.

# adviz — GitHub Copilot Instructions

adviz is a **WebGPU creative graphics framework** designed to be read, written, and modified by LLMs. All code is TypeScript strict mode. No external runtime dependencies. Rendering target is WebGPU (WGSL only — no GLSL, no WebGL fallback).

---

## Architecture

```
src/
  core/       device init, canvas, RAF loop
  math/       Vec2/3/4, Mat4, Color, scalar utils — zero deps
  renderer/   pipeline builder, render/compute passes, buffer helpers
  geometry/   GPU mesh primitives (triangle, circle, fullscreen quad)
  shader/     WGSL loading, uniform/storage bind group helpers
  scene/      scene nodes with TRS transforms
  animation/  easing functions, tween()
  input/      pointer and keyboard state trackers
examples/     one self-contained .ts file per concept — the primary API docs
```

Each module has a flat `index.ts` that exports everything public. Import from the module name, not deep paths:
```ts
import { vec3, Mat4 } from '../src/math/index.js'          // ✅
import { Vec3 } from '../src/math/vec3.js'                   // ✅ (internal cross-module)
import { Vec3 } from '../src/math/vec3.js' // from outside  // ❌ use module index
```

---

## API naming conventions

| Pattern | Description |
|---|---|
| `create*()` | Allocates and returns a new resource (buffer, canvas, loop, mesh) |
| `update*()` | Mutates or re-uploads an existing resource |
| `destroy*()` | Tears down and frees a resource |
| `init*()` | Async setup that must complete before use (e.g. `initDevice`) |
| `*Builder` | Class with chainable methods ending in `.build()` |
| `*Options` | Interface for optional parameters |
| `*State` | Interface for mutable runtime state |
| `*Fn` | Function type alias |

All public API functions and types are exported from their module's `index.ts`.

---

## WebGPU patterns

### Device init
Always call `initDevice()` before anything else. It returns `{ adapter, device, adapterInfo }`.

### Shader entry points
Always name entry points `vs_main`, `fs_main`, `cs_main` — this is what `RenderPipelineBuilder` and compute pipelines expect.

### Vertex layout (must match shader `@location(N)`)
Describe vertex attributes explicitly. Stride = sum of all attribute byte sizes:
```ts
.setVertexLayout([
  { shaderLocation: 0, offset: 0,  format: 'float32x3' }, // position (12 bytes)
  { shaderLocation: 1, offset: 12, format: 'float32x4' }, // color    (16 bytes)
], 28) // stride
```

### Bind groups
Create bind group layouts with the helper functions in `src/shader/index.ts`:
- `uniformLayoutEntry(binding, visibility)`
- `storageLayoutEntry(binding, visibility)`           — read-only
- `storageReadWriteLayoutEntry(binding, visibility)`  — read-write (compute only)
- `textureLayoutEntry(binding, visibility)`
- `samplerLayoutEntry(binding, visibility)`

Then create the bind group with `createBindGroup(device, layout, [buffer0, buffer1, ...])`.
Resources are bound in array index order (index 0 → binding 0, etc.).

### Uniform buffer alignment
Uniform buffers must be a multiple of 16 bytes. `createUniformBuffer()` handles alignment automatically.

### Command encoder pattern
```ts
const encoder = device.createCommandEncoder({ label: 'frame' })
// compute pass (if any) — before render pass
const compute = encoder.beginComputePass()
// ...
compute.end()
// render pass
const pass = encoder.beginRenderPass(createRenderPassDescriptor({ colorView, clearColor }))
// ...
pass.end()
device.queue.submit([encoder.finish()])
```

---

## WGSL conventions

- Use the `wgsl` template tag for all shader source strings (enables editor highlighting).
- Group declarations: `@group(0) @binding(0)` for per-frame, `@group(1)` for per-object.
- Struct fields match buffer layout exactly — mind alignment rules (vec3f is padded to 16 bytes in WGSL).
- Always guard compute shaders: `if (id.x >= arrayLength(&buffer)) { return; }`
- Use named structs for vertex inputs/outputs — never use positional `@location` parameters directly.

---

## TypeScript rules

- `strict: true` + `noUncheckedIndexedAccess: true` — always check array access with `?? fallback`.
- No `any`. No `as unknown as T` casts without a comment explaining why.
- All types exported from `index.ts`. Use `export type` for pure type exports.
- JSDoc with `@example` on every public function and class.
- Prefer `readonly` for interface properties that shouldn't be mutated externally.

---

## Examples as pattern library

The `examples/` directory is the **primary API documentation**. Before writing new framework code:
1. Check if an example demonstrates the relevant pattern.
2. New features require a new example file before or alongside implementation.
3. Examples are self-contained — no shared utilities between example files.

Pattern reference:
- `01-hello-triangle.ts` — minimal render pipeline (vertex + fragment)
- `02-particles-compute.ts` — compute + render pipeline, storage buffers, 100k particles

---

## Math module

All math types produce `Float32Array` via `.toFloat32Array()` for direct GPU upload.
Constants use `SCREAMING_SNAKE_CASE`: `VEC3_UP`, `VEC3_ZERO`, `COLOR_BLACK`, etc.
All operations are **immutable** — methods return new instances.

---

## Build and test

```bash
pnpm typecheck        # tsc --noEmit (fastest type check)
pnpm test             # vitest run (all tests)
pnpm test:single      # vitest run --reporter=verbose (single run, verbose)
pnpm build            # vite build (library output to dist/)
pnpm lint             # eslint
pnpm docs             # typedoc → docs/api/
```

To run a single test file:
```bash
pnpm vitest run src/math/vec3.test.ts
```

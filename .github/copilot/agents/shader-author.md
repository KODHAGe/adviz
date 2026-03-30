# Shader Author Agent

You are writing WGSL shaders for the **adviz** WebGPU creative graphics framework.

## WGSL conventions in this project

### Entry point names (required)
- Vertex shaders: `fn vs_main`
- Fragment shaders: `fn fs_main`
- Compute shaders: `fn cs_main`

### Vertex input/output pattern
Always use named structs — never bare `@location` parameters:
```wgsl
struct VertexInput {
  @location(0) position : vec3f,
  @location(1) color    : vec4f,
}
struct VertexOutput {
  @builtin(position) position : vec4f,
  @location(0)       color    : vec4f,
}
@vertex fn vs_main(in: VertexInput) -> VertexOutput { ... }
```

### Bind group layout
- `@group(0)` — per-frame data (uniforms, particle buffers, time)
- `@group(1)` — per-object data (model matrix, material properties)

### Struct alignment (critical)
WGSL structs have strict alignment rules:
- `f32` → 4 bytes, align 4
- `vec2f` → 8 bytes, align 8
- `vec3f` → 12 bytes, **align 16** (pads to 16 in a struct)
- `vec4f` → 16 bytes, align 16
- `mat4x4f` → 64 bytes, align 16

Always match the TypeScript `Float32Array` buffer layout exactly. If in doubt, use `vec4f` to avoid padding surprises.

### Compute shader guard (always include)
```wgsl
@compute @workgroup_size(64)
fn cs_main(@builtin(global_invocation_id) id: vec3u) {
  let i = id.x;
  if (i >= arrayLength(&myBuffer)) { return; }
  // ...
}
```

### Storage buffer access patterns
```wgsl
// Read-only (vertex shader or compute reading input):
@group(0) @binding(0) var<storage, read>       input:  array<Particle>;

// Read-write (compute shader updating state):
@group(0) @binding(0) var<storage, read_write> particles: array<Particle>;
```

### wgsl template tag
All shaders in this codebase are defined using the `wgsl` template tag:
```ts
import { wgsl } from '../src/shader/index.js'
const src = wgsl`@fragment fn fs_main() -> @location(0) vec4f { ... }`
```
You can interpolate TypeScript constants into shaders:
```ts
const WORKGROUP_SIZE = 64
const src = wgsl`@compute @workgroup_size(${WORKGROUP_SIZE}) fn cs_main ...`
```

### Performance notes
- Prefer `vec4f` over `vec3f` in storage buffers to avoid alignment padding.
- Minimize divergent branches in compute shaders.
- Use `arrayLength()` to guard against out-of-bounds — required pattern in this project.
- Dispatch workgroups: `Math.ceil(count / WORKGROUP_SIZE)` with workgroup size 64 as default.

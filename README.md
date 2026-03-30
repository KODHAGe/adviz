# adviz

High-performance WebGPU creative graphics framework designed for LLM-led development.

Think **openFrameworks for the web** — but with an API surface built to be trivially readable and writable by LLMs.

## Requirements

- Browser with WebGPU support (Chrome 113+, Edge 113+, Safari 18+)
- Node 22+, pnpm 10+

## Quick start

```ts
import { initDevice, createCanvas, createLoop } from 'adviz/core'
import { RenderPipelineBuilder, createRenderPassDescriptor } from 'adviz/renderer'
import { createTriangle } from 'adviz/geometry'
import { createShaderModule, wgsl } from 'adviz/shader'
import { COLOR_BLACK } from 'adviz/math'

const { device } = await initDevice()
const canvas = createCanvas()
const context = canvas.element.getContext('webgpu')!
context.configure({ device, format: navigator.gpu.getPreferredCanvasFormat() })

// See examples/01-hello-triangle.ts for the full pattern
```

## Examples

| File | Demonstrates |
|---|---|
| `examples/01-hello-triangle.ts` | Minimal render pipeline |
| `examples/02-particles-compute.ts` | Compute shader, 100k GPU particles |

## Commands

```bash
pnpm typecheck        # type check (no emit)
pnpm test             # vitest run
pnpm test:single      # verbose single run
pnpm build            # library build → dist/
pnpm lint             # eslint
pnpm docs             # typedoc → docs/api/
```

Run a single test file:
```bash
pnpm vitest run src/math/vec3.test.ts
```

## Modules

| Import | Contents |
|---|---|
| `adviz/core` | `initDevice`, `createCanvas`, `createLoop` |
| `adviz/math` | `Vec2/3/4`, `Mat4`, `Color`, scalar utils |
| `adviz/renderer` | `RenderPipelineBuilder`, buffer helpers, pass helpers |
| `adviz/geometry` | `createTriangle`, `createCircle`, `createFullscreenQuad` |
| `adviz/shader` | `wgsl`, `createShaderModule`, bind group layout helpers |
| `adviz/scene` | `createNode` (TRS transforms) |
| `adviz/animation` | easing functions, `tween()` |
| `adviz/input` | `createPointerTracker`, `createKeyboardTracker` |

## Agent network

`.github/copilot-instructions.md` — global Copilot context  
`.github/copilot/agents/shader-author.md` — WGSL shader generation  
`.github/copilot/agents/geometry-expert.md` — vertex buffers and mesh layout  
`.github/copilot/agents/api-designer.md` — API consistency rules  
`.github/workflows/copilot-review.yml` — automated PR review  

## Design decisions

- **WebGPU only** — no WebGL fallback; ship when your target supports WebGPU.
- **WGSL only** — no GLSL transpilation.
- **No runtime dependencies** — pure TypeScript, zero npm dependencies at runtime.
- **Examples-first** — new features require an example before merging.

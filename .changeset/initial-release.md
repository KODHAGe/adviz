---
"adviz": minor
---

Initial release — WebGPU creative graphics framework.

Features:
- Math module: Vec2, Vec3, Vec4, Mat4, Color, utilities
- Core module: WebGPU device initialisation, canvas setup, RAF loop
- Renderer module: chainable `RenderPipelineBuilder`, render pass helpers, buffer utilities
- Shader module: `wgsl` template tag, bind group layout helpers
- Geometry module: triangle, circle, fullscreen-quad primitives
- Scene module: transform–rotation–scale scene node with Mat4 output
- Animation module: easing functions, `tween()` helper
- Input module: pointer and keyboard trackers
- GPU particle demo (100 000 particles, compute shaders, 5 interaction modes)
- GitHub Copilot agent network config for LLM-led development

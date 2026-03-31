import { defineConfig } from 'vitest/config'
import { resolve } from 'path'
import dts from 'vite-plugin-dts'

const isDemoMode = process.env['VITE_MODE'] === 'demo'

export default defineConfig(
  isDemoMode
    ? // ── Demo app (pnpm dev / pnpm preview) ──────────────────────────────
      {
        root: 'demo',
        base: './',
        build: {
          outDir: resolve(__dirname, 'dist-demo'),
          emptyOutDir: true,
        },
        test: {
          environment: 'jsdom',
          include: ['../src/**/*.test.ts'],
          coverage: { provider: 'v8', reporter: ['text', 'html'] },
        },
      }
    : // ── Library build (pnpm build) ────────────────────────────────────
      {
        plugins: [
          dts({
            include: ['src'],
            exclude: ['src/**/*.test.ts'],
            outDir: 'dist',
            tsconfigPath: './tsconfig.json',
            insertTypesEntry: false,
          }),
        ],
        build: {
          lib: {
            entry: {
              index: resolve(__dirname, 'src/index.ts'),
              core: resolve(__dirname, 'src/core/index.ts'),
              math: resolve(__dirname, 'src/math/index.ts'),
              renderer: resolve(__dirname, 'src/renderer/index.ts'),
              geometry: resolve(__dirname, 'src/geometry/index.ts'),
              shader: resolve(__dirname, 'src/shader/index.ts'),
              scene: resolve(__dirname, 'src/scene/index.ts'),
              animation: resolve(__dirname, 'src/animation/index.ts'),
              input: resolve(__dirname, 'src/input/index.ts'),
            },
            formats: ['es'],
          },
          rollupOptions: {
            external: [],
          },
          target: 'es2022',
        },
        test: {
          environment: 'jsdom',
          include: ['src/**/*.test.ts'],
          coverage: { provider: 'v8', reporter: ['text', 'html'] },
        },
      }
)

/**
 * @module adviz/core
 *
 * WebGPU device initialization, canvas management, and the animation loop.
 *
 * @example
 * import { initDevice, createCanvas, createLoop } from 'adviz/core'
 *
 * const { device } = await initDevice()
 * const canvas = createCanvas()
 * const loop = createLoop((info) => {
 *   // render frame using info.elapsed, info.delta
 * })
 * loop.start()
 */

export { initDevice } from './device.js'
export type { DeviceOptions, DeviceContext } from './device.js'

export { createCanvas } from './canvas.js'
export type { CanvasOptions, ManagedCanvas, ResizeCallback } from './canvas.js'

export { createLoop } from './loop.js'
export type { FrameInfo, FrameCallback, Loop } from './loop.js'

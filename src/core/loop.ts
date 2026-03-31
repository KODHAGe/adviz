/** Snapshot of frame timing provided to every frame callback. */
export interface FrameInfo {
  /** Time in milliseconds since the first frame. */
  readonly elapsed: number
  /** Time in milliseconds since the previous frame. */
  readonly delta: number
  /** Frame counter, starting at 0. */
  readonly frame: number
}

/** Callback invoked every animation frame. */
export type FrameCallback = (info: FrameInfo) => void

/**
 * Manages the requestAnimationFrame loop with delta time and elapsed time tracking.
 *
 * @example
 * const loop = createLoop((info) => {
 *   console.log(`frame ${info.frame}, delta ${info.delta}ms`)
 * })
 * loop.start()
 * // later:
 * loop.stop()
 */
export interface Loop {
  /** Starts the loop. Safe to call multiple times — only one loop runs at a time. */
  start(): void
  /** Stops the loop. */
  stop(): void
  /** Whether the loop is currently running. */
  readonly running: boolean
}

/**
 * Creates an animation loop that calls `callback` every frame.
 *
 * @param callback - Called every frame with timing information.
 * @returns A Loop controller.
 *
 * @example
 * const loop = createLoop((info) => {
 *   device.queue.writeBuffer(uniformBuffer, 0, new Float32Array([info.elapsed / 1000]))
 *   // ... render
 * })
 * loop.start()
 */
export function createLoop(callback: FrameCallback): Loop {
  let rafId: number | null = null
  let startTime: number | null = null
  let prevTime: number | null = null
  let frameCount = 0

  function tick(now: number): void {
    startTime ??= now
    prevTime ??= now
    const elapsed = now - startTime
    const delta = now - prevTime
    prevTime = now

    callback({ elapsed, delta, frame: frameCount })
    frameCount++
    rafId = requestAnimationFrame(tick)
  }

  return {
    start(): void {
      if (rafId !== null) return
      rafId = requestAnimationFrame(tick)
    },
    stop(): void {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
    },
    get running(): boolean {
      return rafId !== null
    },
  }
}

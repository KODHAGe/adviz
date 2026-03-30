/**
 * Options for canvas creation and setup.
 */
export interface CanvasOptions {
  /**
   * Parent element to append the canvas to. Defaults to `document.body`.
   */
  container?: HTMLElement
  /**
   * Initial pixel width. Defaults to the container's clientWidth or window.innerWidth.
   */
  width?: number
  /**
   * Initial pixel height. Defaults to the container's clientHeight or window.innerHeight.
   */
  height?: number
  /**
   * Device pixel ratio multiplier. Defaults to `window.devicePixelRatio`.
   * Use `1` to force 1:1 pixel mapping regardless of display DPI.
   */
  pixelRatio?: number
  /**
   * If true, the canvas automatically resizes when the container resizes.
   * Defaults to true.
   */
  autoResize?: boolean
}

/** Callback invoked when the canvas is resized. */
export type ResizeCallback = (width: number, height: number, pixelRatio: number) => void

/**
 * A managed canvas with device-pixel-ratio awareness and optional auto-resize.
 */
export interface ManagedCanvas {
  /** The underlying HTMLCanvasElement. */
  readonly element: HTMLCanvasElement
  /** Current logical width in CSS pixels. */
  readonly width: number
  /** Current logical height in CSS pixels. */
  readonly height: number
  /** Device pixel ratio in use. */
  readonly pixelRatio: number
  /** Physical width in device pixels (width * pixelRatio). */
  readonly physicalWidth: number
  /** Physical height in device pixels (height * pixelRatio). */
  readonly physicalHeight: number
  /**
   * Registers a callback to be invoked when the canvas resizes.
   * Returns a cleanup function that removes the callback.
   */
  onResize(callback: ResizeCallback): () => void
  /** Removes the canvas from the DOM and stops observing resize events. */
  destroy(): void
}

/**
 * Creates and mounts a canvas element, configured for WebGPU rendering.
 * Handles device pixel ratio and optional auto-resize via ResizeObserver.
 *
 * @example
 * const canvas = createCanvas({ container: document.getElementById('app')! })
 * canvas.onResize((w, h) => {
 *   // reconfigure WebGPU swap chain
 * })
 *
 * // Get the GPUCanvasContext:
 * const ctx = canvas.element.getContext('webgpu')!
 */
export function createCanvas(options: CanvasOptions = {}): ManagedCanvas {
  const {
    container = document.body,
    pixelRatio = window.devicePixelRatio,
    autoResize = true,
  } = options

  const element = document.createElement('canvas')
  element.style.display = 'block'
  element.style.width = '100%'
  element.style.height = '100%'
  container.appendChild(element)

  let width = options.width ?? (container.clientWidth || window.innerWidth)
  let height = options.height ?? (container.clientHeight || window.innerHeight)

  const resizeCallbacks = new Set<ResizeCallback>()

  function applySize(w: number, h: number): void {
    width = w
    height = h
    element.width = Math.round(w * pixelRatio)
    element.height = Math.round(h * pixelRatio)
    resizeCallbacks.forEach((cb) => cb(w, h, pixelRatio))
  }

  applySize(width, height)

  let observer: ResizeObserver | null = null
  if (autoResize) {
    observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const rect = entry.contentRect
        applySize(rect.width, rect.height)
      }
    })
    observer.observe(container)
  }

  return {
    get element() {
      return element
    },
    get width() {
      return width
    },
    get height() {
      return height
    },
    get pixelRatio() {
      return pixelRatio
    },
    get physicalWidth() {
      return Math.round(width * pixelRatio)
    },
    get physicalHeight() {
      return Math.round(height * pixelRatio)
    },
    onResize(callback: ResizeCallback) {
      resizeCallbacks.add(callback)
      return () => resizeCallbacks.delete(callback)
    },
    destroy() {
      observer?.disconnect()
      element.remove()
    },
  }
}

/**
 * @module adviz/input
 *
 * Normalized mouse, keyboard, and pointer input.
 */

import type { Vec2 } from '../math/vec2.js'
import { vec2 } from '../math/vec2.js'

/** Current state of the mouse/pointer. */
export interface PointerState {
  /** Current pointer position in CSS pixels. */
  position: Vec2
  /** Pointer position normalized to [0, 1] based on element size. */
  uv: Vec2
  /** True if any pointer button is currently pressed. */
  pressed: boolean
}

/** Set of currently pressed keyboard keys (using `event.code`). */
export type KeyState = ReadonlySet<string>

/**
 * Creates a pointer state tracker attached to a given element.
 * Returns the current state object (updated in place) and a cleanup function.
 *
 * @example
 * const { state: pointer, destroy } = createPointerTracker(canvas.element)
 * // In frame callback:
 * if (pointer.pressed) {
 *   console.log('Dragging at', pointer.position)
 * }
 */
export function createPointerTracker(element: HTMLElement): {
  state: PointerState
  destroy: () => void
} {
  const state: PointerState = {
    position: vec2(0, 0),
    uv: vec2(0, 0),
    pressed: false,
  }

  function updatePosition(e: PointerEvent): void {
    const rect = element.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    state.position = vec2(x, y)
    state.uv = vec2(x / rect.width, y / rect.height)
  }

  function onPointerMove(e: PointerEvent): void { updatePosition(e) }
  function onPointerDown(e: PointerEvent): void { state.pressed = true; updatePosition(e) }
  function onPointerUp(_e: PointerEvent): void { state.pressed = false }

  element.addEventListener('pointermove', onPointerMove)
  element.addEventListener('pointerdown', onPointerDown)
  element.addEventListener('pointerup', onPointerUp)
  element.addEventListener('pointerleave', onPointerUp)

  return {
    state,
    destroy() {
      element.removeEventListener('pointermove', onPointerMove)
      element.removeEventListener('pointerdown', onPointerDown)
      element.removeEventListener('pointerup', onPointerUp)
      element.removeEventListener('pointerleave', onPointerUp)
    },
  }
}

/**
 * Creates a keyboard state tracker (tracks currently held keys by `event.code`).
 * Returns the current key set and a cleanup function.
 *
 * @example
 * const { keys, destroy } = createKeyboardTracker()
 * // In frame callback:
 * if (keys.has('Space')) { ... }
 * if (keys.has('ArrowLeft')) { ... }
 */
export function createKeyboardTracker(): { keys: KeyState; destroy: () => void } {
  const held = new Set<string>()

  function onKeyDown(e: KeyboardEvent): void { held.add(e.code) }
  function onKeyUp(e: KeyboardEvent): void { held.delete(e.code) }

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)

  return {
    keys: held,
    destroy() {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    },
  }
}

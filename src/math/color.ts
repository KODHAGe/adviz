/**
 * RGBA color with float components in [0, 1].
 *
 * @example
 * const red = color(1, 0, 0)           // opaque red
 * const halfBlue = color(0, 0, 1, 0.5) // semi-transparent blue
 * const fromHex = Color.fromHex('#ff6600')
 */
export class Color {
  constructor(
    public r: number,
    public g: number,
    public b: number,
    public a = 1
  ) {}

  /**
   * Creates a Color from a CSS hex string.
   * Supports #RGB, #RGBA, #RRGGBB, #RRGGBBAA.
   *
   * @example
   * const orange = Color.fromHex('#ff6600')
   */
  static fromHex(hex: string): Color {
    const h = hex.replace('#', '')
    if (h.length === 3) {
      const c0 = h.charAt(0), c1 = h.charAt(1), c2 = h.charAt(2)
      return new Color(parseInt(c0 + c0, 16) / 255, parseInt(c1 + c1, 16) / 255, parseInt(c2 + c2, 16) / 255)
    }
    if (h.length === 4) {
      const c0 = h.charAt(0), c1 = h.charAt(1), c2 = h.charAt(2), c3 = h.charAt(3)
      return new Color(parseInt(c0 + c0, 16) / 255, parseInt(c1 + c1, 16) / 255, parseInt(c2 + c2, 16) / 255, parseInt(c3 + c3, 16) / 255)
    }
    if (h.length === 6) {
      const r = parseInt(h.slice(0, 2), 16) / 255
      const g = parseInt(h.slice(2, 4), 16) / 255
      const b = parseInt(h.slice(4, 6), 16) / 255
      return new Color(r, g, b)
    }
    if (h.length === 8) {
      const r = parseInt(h.slice(0, 2), 16) / 255
      const g = parseInt(h.slice(2, 4), 16) / 255
      const b = parseInt(h.slice(4, 6), 16) / 255
      const a = parseInt(h.slice(6, 8), 16) / 255
      return new Color(r, g, b, a)
    }
    throw new Error(`Invalid hex color: ${hex}`)
  }

  /**
   * Creates a Color from HSL values.
   * @param h - Hue in [0, 360].
   * @param s - Saturation in [0, 1].
   * @param l - Lightness in [0, 1].
   * @param a - Alpha in [0, 1].
   */
  static fromHSL(h: number, s: number, l: number, a = 1): Color {
    const hue = h / 360
    if (s === 0) return new Color(l, l, l, a)
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    return new Color(hue2rgb(p, q, hue + 1 / 3), hue2rgb(p, q, hue), hue2rgb(p, q, hue - 1 / 3), a)
  }

  /** Returns a new Color linearly interpolated between this and `other` by `t` (0–1). */
  lerp(other: Color, t: number): Color {
    return new Color(
      this.r + (other.r - this.r) * t,
      this.g + (other.g - this.g) * t,
      this.b + (other.b - this.b) * t,
      this.a + (other.a - this.a) * t
    )
  }

  /** Returns a new Color with the alpha value set. */
  withAlpha(a: number): Color {
    return new Color(this.r, this.g, this.b, a)
  }

  /** Returns a flat [r, g, b, a] Float32Array for GPU upload. */
  toFloat32Array(): Float32Array {
    return new Float32Array([this.r, this.g, this.b, this.a])
  }

  /** Returns a CSS rgba() string. */
  toCSSString(): string {
    const r = String(Math.round(this.r * 255))
    const g = String(Math.round(this.g * 255))
    const b = String(Math.round(this.b * 255))
    const a = String(this.a)
    return `rgba(${r}, ${g}, ${b}, ${a})`
  }

  /** Returns a copy of this Color. */
  clone(): Color {
    return new Color(this.r, this.g, this.b, this.a)
  }

  toString(): string {
    return `Color(${String(this.r)}, ${String(this.g)}, ${String(this.b)}, ${String(this.a)})`
  }
}

function hue2rgb(p: number, q: number, t: number): number {
  let h = t
  if (h < 0) h += 1
  if (h > 1) h -= 1
  if (h < 1 / 6) return p + (q - p) * 6 * h
  if (h < 1 / 2) return q
  if (h < 2 / 3) return p + (q - p) * (2 / 3 - h) * 6
  return p
}

/**
 * Constructs a Color with float RGBA components.
 *
 * @example
 * const c = color(1, 0, 0)       // red
 * const c2 = color(1, 0, 0, 0.5) // semi-transparent red
 */
export function color(r: number, g: number, b: number, a = 1): Color {
  return new Color(r, g, b, a)
}

/** Opaque white. */
export const COLOR_WHITE: Readonly<Color> = Object.freeze(new Color(1, 1, 1, 1))

/** Opaque black. */
export const COLOR_BLACK: Readonly<Color> = Object.freeze(new Color(0, 0, 0, 1))

/** Fully transparent. */
export const COLOR_TRANSPARENT: Readonly<Color> = Object.freeze(new Color(0, 0, 0, 0))

/** Opaque red. */
export const COLOR_RED: Readonly<Color> = Object.freeze(new Color(1, 0, 0, 1))

/** Opaque green. */
export const COLOR_GREEN: Readonly<Color> = Object.freeze(new Color(0, 1, 0, 1))

/** Opaque blue. */
export const COLOR_BLUE: Readonly<Color> = Object.freeze(new Color(0, 0, 1, 1))

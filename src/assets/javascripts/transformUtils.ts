// TransformUtils.ts

export type Point = { x: number, y: number }

export class Transform2D {
  a: number // Scale X

  b: number // Shear Y

  c: number // Shear X

  d: number // Scale Y

  e: number // Translate X

  f: number // Translate Y

  constructor(a = 1, b = 0, c = 0, d = 1, e = 0, f = 0) {
    this.a = a
    this.b = b
    this.c = c
    this.d = d
    this.e = e
    this.f = f
  }

  static translation(tx: number, ty: number): Transform2D {
    return new Transform2D(1, 0, 0, 1, tx, ty)
  }

  static scale(sx: number, sy: number = sx): Transform2D {
    return new Transform2D(sx, 0, 0, sy, 0, 0)
  }

  multiply(other: Transform2D): Transform2D {
    const a = this.a * other.a + this.c * other.b
    const b = this.b * other.a + this.d * other.b
    const c = this.a * other.c + this.c * other.d
    const d = this.b * other.c + this.d * other.d
    const e = this.a * other.e + this.c * other.f + this.e
    const f = this.b * other.e + this.d * other.f + this.f
    return new Transform2D(a, b, c, d, e, f)
  }

  apply(point: Point): Point {
    return {
      x: this.a * point.x + this.c * point.y + this.e,
      y: this.b * point.x + this.d * point.y + this.f,
    }
  }

  toCSSMatrix(): string {
    return `matrix(${this.a}, ${this.b}, ${this.c}, ${this.d}, ${this.e}, ${this.f})`
  }
}

// Utility Functions for Clamping and Randomization
export const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value))
}

export const lerp = (start: number, end: number, t: number): number => {
  return start + (end - start) * t
}

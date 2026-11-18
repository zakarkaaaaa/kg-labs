import type { Point, Rect } from './types.ts'

export const OUTCODE = {
  INSIDE: 0,
  LEFT: 1,
  RIGHT: 2,
  BOTTOM: 4,
  TOP: 8,
} as const

export const EPS = 1e-9

export function computeOutcode(p: Point, rect: Rect): number {
  let code = OUTCODE.INSIDE
  if (p.x < rect.xmin - EPS) code |= OUTCODE.LEFT
  else if (p.x > rect.xmax + EPS) code |= OUTCODE.RIGHT
  if (p.y < rect.ymin - EPS) code |= OUTCODE.BOTTOM
  else if (p.y > rect.ymax + EPS) code |= OUTCODE.TOP
  return code
}

export function formatOutcode(code: number): string {
  return code.toString(2).padStart(4, '0')
}

export function normalizeRect(rect: Rect): Rect {
  return {
    xmin: Math.min(rect.xmin, rect.xmax),
    ymin: Math.min(rect.ymin, rect.ymax),
    xmax: Math.max(rect.xmin, rect.xmax),
    ymax: Math.max(rect.ymin, rect.ymax),
  }
}

export function rectToPolygon(rect: Rect): Point[] {
  const r = normalizeRect(rect)
  return [
    { x: r.xmin, y: r.ymin },
    { x: r.xmax, y: r.ymin },
    { x: r.xmax, y: r.ymax },
    { x: r.xmin, y: r.ymax },
  ]
}

export function signedPolygonArea(poly: Point[]): number {
  if (poly.length < 3) return 0
  let area = 0
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    area += a.x * b.y - b.x * a.y
  }
  return area / 2
}

export function ensureCCW(poly: Point[]): Point[] {
  if (poly.length < 3) return [...poly]
  return signedPolygonArea(poly) < 0 ? [...poly].reverse() : [...poly]
}

export function isConvexPolygon(poly: Point[]): boolean {
  if (poly.length < 3) return false
  let sign = 0
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    const c = poly[(i + 2) % poly.length]
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x)
    if (Math.abs(cross) > 1e-7) {
      const s = cross > 0 ? 1 : -1
      if (sign === 0) sign = s
      else if (sign !== s) return false
    }
  }
  return sign !== 0
}

export function pointsEqual(a: Point, b: Point, eps = 1e-6): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) <= eps
}

export function fmtNum(v: number, digits = 2): string {
  const rounded = Math.abs(v) < 1e-9 ? 0 : v
  return Number(rounded.toFixed(digits)).toString()
}

export function fmtPt(p: Point, digits = 2): string {
  return `(${fmtNum(p.x, digits)}; ${fmtNum(p.y, digits)})`
}

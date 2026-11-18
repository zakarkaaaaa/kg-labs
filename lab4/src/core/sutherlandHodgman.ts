import {
  ensureCCW,
  fmtPt,
  isConvexPolygon,
  pointsEqual,
} from './geometry.ts'
import type { ClipStep, Point, PolygonClipResult } from './types.ts'

function isInsideEdge(p: Point, a: Point, b: Point): boolean {
  // CCW edge A -> B: interior is on the left (cross >= 0)
  return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x) >= -1e-9
}

function intersectSegmentWithLine(s: Point, e: Point, a: Point, b: Point): Point {
  const dcX = a.x - b.x
  const dcY = a.y - b.y
  const dpX = s.x - e.x
  const dpY = s.y - e.y
  const n1 = a.x * b.y - a.y * b.x
  const n2 = s.x * e.y - s.y * e.x
  const denom = dcX * dpY - dcY * dpX
  if (Math.abs(denom) < 1e-12) {
    return { x: (s.x + e.x) / 2, y: (s.y + e.y) / 2 }
  }
  return {
    x: (n1 * dpX - n2 * dcX) / denom,
    y: (n1 * dpY - n2 * dcY) / denom,
  }
}

function dedupeVertices(pts: Point[]): Point[] {
  const out: Point[] = []
  for (const p of pts) {
    if (out.length === 0 || !pointsEqual(out[out.length - 1], p, 1e-6)) {
      out.push(p)
    }
  }
  if (out.length > 1 && pointsEqual(out[0], out[out.length - 1], 1e-6)) {
    out.pop()
  }
  return out
}

/**
 * Sutherland-Hodgman polygon clipping against a convex clip polygon (Variant 3).
 */
export function clipSutherlandHodgman(
  subjectPolygon: Point[],
  rawClipPolygon: Point[]
): PolygonClipResult {
  const steps: ClipStep[] = []
  if (subjectPolygon.length < 3 || rawClipPolygon.length < 3 || !isConvexPolygon(rawClipPolygon)) {
    steps.push({
      label: 'Некорректные данные',
      detail: 'Требуется отсекаемый многоугольник (>= 3 вершин) и выпуклый отсекатель (>= 3 вершин)',
    })
    return {
      original: subjectPolygon,
      clipped: [],
      status: 'rejected',
      steps,
    }
  }

  const clipPoly = ensureCCW(rawClipPolygon)
  let output = [...subjectPolygon]

  for (let i = 0; i < clipPoly.length; i++) {
    const a = clipPoly[i]
    const b = clipPoly[(i + 1) % clipPoly.length]
    const input = output
    output = []

    if (input.length === 0) {
      steps.push({
        label: `Граница ${i + 1}: ${fmtPt(a)}->${fmtPt(b)}`,
        detail: 'Многоугольник полностью отсечён',
        intermediatePolygon: [],
      })
      break
    }

    let s = input[input.length - 1]
    for (const e of input) {
      const sIn = isInsideEdge(s, a, b)
      const eIn = isInsideEdge(e, a, b)
      if (eIn) {
        if (!sIn) {
          output.push(intersectSegmentWithLine(s, e, a, b))
        }
        output.push(e)
      } else if (sIn) {
        output.push(intersectSegmentWithLine(s, e, a, b))
      }
      s = e
    }

    output = dedupeVertices(output)
    steps.push({
      label: `Граница ${i + 1}: ${fmtPt(a)}->${fmtPt(b)}`,
      detail: `Осталось вершин: ${output.length}`,
      intermediatePolygon: output.map((p) => ({ ...p })),
    })
  }

  if (output.length < 3) {
    return {
      original: subjectPolygon,
      clipped: [],
      status: 'rejected',
      steps,
    }
  }

  const sameCount = output.length === subjectPolygon.length
  const unchanged =
    sameCount &&
    output.every((p, idx) => pointsEqual(p, subjectPolygon[idx], 1e-5))

  return {
    original: subjectPolygon,
    clipped: output,
    status: unchanged ? 'accepted' : 'clipped',
    steps,
  }
}

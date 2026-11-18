import {
  ensureCCW,
  fmtNum,
  fmtPt,
  isConvexPolygon,
  pointsEqual,
} from './geometry.ts'
import type { ClipStep, Point, Segment, SegmentClipResult } from './types.ts'

/**
 * Cyrus-Beck line clipping against a convex polygon.
 */
export function clipCyrusBeck(
  segment: Segment,
  rawClipPolygon: Point[]
): SegmentClipResult {
  const steps: ClipStep[] = []
  if (rawClipPolygon.length < 3 || !isConvexPolygon(rawClipPolygon)) {
    steps.push({
      label: 'Ошибка отсекателя',
      detail: 'Отсекающий многоугольник должен быть невырожденным и выпуклым (>= 3 вершин)',
    })
    return {
      segmentId: segment.id,
      original: segment,
      clipped: null,
      status: 'rejected',
      steps,
    }
  }

  const poly = ensureCCW(rawClipPolygon)
  const { p1, p2 } = segment
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y

  let t0 = 0
  let t1 = 1

  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    const ex = b.x - a.x
    const ey = b.y - a.y
    // Inward normal for CCW polygon edge
    const nx = -ey
    const ny = ex

    const wx = p1.x - a.x
    const wy = p1.y - a.y
    const denom = nx * dx + ny * dy
    const num = nx * wx + ny * wy

    if (Math.abs(denom) < 1e-12) {
      if (num < -1e-9) {
        steps.push({
          label: `Ребро ${i + 1} (параллельно)`,
          detail: `N*D = 0, N*W = ${fmtNum(num)} < 0 -> отрезок снаружи`,
        })
        return {
          segmentId: segment.id,
          original: segment,
          clipped: null,
          status: 'rejected',
          steps,
        }
      }
      continue
    }

    const t = -num / denom
    if (denom > 0) {
      if (t > t0) t0 = t
    } else {
      if (t < t1) t1 = t
    }

    steps.push({
      label: `Ребро ${i + 1}: ${fmtPt(a)}->${fmtPt(b)}`,
      detail: `N*D=${fmtNum(denom)}, t=${fmtNum(t, 3)} -> [t0=${fmtNum(t0, 3)}, t1=${fmtNum(t1, 3)}]`,
    })

    if (t0 > t1 + 1e-9) {
      steps.push({
        label: 'Отбрасывание',
        detail: `t0 (${fmtNum(t0, 3)}) > t1 (${fmtNum(t1, 3)})`,
      })
      return {
        segmentId: segment.id,
        original: segment,
        clipped: null,
        status: 'rejected',
        steps,
      }
    }
  }

  const c1 = { x: p1.x + t0 * dx, y: p1.y + t0 * dy }
  const c2 = { x: p1.x + t1 * dx, y: p1.y + t1 * dy }
  const unchanged = pointsEqual(c1, p1) && pointsEqual(c2, p2)

  steps.push({
    label: 'Итог',
    detail: `t in [${fmtNum(t0, 3)}, ${fmtNum(t1, 3)}] -> ${fmtPt(c1)} — ${fmtPt(c2)}`,
    highlightSegment: [c1, c2],
  })

  return {
    segmentId: segment.id,
    original: segment,
    clipped: [c1, c2],
    status: unchanged ? 'accepted' : 'clipped',
    steps,
  }
}

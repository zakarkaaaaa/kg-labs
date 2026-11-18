import {
  computeOutcode,
  fmtNum,
  fmtPt,
  formatOutcode,
  normalizeRect,
  pointsEqual,
} from './geometry.ts'
import type { ClipStep, Point, Rect, Segment, SegmentClipResult } from './types.ts'

interface Interval {
  t0: number
  t1: number
}

/**
 * Midpoint subdivision line clipping (Variant 3).
 * Recursively bisects partially-visible segments until sub-segments
 * are trivially accepted, trivially rejected, or smaller than eps.
 */
export function clipMidpoint(
  segment: Segment,
  rawRect: Rect,
  eps = 1e-3
): SegmentClipResult {
  const rect = normalizeRect(rawRect)
  const { p1, p2 } = segment
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  const totalLen = Math.hypot(dx, dy)
  const steps: ClipStep[] = []
  const maxSteps = 40

  const pointAt = (t: number): Point => ({
    x: p1.x + t * dx,
    y: p1.y + t * dy,
  })

  const subdivide = (t0: number, t1: number, depth: number): Interval[] => {
    const a = pointAt(t0)
    const b = pointAt(t1)
    const c1 = computeOutcode(a, rect)
    const c2 = computeOutcode(b, rect)

    if ((c1 | c2) === 0) {
      if (steps.length < maxSteps) {
        steps.push({
          label: `Принято (глубина ${depth})`,
          detail: `t in [${fmtNum(t0, 3)}, ${fmtNum(t1, 3)}] -> ${fmtPt(a)} — ${fmtPt(b)}`,
          highlightSegment: [a, b],
        })
      }
      return [{ t0, t1 }]
    }

    if ((c1 & c2) !== 0) {
      if (steps.length < maxSteps) {
        steps.push({
          label: `Отброшено (глубина ${depth})`,
          detail: `t in [${fmtNum(t0, 3)}, ${fmtNum(t1, 3)}], коды ${formatOutcode(c1)} & ${formatOutcode(c2)} != 0`,
        })
      }
      return []
    }

    const segLen = (t1 - t0) * totalLen
    if (segLen <= eps || depth >= 26) {
      const tm = (t0 + t1) / 2
      const mid = pointAt(tm)
      const cm = computeOutcode(mid, rect)
      if (cm === 0) {
        return [{ t0, t1 }]
      }
      return []
    }

    const tm = (t0 + t1) / 2
    const mid = pointAt(tm)
    if (steps.length < maxSteps) {
      steps.push({
        label: `Деление пополам (глубина ${depth})`,
        detail: `t_mid = ${fmtNum(tm, 4)} -> ${fmtPt(mid)} [${formatOutcode(computeOutcode(mid, rect))}]`,
        highlightPoint: mid,
      })
    }

    const left = subdivide(t0, tm, depth + 1)
    const right = subdivide(tm, t1, depth + 1)
    const combined = [...left, ...right]
    if (combined.length <= 1) return combined

    const merged: Interval[] = [combined[0]]
    for (let i = 1; i < combined.length; i++) {
      const prev = merged[merged.length - 1]
      const curr = combined[i]
      if (Math.abs(curr.t0 - prev.t1) <= 1e-6) {
        prev.t1 = curr.t1
      } else {
        merged.push(curr)
      }
    }
    return merged
  }

  const intervals = subdivide(0, 1, 0)
  if (intervals.length === 0) {
    return {
      segmentId: segment.id,
      original: segment,
      clipped: null,
      status: 'rejected',
      steps,
    }
  }

  const best = intervals.reduce((acc, cur) =>
    cur.t1 - cur.t0 > acc.t1 - acc.t0 ? cur : acc
  )
  const c1 = pointAt(best.t0)
  const c2 = pointAt(best.t1)
  const unchanged = pointsEqual(c1, p1) && pointsEqual(c2, p2)

  return {
    segmentId: segment.id,
    original: segment,
    clipped: [c1, c2],
    status: unchanged ? 'accepted' : 'clipped',
    steps,
  }
}

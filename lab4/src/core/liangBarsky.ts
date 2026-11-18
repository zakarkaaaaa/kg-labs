import { fmtNum, fmtPt, normalizeRect, pointsEqual } from './geometry.ts'
import type { ClipStep, Rect, Segment, SegmentClipResult } from './types.ts'

/**
 * Liang-Barsky parametric line clipping.
 */
export function clipLiangBarsky(segment: Segment, rawRect: Rect): SegmentClipResult {
  const rect = normalizeRect(rawRect)
  const { p1, p2 } = segment
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y

  const p = [-dx, dx, -dy, dy]
  const q = [p1.x - rect.xmin, rect.xmax - p1.x, p1.y - rect.ymin, rect.ymax - p1.y]
  const names = ['левая', 'правая', 'нижняя', 'верхняя']

  let t0 = 0
  let t1 = 1
  const steps: ClipStep[] = []

  for (let i = 0; i < 4; i++) {
    if (Math.abs(p[i]) < 1e-12) {
      if (q[i] < -1e-9) {
        steps.push({
          label: `Параллелен (${names[i]})`,
          detail: `p = 0, q = ${fmtNum(q[i])} < 0 -> отрезок вне окна`,
        })
        return {
          segmentId: segment.id,
          original: segment,
          clipped: null,
          status: 'rejected',
          steps,
        }
      }
      steps.push({
        label: `Параллелен (${names[i]})`,
        detail: `p = 0, q = ${fmtNum(q[i])} >= 0 -> продолжаем`,
      })
      continue
    }

    const r = q[i] / p[i]
    if (p[i] < 0) {
      if (r > t1 + 1e-9) {
        steps.push({
          label: `Отбрасывание (${names[i]})`,
          detail: `t_входа = ${fmtNum(r, 3)} > t1 = ${fmtNum(t1, 3)}`,
        })
        return {
          segmentId: segment.id,
          original: segment,
          clipped: null,
          status: 'rejected',
          steps,
        }
      }
      if (r > t0) t0 = r
    } else {
      if (r < t0 - 1e-9) {
        steps.push({
          label: `Отбрасывание (${names[i]})`,
          detail: `t_выхода = ${fmtNum(r, 3)} < t0 = ${fmtNum(t0, 3)}`,
        })
        return {
          segmentId: segment.id,
          original: segment,
          clipped: null,
          status: 'rejected',
          steps,
        }
      }
      if (r < t1) t1 = r
    }

    steps.push({
      label: `Граница: ${names[i]}`,
      detail: `p = ${fmtNum(p[i])}, q = ${fmtNum(q[i])}, r = ${fmtNum(r, 3)} -> [t0=${fmtNum(t0, 3)}, t1=${fmtNum(t1, 3)}]`,
    })
  }

  if (t0 > t1 + 1e-9) {
    return {
      segmentId: segment.id,
      original: segment,
      clipped: null,
      status: 'rejected',
      steps,
    }
  }

  const c1 = { x: p1.x + t0 * dx, y: p1.y + t0 * dy }
  const c2 = { x: p1.x + t1 * dx, y: p1.y + t1 * dy }

  steps.push({
    label: 'Итоговый интервал',
    detail: `t in [${fmtNum(t0, 3)}, ${fmtNum(t1, 3)}] -> ${fmtPt(c1)} — ${fmtPt(c2)}`,
    highlightSegment: [c1, c2],
  })

  const unchanged = pointsEqual(c1, p1) && pointsEqual(c2, p2)
  return {
    segmentId: segment.id,
    original: segment,
    clipped: [c1, c2],
    status: unchanged ? 'accepted' : 'clipped',
    steps,
  }
}

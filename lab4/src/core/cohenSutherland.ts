import {
  OUTCODE,
  computeOutcode,
  fmtNum,
  fmtPt,
  formatOutcode,
  normalizeRect,
  pointsEqual,
} from './geometry.ts'
import type { ClipStep, Rect, Segment, SegmentClipResult } from './types.ts'

/**
 * Cohen-Sutherland line clipping using explicit line equations.
 */
export function clipCohenSutherland(segment: Segment, rawRect: Rect): SegmentClipResult {
  const rect = normalizeRect(rawRect)
  let p1 = { ...segment.p1 }
  let p2 = { ...segment.p2 }
  let code1 = computeOutcode(p1, rect)
  let code2 = computeOutcode(p2, rect)
  const steps: ClipStep[] = []

  const dx = p2.x - p1.x
  const dy = p2.y - p1.y

  for (let iter = 0; iter < 8; iter++) {
    if ((code1 | code2) === 0) {
      steps.push({
        label: iter === 0 ? 'Тривиальное принятие' : 'Принятие результата',
        detail: `Оба конца внутри окна: ${fmtPt(p1)} [${formatOutcode(code1)}], ${fmtPt(p2)} [${formatOutcode(code2)}]`,
        highlightSegment: [p1, p2],
      })
      const unchanged = pointsEqual(p1, segment.p1) && pointsEqual(p2, segment.p2)
      return {
        segmentId: segment.id,
        original: segment,
        clipped: [p1, p2],
        status: unchanged ? 'accepted' : 'clipped',
        steps,
      }
    }

    if ((code1 & code2) !== 0) {
      steps.push({
        label: 'Тривиальное отбрасывание',
        detail: `Побитовое И ненулевое (${formatOutcode(code1)} & ${formatOutcode(code2)} = ${formatOutcode(code1 & code2)})`,
      })
      return {
        segmentId: segment.id,
        original: segment,
        clipped: null,
        status: 'rejected',
        steps,
      }
    }

    const codeOut = code1 !== 0 ? code1 : code2
    let x = 0
    let y = 0
    let edgeName = ''

    if (codeOut & OUTCODE.TOP) {
      y = rect.ymax
      x = Math.abs(dy) > 1e-12 ? p1.x + (dx * (rect.ymax - p1.y)) / dy : p1.x
      edgeName = `верхняя y = ${fmtNum(rect.ymax)}`
    } else if (codeOut & OUTCODE.BOTTOM) {
      y = rect.ymin
      x = Math.abs(dy) > 1e-12 ? p1.x + (dx * (rect.ymin - p1.y)) / dy : p1.x
      edgeName = `нижняя y = ${fmtNum(rect.ymin)}`
    } else if (codeOut & OUTCODE.RIGHT) {
      x = rect.xmax
      y = Math.abs(dx) > 1e-12 ? p1.y + (dy * (rect.xmax - p1.x)) / dx : p1.y
      edgeName = `правая x = ${fmtNum(rect.xmax)}`
    } else if (codeOut & OUTCODE.LEFT) {
      x = rect.xmin
      y = Math.abs(dx) > 1e-12 ? p1.y + (dy * (rect.xmin - p1.x)) / dx : p1.y
      edgeName = `левая x = ${fmtNum(rect.xmin)}`
    }

    const pt = { x, y }
    steps.push({
      label: `Пересечение (${edgeName})`,
      detail: `Точка ${codeOut === code1 ? 'P1' : 'P2'} [${formatOutcode(codeOut)}] -> ${fmtPt(pt)}`,
      highlightPoint: pt,
    })

    if (codeOut === code1) {
      p1 = pt
      code1 = computeOutcode(p1, rect)
    } else {
      p2 = pt
      code2 = computeOutcode(p2, rect)
    }
  }

  return {
    segmentId: segment.id,
    original: segment,
    clipped: null,
    status: 'rejected',
    steps,
  }
}

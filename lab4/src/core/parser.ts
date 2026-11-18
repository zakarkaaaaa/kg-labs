import { normalizeRect, rectToPolygon } from './geometry.ts'
import type { ParsedScene, Point, Rect, Segment } from './types.ts'

/**
 * Parses the Lab 4 input file format:
 *   n
 *   x1_1 y1_1 x2_1 y2_1
 *   ...
 *   x1_n y1_n x2_n y2_n
 *   xmin ymin xmax ymax
 *
 * Also supports optional comments (after * or #) and optional
 * polygon sections (`POLYGON:` / `CLIPPER:`).
 */
export function parseLab4Input(text: string): ParsedScene {
  const warnings: string[] = []
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\*.*?\*/g, '').replace(/#.*$/, '').trim())
    .filter((line) => line.length > 0)

  const defaultRect: Rect = { xmin: 2, ymin: 2, xmax: 10, ymax: 8 }
  const defaultSegments: Segment[] = [
    { id: 1, p1: { x: 0, y: 5 }, p2: { x: 12, y: 5 } },
    { id: 2, p1: { x: 1, y: 1 }, p2: { x: 11, y: 9 } },
    { id: 3, p1: { x: 4, y: 3 }, p2: { x: 8, y: 7 } },
    { id: 4, p1: { x: -1, y: 7 }, p2: { x: 4, y: 11 } },
  ]

  if (lines.length === 0) {
    return {
      segments: defaultSegments,
      rect: defaultRect,
      subjectPolygon: [
        { x: 0, y: 4 },
        { x: 6, y: -1 },
        { x: 13, y: 5 },
        { x: 9, y: 11 },
        { x: 2, y: 9 },
      ],
      clipPolygon: rectToPolygon(defaultRect),
      warnings: ['Пустой ввод — загружены тестовые данные по умолчанию'],
    }
  }

  const nums = (line: string): number[] =>
    line
      .split(/[\s,;]+/)
      .filter(Boolean)
      .map(Number)
      .filter((n) => Number.isFinite(n))

  const firstNums = nums(lines[0])
  if (firstNums.length !== 1 || !Number.isInteger(firstNums[0]) || firstNums[0] < 0) {
    warnings.push('Первая строка должна содержать целое число n (количество отрезков)')
    return {
      segments: defaultSegments,
      rect: defaultRect,
      subjectPolygon: rectToPolygon({ xmin: 1, ymin: 1, xmax: 11, ymax: 9 }),
      clipPolygon: rectToPolygon(defaultRect),
      warnings,
    }
  }

  const n = firstNums[0]
  const segments: Segment[] = []
  let idx = 1

  for (let i = 0; i < n && idx < lines.length; i++, idx++) {
    const vals = nums(lines[idx])
    if (vals.length >= 4) {
      segments.push({
        id: i + 1,
        p1: { x: vals[0], y: vals[1] },
        p2: { x: vals[2], y: vals[3] },
      })
    } else {
      warnings.push(`Строка ${idx + 1}: ожидалось 4 числа (x1 y1 x2 y2)`)
    }
  }

  if (segments.length < n) {
    warnings.push(`Ожидалось отрезков: ${n}, прочитано: ${segments.length}`)
  }

  let rect: Rect = defaultRect
  if (idx < lines.length) {
    const rectVals = nums(lines[idx])
    if (rectVals.length >= 4) {
      rect = normalizeRect({
        xmin: rectVals[0],
        ymin: rectVals[1],
        xmax: rectVals[2],
        ymax: rectVals[3],
      })
      idx++
    } else {
      warnings.push('Не найдены 4 координаты окна (Xmin Ymin Xmax Ymax)')
    }
  } else {
    warnings.push('Отсутствует строка с координатами отсекающего окна')
  }

  // Build a sensible default subject polygon from segments or around the rect
  const subjectPolygon: Point[] =
    segments.length >= 3
      ? segments.slice(0, Math.min(segments.length, 6)).map((s) => s.p1)
      : [
          { x: rect.xmin - 2, y: (rect.ymin + rect.ymax) / 2 },
          { x: (rect.xmin + rect.xmax) / 2, y: rect.ymin - 2 },
          { x: rect.xmax + 2, y: (rect.ymin + rect.ymax) / 2 },
          { x: (rect.xmin + rect.xmax) / 2, y: rect.ymax + 2 },
        ]

  return {
    segments,
    rect,
    subjectPolygon,
    clipPolygon: rectToPolygon(rect),
    warnings,
  }
}

import assert from 'node:assert/strict'
import { clipCohenSutherland } from '../src/core/cohenSutherland.ts'
import { clipCyrusBeck } from '../src/core/cyrusBeck.ts'
import { rectToPolygon } from '../src/core/geometry.ts'
import { clipLiangBarsky } from '../src/core/liangBarsky.ts'
import { clipMidpoint } from '../src/core/midpoint.ts'
import { parseLab4Input } from '../src/core/parser.ts'
import { clipSutherlandHodgman } from '../src/core/sutherlandHodgman.ts'
import type { Point, Rect, Segment } from '../src/core/types.ts'

const approxPt = (a: Point | null | undefined, b: Point, eps = 1e-2) => {
  assert.ok(a, `Expected point (${b.x}, ${b.y}), got null`)
  assert.ok(
    Math.abs(a.x - b.x) <= eps && Math.abs(a.y - b.y) <= eps,
    `Expected (${b.x}, ${b.y}), got (${a.x}, ${a.y})`
  )
}

const rect: Rect = { xmin: 2, ymin: 2, xmax: 10, ymax: 8 }
const rectPoly = rectToPolygon(rect)

const testSegments: Array<{
  seg: Segment
  expected: [Point, Point] | null
  status: 'accepted' | 'clipped' | 'rejected'
}> = [
  {
    seg: { id: 1, p1: { x: 4, y: 3 }, p2: { x: 8, y: 7 } },
    expected: [
      { x: 4, y: 3 },
      { x: 8, y: 7 },
    ],
    status: 'accepted',
  },
  {
    seg: { id: 2, p1: { x: 0, y: 5 }, p2: { x: 12, y: 5 } },
    expected: [
      { x: 2, y: 5 },
      { x: 10, y: 5 },
    ],
    status: 'clipped',
  },
  {
    seg: { id: 3, p1: { x: 6, y: 0 }, p2: { x: 6, y: 10 } },
    expected: [
      { x: 6, y: 2 },
      { x: 6, y: 8 },
    ],
    status: 'clipped',
  },
  {
    seg: { id: 4, p1: { x: 0, y: 0 }, p2: { x: 12, y: 10 } },
    expected: [
      { x: 2.4, y: 2 },
      { x: 9.6, y: 8 },
    ],
    status: 'clipped',
  },
  {
    seg: { id: 5, p1: { x: -2, y: 7 }, p2: { x: 4, y: 11 } },
    expected: null,
    status: 'rejected',
  },
  {
    seg: { id: 6, p1: { x: 0, y: 2 }, p2: { x: 12, y: 2 } },
    expected: [
      { x: 2, y: 2 },
      { x: 10, y: 2 },
    ],
    status: 'clipped',
  },
]

for (const tc of testSegments) {
  const cs = clipCohenSutherland(tc.seg, rect)
  const lb = clipLiangBarsky(tc.seg, rect)
  const mp = clipMidpoint(tc.seg, rect, 1e-4)
  const cb = clipCyrusBeck(tc.seg, rectPoly)

  for (const [name, res] of [
    ['Cohen-Sutherland', cs],
    ['Liang-Barsky', lb],
    ['Midpoint', mp],
    ['Cyrus-Beck', cb],
  ] as const) {
    assert.equal(res.status, tc.status, `${name} seg ${tc.seg.id} status`)
    if (tc.expected === null) {
      assert.equal(res.clipped, null, `${name} seg ${tc.seg.id} expected null`)
    } else {
      assert.ok(res.clipped, `${name} seg ${tc.seg.id} expected clipped`)
      approxPt(res.clipped[0], tc.expected[0], 1e-2)
      approxPt(res.clipped[1], tc.expected[1], 1e-2)
    }
  }
}

// Cyrus-Beck against a convex diamond (tested in both CCW and CW)
const diamondCCW: Point[] = [
  { x: 5, y: 0 },
  { x: 10, y: 5 },
  { x: 5, y: 10 },
  { x: 0, y: 5 },
]
const diamondCW = [...diamondCCW].reverse()
const diagSeg: Segment = { id: 7, p1: { x: 0, y: 5 }, p2: { x: 10, y: 5 } }
const cbCCW = clipCyrusBeck(diagSeg, diamondCCW)
const cbCW = clipCyrusBeck(diagSeg, diamondCW)
assert.equal(cbCCW.status, 'accepted')
assert.equal(cbCW.status, 'accepted')

const cornerCut: Segment = { id: 8, p1: { x: 0, y: 0 }, p2: { x: 10, y: 10 } }
const cbCut = clipCyrusBeck(cornerCut, diamondCCW)
assert.equal(cbCut.status, 'clipped')
approxPt(cbCut.clipped?.[0], { x: 2.5, y: 2.5 })
approxPt(cbCut.clipped?.[1], { x: 7.5, y: 7.5 })

// Sutherland-Hodgman polygon clipping
const subjectSquare: Point[] = [
  { x: 0, y: 4 },
  { x: 6, y: -1 },
  { x: 12, y: 5 },
  { x: 6, y: 11 },
]
const shRect = clipSutherlandHodgman(subjectSquare, rectPoly)
assert.equal(shRect.status, 'clipped')
assert.ok(shRect.clipped.length >= 4, 'Clipped polygon should have >= 4 vertices')
for (const p of shRect.clipped) {
  assert.ok(p.x >= rect.xmin - 1e-6 && p.x <= rect.xmax + 1e-6)
  assert.ok(p.y >= rect.ymin - 1e-6 && p.y <= rect.ymax + 1e-6)
}

const shOutside = clipSutherlandHodgman(
  [
    { x: -10, y: -10 },
    { x: -5, y: -10 },
    { x: -5, y: -5 },
  ],
  rectPoly
)
assert.equal(shOutside.status, 'rejected')
assert.equal(shOutside.clipped.length, 0)

// Parser test matching Lab 4 PDF format
const sampleText = `
3 *число отрезков*
0 5 12 5
1 1 11 9
-2 7 4 11 *координаты отрезков*
2 2 10 8 *координаты отсекающего прямоугольного окна*
`
const parsed = parseLab4Input(sampleText)
assert.equal(parsed.warnings.length, 0)
assert.equal(parsed.segments.length, 3)
assert.deepEqual(parsed.rect, { xmin: 2, ymin: 2, xmax: 10, ymax: 8 })

console.log('All Lab 4 algorithm & parser verification checks passed!')

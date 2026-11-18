export interface Point {
  x: number
  y: number
}

export interface Segment {
  id: number
  p1: Point
  p2: Point
}

export interface Rect {
  xmin: number
  ymin: number
  xmax: number
  ymax: number
}

export type AlgorithmId =
  | 'midpoint'
  | 'cohen-sutherland'
  | 'liang-barsky'
  | 'cyrus-beck'
  | 'sutherland-hodgman'

export interface ClipStep {
  label: string
  detail: string
  highlightSegment?: [Point, Point]
  highlightPoint?: Point
  intermediatePolygon?: Point[]
}

export interface SegmentClipResult {
  segmentId: number
  original: Segment
  clipped: [Point, Point] | null
  status: 'accepted' | 'clipped' | 'rejected'
  steps: ClipStep[]
}

export interface PolygonClipResult {
  original: Point[]
  clipped: Point[]
  status: 'accepted' | 'clipped' | 'rejected'
  steps: ClipStep[]
}

export interface ParsedScene {
  segments: Segment[]
  rect: Rect
  subjectPolygon: Point[]
  clipPolygon: Point[]
  warnings: string[]
}

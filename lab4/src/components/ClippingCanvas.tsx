import { useCallback, useEffect, useRef, useState } from 'react'
import { fmtNum, rectToPolygon } from '../core/geometry.ts'
import type {
  AlgorithmId,
  ClipStep,
  Point,
  PolygonClipResult,
  Rect,
  SegmentClipResult,
} from '../core/types.ts'

interface ClippingCanvasProps {
  algorithm: AlgorithmId
  rect: Rect
  clipPolygon: Point[]
  useRectClipper: boolean
  segmentResults: SegmentClipResult[]
  polygonResult: PolygonClipResult | null
  selectedSegmentId: number | null
  activeStep: ClipStep | null
  fitTrigger: number
}

interface ViewState {
  centerX: number
  centerY: number
  scale: number // pixels per world unit
}

function niceStep(rawStep: number): number {
  const pow = Math.pow(10, Math.floor(Math.log10(rawStep)))
  const norm = rawStep / pow
  if (norm <= 1.5) return 1 * pow
  if (norm <= 3.5) return 2 * pow
  if (norm <= 7.5) return 5 * pow
  return 10 * pow
}

export function ClippingCanvas({
  algorithm,
  rect,
  clipPolygon,
  useRectClipper,
  segmentResults,
  polygonResult,
  selectedSegmentId,
  activeStep,
  fitTrigger,
}: ClippingCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [size, setSize] = useState({ width: 760, height: 520 })
  const [view, setView] = useState<ViewState>({ centerX: 5, centerY: 5, scale: 36 })
  const [cursorWorld, setCursorWorld] = useState<Point | null>(null)
  const dragRef = useRef<{
    active: boolean
    startX: number
    startY: number
    origCX: number
    origCY: number
  }>({ active: false, startX: 0, startY: 0, origCX: 0, origCY: 0 })

  const isPolygonMode = algorithm === 'sutherland-hodgman'
  const isConvexClipper =
    algorithm === 'cyrus-beck' || (isPolygonMode && !useRectClipper)

  const computeAutoFit = useCallback(
    (w: number, h: number): ViewState => {
      const pts: Point[] = []
      if (isConvexClipper) {
        pts.push(...clipPolygon)
      } else {
        pts.push(...rectToPolygon(rect))
      }

      if (isPolygonMode && polygonResult) {
        pts.push(...polygonResult.original)
      } else {
        for (const r of segmentResults) {
          pts.push(r.original.p1, r.original.p2)
        }
      }

      if (pts.length === 0) {
        return { centerX: 5, centerY: 5, scale: 36 }
      }

      let minX = Infinity
      let maxX = -Infinity
      let minY = Infinity
      let maxY = -Infinity
      for (const p of pts) {
        if (p.x < minX) minX = p.x
        if (p.x > maxX) maxX = p.x
        if (p.y < minY) minY = p.y
        if (p.y > maxY) maxY = p.y
      }
      // Include origin if close
      minX = Math.min(minX, 0)
      minY = Math.min(minY, 0)
      maxX = Math.max(maxX, 0)
      maxY = Math.max(maxY, 0)

      const spanX = Math.max(maxX - minX, 2)
      const spanY = Math.max(maxY - minY, 2)
      const pad = 0.78
      const scale = Math.min((w * pad) / spanX, (h * pad) / spanY)

      return {
        centerX: (minX + maxX) / 2,
        centerY: (minY + maxY) / 2,
        scale: Math.max(0.2, Math.min(scale, 160)),
      }
    },
    [clipPolygon, isConvexClipper, isPolygonMode, polygonResult, rect, segmentResults]
  )

  // Observe container resize
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(300, Math.floor(entry.contentRect.width))
        const h = Math.max(320, Math.floor(entry.contentRect.height))
        setSize({ width: w, height: h })
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Auto-fit when scene or fitTrigger changes
  useEffect(() => {
    setView(computeAutoFit(size.width, size.height))
  }, [fitTrigger, computeAutoFit, size.width, size.height])

  const toScreen = useCallback(
    (p: Point): Point => ({
      x: size.width / 2 + (p.x - view.centerX) * view.scale,
      y: size.height / 2 - (p.y - view.centerY) * view.scale,
    }),
    [size.width, size.height, view]
  )

  const toWorld = useCallback(
    (sx: number, sy: number): Point => ({
      x: view.centerX + (sx - size.width / 2) / view.scale,
      y: view.centerY - (sy - size.height / 2) / view.scale,
    }),
    [size.width, size.height, view]
  )

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.floor(size.width * dpr)
    canvas.height = Math.floor(size.height * dpr)
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, size.width, size.height)

    // Background
    ctx.fillStyle = '#070b16'
    ctx.fillRect(0, 0, size.width, size.height)

    const topLeft = toWorld(0, 0)
    const bottomRight = toWorld(size.width, size.height)
    const minWX = Math.min(topLeft.x, bottomRight.x)
    const maxWX = Math.max(topLeft.x, bottomRight.x)
    const minWY = Math.min(topLeft.y, bottomRight.y)
    const maxWY = Math.max(topLeft.y, bottomRight.y)

    const step = niceStep(65 / view.scale)

    // Grid lines
    ctx.lineWidth = 1
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.11)'
    const startX = Math.floor(minWX / step) * step
    for (let x = startX; x <= maxWX + step * 0.5; x += step) {
      const sx = toScreen({ x, y: 0 }).x
      ctx.beginPath()
      ctx.moveTo(sx, 0)
      ctx.lineTo(sx, size.height)
      ctx.stroke()
    }
    const startY = Math.floor(minWY / step) * step
    for (let y = startY; y <= maxWY + step * 0.5; y += step) {
      const sy = toScreen({ x: 0, y }).y
      ctx.beginPath()
      ctx.moveTo(0, sy)
      ctx.lineTo(size.width, sy)
      ctx.stroke()
    }

    // Coordinate Axes
    const origin = toScreen({ x: 0, y: 0 })
    ctx.strokeStyle = 'rgba(203, 213, 225, 0.55)'
    ctx.lineWidth = 1.5

    // X axis
    if (origin.y >= -20 && origin.y <= size.height + 20) {
      ctx.beginPath()
      ctx.moveTo(0, origin.y)
      ctx.lineTo(size.width, origin.y)
      ctx.stroke()
      // Arrow
      ctx.beginPath()
      ctx.moveTo(size.width - 10, origin.y - 4)
      ctx.lineTo(size.width - 2, origin.y)
      ctx.lineTo(size.width - 10, origin.y + 4)
      ctx.stroke()
    }
    // Y axis
    if (origin.x >= -20 && origin.x <= size.width + 20) {
      ctx.beginPath()
      ctx.moveTo(origin.x, size.height)
      ctx.lineTo(origin.x, 0)
      ctx.stroke()
      // Arrow
      ctx.beginPath()
      ctx.moveTo(origin.x - 4, 10)
      ctx.lineTo(origin.x, 2)
      ctx.lineTo(origin.x + 4, 10)
      ctx.stroke()
    }

    // Axis labels & ticks
    ctx.font = '11px "JetBrains Mono Variable", monospace'
    ctx.fillStyle = 'rgba(148, 163, 184, 0.85)'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'

    const clampedAxisY = Math.max(8, Math.min(size.height - 20, origin.y + 5))
    for (let x = startX; x <= maxWX + step * 0.5; x += step) {
      if (Math.abs(x) < step * 1e-4) continue
      const sx = toScreen({ x, y: 0 }).x
      if (sx < 24 || sx > size.width - 24) continue
      ctx.fillText(fmtNum(x, 2), sx, clampedAxisY)
    }

    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    const clampedAxisX = Math.max(34, Math.min(size.width - 8, origin.x - 6))
    for (let y = startY; y <= maxWY + step * 0.5; y += step) {
      if (Math.abs(y) < step * 1e-4) continue
      const sy = toScreen({ x: 0, y }).y
      if (sy < 16 || sy > size.height - 16) continue
      ctx.fillText(fmtNum(y, 2), clampedAxisX, sy)
    }

    // 1. Clipping Window / Convex Clipper (Cyan)
    const clipVerts = isConvexClipper ? clipPolygon : rectToPolygon(rect)
    if (clipVerts.length >= 3) {
      ctx.save()
      ctx.beginPath()
      clipVerts.forEach((p, i) => {
        const sp = toScreen(p)
        if (i === 0) ctx.moveTo(sp.x, sp.y)
        else ctx.lineTo(sp.x, sp.y)
      })
      ctx.closePath()
      ctx.fillStyle = 'rgba(34, 211, 238, 0.08)'
      ctx.fill()
      ctx.strokeStyle = '#22d3ee'
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.restore()
    }

    // 2. Original & Clipped Geometry
    if (isPolygonMode && polygonResult) {
      // Original subject polygon (dashed amber)
      if (polygonResult.original.length >= 3) {
        ctx.save()
        ctx.beginPath()
        polygonResult.original.forEach((p, i) => {
          const sp = toScreen(p)
          if (i === 0) ctx.moveTo(sp.x, sp.y)
          else ctx.lineTo(sp.x, sp.y)
        })
        ctx.closePath()
        ctx.setLineDash([6, 5])
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.78)'
        ctx.lineWidth = 1.8
        ctx.stroke()
        ctx.fillStyle = 'rgba(245, 158, 11, 0.06)'
        ctx.fill()
        ctx.restore()

        // Original vertices
        for (const p of polygonResult.original) {
          const sp = toScreen(p)
          ctx.beginPath()
          ctx.arc(sp.x, sp.y, 3.5, 0, Math.PI * 2)
          ctx.fillStyle = '#f59e0b'
          ctx.fill()
        }
      }

      // Intermediate polygon from active step (violet)
      if (activeStep?.intermediatePolygon && activeStep.intermediatePolygon.length >= 2) {
        ctx.save()
        ctx.beginPath()
        activeStep.intermediatePolygon.forEach((p, i) => {
          const sp = toScreen(p)
          if (i === 0) ctx.moveTo(sp.x, sp.y)
          else ctx.lineTo(sp.x, sp.y)
        })
        if (activeStep.intermediatePolygon.length >= 3) ctx.closePath()
        ctx.strokeStyle = '#a78bfa'
        ctx.lineWidth = 2
        ctx.setLineDash([4, 3])
        ctx.stroke()
        ctx.restore()
      }

      // Clipped polygon (solid emerald)
      if (polygonResult.clipped.length >= 3) {
        ctx.save()
        ctx.beginPath()
        polygonResult.clipped.forEach((p, i) => {
          const sp = toScreen(p)
          if (i === 0) ctx.moveTo(sp.x, sp.y)
          else ctx.lineTo(sp.x, sp.y)
        })
        ctx.closePath()
        ctx.fillStyle = 'rgba(52, 211, 153, 0.24)'
        ctx.fill()
        ctx.strokeStyle = '#34d399'
        ctx.lineWidth = 3
        ctx.stroke()
        ctx.restore()

        for (const p of polygonResult.clipped) {
          const sp = toScreen(p)
          ctx.beginPath()
          ctx.arc(sp.x, sp.y, 4.5, 0, Math.PI * 2)
          ctx.fillStyle = '#34d399'
          ctx.fill()
          ctx.strokeStyle = '#05070f'
          ctx.lineWidth = 1.5
          ctx.stroke()
        }
      }
    } else {
      // Segments mode
      for (const res of segmentResults) {
        const isSelected = selectedSegmentId === res.segmentId
        const s1 = toScreen(res.original.p1)
        const s2 = toScreen(res.original.p2)

        // Original segment (dashed amber)
        ctx.save()
        ctx.beginPath()
        ctx.moveTo(s1.x, s1.y)
        ctx.lineTo(s2.x, s2.y)
        ctx.setLineDash([6, 5])
        ctx.strokeStyle = isSelected
          ? 'rgba(251, 191, 36, 0.95)'
          : 'rgba(245, 158, 11, 0.55)'
        ctx.lineWidth = isSelected ? 2.2 : 1.5
        ctx.stroke()
        ctx.restore()

        // Original endpoints
        for (const sp of [s1, s2]) {
          ctx.beginPath()
          ctx.arc(sp.x, sp.y, 3, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(245, 158, 11, 0.85)'
          ctx.fill()
        }

        // Segment ID label near midpoint
        const midS = { x: (s1.x + s2.x) / 2, y: (s1.y + s2.y) / 2 }
        ctx.font = '10px "JetBrains Mono Variable", monospace'
        ctx.fillStyle = isSelected ? '#fde68a' : 'rgba(203, 213, 225, 0.7)'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'
        ctx.fillText(`#${res.segmentId}`, midS.x, midS.y - 5)

        // Clipped visible part (solid emerald)
        if (res.clipped) {
          const c1 = toScreen(res.clipped[0])
          const c2 = toScreen(res.clipped[1])
          ctx.save()
          ctx.beginPath()
          ctx.moveTo(c1.x, c1.y)
          ctx.lineTo(c2.x, c2.y)
          ctx.strokeStyle = '#34d399'
          ctx.lineWidth = isSelected ? 4 : 3
          ctx.lineCap = 'round'
          ctx.stroke()
          ctx.restore()

          for (const cp of [c1, c2]) {
            ctx.beginPath()
            ctx.arc(cp.x, cp.y, 4.5, 0, Math.PI * 2)
            ctx.fillStyle = '#34d399'
            ctx.fill()
            ctx.strokeStyle = '#05070f'
            ctx.lineWidth = 1.5
            ctx.stroke()
          }
        }
      }

      // Highlight active step point/segment (e.g. midpoint or intersection)
      if (activeStep?.highlightSegment) {
        const a = toScreen(activeStep.highlightSegment[0])
        const b = toScreen(activeStep.highlightSegment[1])
        ctx.save()
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.strokeStyle = '#a78bfa'
        ctx.lineWidth = 4.5
        ctx.stroke()
        ctx.restore()
      }
      if (activeStep?.highlightPoint) {
        const hp = toScreen(activeStep.highlightPoint)
        ctx.beginPath()
        ctx.arc(hp.x, hp.y, 6, 0, Math.PI * 2)
        ctx.fillStyle = '#a78bfa'
        ctx.fill()
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 1.5
        ctx.stroke()
      }
    }
  }, [
    size,
    view,
    rect,
    clipPolygon,
    isConvexClipper,
    isPolygonMode,
    segmentResults,
    polygonResult,
    selectedSegmentId,
    activeStep,
    toScreen,
    toWorld,
  ])

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const rectBox = e.currentTarget.getBoundingClientRect()
    const mx = e.clientX - rectBox.left
    const my = e.clientY - rectBox.top
    const before = toWorld(mx, my)
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15
    const nextScale = Math.max(0.2, Math.min(view.scale * factor, 300))
    setView({
      centerX: before.x - (mx - size.width / 2) / nextScale,
      centerY: before.y + (my - size.height / 2) / nextScale,
      scale: nextScale,
    })
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      origCX: view.centerX,
      origCY: view.centerY,
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    const mx = e.clientX - box.left
    const my = e.clientY - box.top
    setCursorWorld(toWorld(mx, my))

    if (!dragRef.current.active) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    setView((prev) => ({
      ...prev,
      centerX: dragRef.current.origCX - dx / prev.scale,
      centerY: dragRef.current.origCY + dy / prev.scale,
    }))
  }

  const handleMouseUp = () => {
    dragRef.current.active = false
  }

  return (
    <div
      ref={containerRef}
      className="relative h-[460px] w-full overflow-hidden rounded-xl border border-slate-700/60 bg-[#070b16] lg:h-[560px]"
    >
      <canvas
        ref={canvasRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          handleMouseUp()
          setCursorWorld(null)
        }}
        className="block h-full w-full cursor-grab active:cursor-grabbing"
      />

      {/* Legend */}
      <div className="pointer-events-none absolute top-3 left-3 flex flex-wrap gap-3 rounded-lg border border-slate-700/70 bg-slate-950/80 px-3 py-1.5 text-xs backdrop-blur">
        <span className="flex items-center gap-1.5 text-cyan-300">
          <span className="inline-block h-2.5 w-2.5 rounded-xs border border-cyan-400 bg-cyan-400/30" />
          Отсекатель
        </span>
        <span className="flex items-center gap-1.5 text-amber-300">
          <span className="inline-block h-0.5 w-4 border-t-2 border-dashed border-amber-400" />
          Исходные
        </span>
        <span className="flex items-center gap-1.5 text-emerald-300">
          <span className="inline-block h-0.5 w-4 bg-emerald-400" />
          Видимые части
        </span>
      </div>

      {/* Cursor HUD */}
      {cursorWorld && (
        <div className="pointer-events-none absolute right-3 bottom-3 rounded-md border border-slate-700/70 bg-slate-950/85 px-2.5 py-1 font-mono text-xs text-slate-300">
          x: {fmtNum(cursorWorld.x, 2)} &nbsp; y: {fmtNum(cursorWorld.y, 2)}
        </div>
      )}
    </div>
  )
}

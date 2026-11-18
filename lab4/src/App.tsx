import { useMemo, useState } from 'react'
import { ClippingCanvas } from './components/ClippingCanvas.tsx'
import { clipCohenSutherland } from './core/cohenSutherland.ts'
import { clipCyrusBeck } from './core/cyrusBeck.ts'
import { fmtPt, isConvexPolygon, rectToPolygon } from './core/geometry.ts'
import { clipLiangBarsky } from './core/liangBarsky.ts'
import { clipMidpoint } from './core/midpoint.ts'
import { parseLab4Input } from './core/parser.ts'
import { SCENE_PRESETS } from './core/presets.ts'
import { clipSutherlandHodgman } from './core/sutherlandHodgman.ts'
import type {
  AlgorithmId,
  ClipStep,
  Point,
  PolygonClipResult,
  SegmentClipResult,
} from './core/types.ts'

interface AlgorithmMeta {
  id: AlgorithmId
  part: 1 | 2
  short: string
  badge?: string
}

const ALGORITHMS: AlgorithmMeta[] = [
  { id: 'midpoint', part: 1, short: 'Средняя точка', badge: 'В3' },
  { id: 'cohen-sutherland', part: 1, short: 'Сазерленд-Коэн' },
  { id: 'liang-barsky', part: 1, short: 'Лианг-Барски' },
  { id: 'sutherland-hodgman', part: 2, short: 'Сазерленд-Ходжмен', badge: 'В3' },
  { id: 'cyrus-beck', part: 2, short: 'Кирус-Бек' },
]

function pointsToText(pts: Point[]): string {
  return pts.map((p) => `${p.x} ${p.y}`).join('\n')
}

function parsePointsText(text: string): Point[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(/[\s,;]+/).map(Number))
    .filter((arr) => arr.length >= 2 && Number.isFinite(arr[0]) && Number.isFinite(arr[1]))
    .map(([x, y]) => ({ x, y }))
}

const STATUS_LABEL: Record<'accepted' | 'clipped' | 'rejected', string> = {
  accepted: 'Принят',
  clipped: 'Отсечён',
  rejected: 'Отброшен',
}

export default function App() {
  const initialPreset = SCENE_PRESETS[0]
  const [algorithm, setAlgorithm] = useState<AlgorithmId>('midpoint')
  const [presetId, setPresetId] = useState<string>(initialPreset.id)
  const [inputText, setInputText] = useState<string>(initialPreset.inputText)
  const [subjectPolyText, setSubjectPolyText] = useState<string>(
    pointsToText(initialPreset.subjectPolygon)
  )
  const [clipPolyText, setClipPolyText] = useState<string>(
    pointsToText(initialPreset.clipPolygon)
  )
  const [useRectClipper, setUseRectClipper] = useState<boolean>(false)
  const [midpointEps, setMidpointEps] = useState<number>(0.01)
  const [selectedSegmentId, setSelectedSegmentId] = useState<number | null>(1)
  const [activeStep, setActiveStep] = useState<ClipStep | null>(null)
  const [fitTrigger, setFitTrigger] = useState<number>(0)

  const parsed = useMemo(() => parseLab4Input(inputText), [inputText])
  const subjectPolygon = useMemo(() => parsePointsText(subjectPolyText), [subjectPolyText])
  const convexClipPolygon = useMemo(() => parsePointsText(clipPolyText), [clipPolyText])
  const clipPolygonConvexValid = useMemo(
    () => isConvexPolygon(convexClipPolygon),
    [convexClipPolygon]
  )

  const activeClipPolygon = useMemo(
    () => (useRectClipper ? rectToPolygon(parsed.rect) : convexClipPolygon),
    [useRectClipper, parsed.rect, convexClipPolygon]
  )

  const segmentResults: SegmentClipResult[] = useMemo(() => {
    if (algorithm === 'sutherland-hodgman') return []
    return parsed.segments.map((seg) => {
      switch (algorithm) {
        case 'cohen-sutherland':
          return clipCohenSutherland(seg, parsed.rect)
        case 'liang-barsky':
          return clipLiangBarsky(seg, parsed.rect)
        case 'midpoint':
          return clipMidpoint(seg, parsed.rect, midpointEps)
        case 'cyrus-beck':
          return clipCyrusBeck(seg, convexClipPolygon)
      }
    })
  }, [algorithm, parsed.segments, parsed.rect, midpointEps, convexClipPolygon])

  const polygonResult: PolygonClipResult | null = useMemo(() => {
    if (algorithm !== 'sutherland-hodgman') return null
    return clipSutherlandHodgman(subjectPolygon, activeClipPolygon)
  }, [algorithm, subjectPolygon, activeClipPolygon])

  const selectedSegmentResult = useMemo(() => {
    if (segmentResults.length === 0) return null
    return (
      segmentResults.find((r) => r.segmentId === selectedSegmentId) ??
      segmentResults[0]
    )
  }, [segmentResults, selectedSegmentId])

  const handlePresetChange = (id: string) => {
    const found = SCENE_PRESETS.find((p) => p.id === id)
    if (!found) return
    setPresetId(id)
    setInputText(found.inputText)
    setSubjectPolyText(pointsToText(found.subjectPolygon))
    setClipPolyText(pointsToText(found.clipPolygon))
    setActiveStep(null)
    setFitTrigger((t) => t + 1)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPresetId('custom')
        setInputText(reader.result)
        setActiveStep(null)
        setFitTrigger((t) => t + 1)
      }
    }
    reader.readAsText(file)
  }

  const handleDownloadSample = () => {
    const blob = new Blob([inputText], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'lab4_input.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  const counts = useMemo(() => {
    const c = { accepted: 0, clipped: 0, rejected: 0 }
    for (const r of segmentResults) c[r.status]++
    return c
  }, [segmentResults])

  const isPolygonMode = algorithm === 'sutherland-hodgman'
  const needsConvexClipper =
    algorithm === 'cyrus-beck' || (isPolygonMode && !useRectClipper)

  return (
    <div className="min-h-screen bg-[#09090b] px-4 py-4 text-zinc-100 md:px-6">
      <div className="mx-auto max-w-[1440px] space-y-4">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
          <div className="flex items-baseline gap-3">
            <h1 className="text-base font-semibold tracking-tight text-white">
              Лабораторная работа 4 — Отсечение
            </h1>
            <span className="border border-zinc-700 bg-zinc-900 px-2 py-0.5 font-mono text-[11px] text-zinc-300">
              Вариант 3
            </span>
          </div>
          <a
            href="../"
            className="border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs text-zinc-400 transition hover:border-zinc-600 hover:text-white"
          >
            ← Все работы
          </a>
        </header>

        {/* Algorithm Bar */}
        <section className="grid gap-3 md:grid-cols-2">
          <div className="border border-zinc-800 bg-zinc-950 p-2.5">
            <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              Часть 1 · Отрезки
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ALGORITHMS.filter((a) => a.part === 1).map((a) => {
                const active = a.id === algorithm
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => {
                      setAlgorithm(a.id)
                      setActiveStep(null)
                    }}
                    className={`flex items-center gap-1.5 border px-2.5 py-1 text-xs font-medium transition ${
                      active
                        ? 'border-white bg-white text-zinc-950'
                        : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-600'
                    }`}
                  >
                    <span>{a.short}</span>
                    {a.badge && (
                      <span
                        className={`font-mono text-[10px] ${
                          active ? 'text-zinc-600' : 'text-zinc-500'
                        }`}
                      >
                        [{a.badge}]
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="border border-zinc-800 bg-zinc-950 p-2.5">
            <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
              Часть 2 · Выпуклый многоугольник
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ALGORITHMS.filter((a) => a.part === 2).map((a) => {
                const active = a.id === algorithm
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => {
                      setAlgorithm(a.id)
                      setActiveStep(null)
                      setFitTrigger((t) => t + 1)
                    }}
                    className={`flex items-center gap-1.5 border px-2.5 py-1 text-xs font-medium transition ${
                      active
                        ? 'border-white bg-white text-zinc-950'
                        : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-600'
                    }`}
                  >
                    <span>{a.short}</span>
                    {a.badge && (
                      <span
                        className={`font-mono text-[10px] ${
                          active ? 'text-zinc-600' : 'text-zinc-500'
                        }`}
                      >
                        [{a.badge}]
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        {/* Main Grid */}
        <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          {/* Left Panel */}
          <aside className="space-y-3 border border-zinc-800 bg-zinc-950 p-3">
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                Набор данных
              </label>
              <select
                value={presetId}
                onChange={(e) => handlePresetChange(e.target.value)}
                className="w-full border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-zinc-500"
              >
                {SCENE_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
                {presetId === 'custom' && (
                  <option value="custom">Пользовательский файл</option>
                )}
              </select>
            </div>

            <div className="flex gap-1.5">
              <label className="flex-1 cursor-pointer border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-center text-xs text-zinc-300 transition hover:border-zinc-600 hover:text-white">
                Загрузить .txt
                <input
                  type="file"
                  accept=".txt,.dat,.in"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              <button
                type="button"
                onClick={handleDownloadSample}
                className="border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300 transition hover:border-zinc-600 hover:text-white"
              >
                Скачать .txt
              </button>
            </div>

            {algorithm === 'midpoint' && (
              <div className="border border-zinc-800 bg-zinc-900/60 p-2.5">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Точность ε</span>
                  <span className="font-mono text-zinc-100">{midpointEps}</span>
                </div>
                <input
                  type="range"
                  min={0.001}
                  max={0.5}
                  step={0.001}
                  value={midpointEps}
                  onChange={(e) => setMidpointEps(Number(e.target.value))}
                  className="w-full accent-white"
                />
              </div>
            )}

            {!isPolygonMode ? (
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                    Входной файл
                  </label>
                  <span className="font-mono text-[11px] text-zinc-500">
                    {parsed.segments.length} отр.
                  </span>
                </div>
                <textarea
                  value={inputText}
                  onChange={(e) => {
                    setPresetId('custom')
                    setInputText(e.target.value)
                  }}
                  rows={9}
                  spellCheck={false}
                  className="w-full border border-zinc-800 bg-zinc-900 p-2.5 font-mono text-xs leading-relaxed text-zinc-200 outline-none focus:border-zinc-500"
                />
                {parsed.warnings.length > 0 && (
                  <div className="mt-2 border border-zinc-700 bg-zinc-900 p-2 text-xs text-zinc-300">
                    {parsed.warnings.map((w, i) => (
                      <div key={i}>{w}</div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                <div>
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                    Отсекаемый многоугольник (x y)
                  </label>
                  <textarea
                    value={subjectPolyText}
                    onChange={(e) => setSubjectPolyText(e.target.value)}
                    rows={6}
                    spellCheck={false}
                    className="w-full border border-zinc-800 bg-zinc-900 p-2.5 font-mono text-xs leading-relaxed text-zinc-200 outline-none focus:border-zinc-500"
                  />
                </div>
                <label className="flex items-center gap-2 text-xs text-zinc-400">
                  <input
                    type="checkbox"
                    checked={useRectClipper}
                    onChange={(e) => setUseRectClipper(e.target.checked)}
                    className="accent-white"
                  />
                  Прямоугольное окно из файла
                </label>
              </div>
            )}

            {needsConvexClipper && (
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                    Выпуклый отсекатель (x y)
                  </label>
                  <span className="font-mono text-[11px] text-zinc-400">
                    {clipPolygonConvexValid ? 'OK' : 'Невыпуклый'}
                  </span>
                </div>
                <textarea
                  value={clipPolyText}
                  onChange={(e) => setClipPolyText(e.target.value)}
                  rows={5}
                  spellCheck={false}
                  className="w-full border border-zinc-800 bg-zinc-900 p-2.5 font-mono text-xs leading-relaxed text-zinc-200 outline-none focus:border-zinc-500"
                />
              </div>
            )}
          </aside>

          {/* Right Panel */}
          <main className="space-y-4">
            <div className="border border-zinc-800 bg-zinc-950 p-3">
              <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                  {!isPolygonMode ? (
                    <>
                      <span className="border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-zinc-200">
                        Принято: {counts.accepted}
                      </span>
                      <span className="border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-zinc-200">
                        Отсечено: {counts.clipped}
                      </span>
                      <span className="border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-zinc-500">
                        Отброшено: {counts.rejected}
                      </span>
                    </>
                  ) : (
                    polygonResult && (
                      <span className="border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-zinc-200">
                        {STATUS_LABEL[polygonResult.status]} · Вершин:{' '}
                        {polygonResult.clipped.length}
                      </span>
                    )
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setFitTrigger((t) => t + 1)}
                  className="border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300 transition hover:border-zinc-600 hover:text-white"
                >
                  По размеру сцены
                </button>
              </div>

              <ClippingCanvas
                algorithm={algorithm}
                rect={parsed.rect}
                clipPolygon={activeClipPolygon}
                useRectClipper={useRectClipper}
                segmentResults={segmentResults}
                polygonResult={polygonResult}
                selectedSegmentId={selectedSegmentResult?.segmentId ?? null}
                activeStep={activeStep}
                fitTrigger={fitTrigger}
              />
            </div>

            {/* Results & Trace */}
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="border border-zinc-800 bg-zinc-950 p-3">
                <h2 className="mb-2.5 text-xs font-medium uppercase tracking-wider text-zinc-400">
                  {isPolygonMode ? 'Вершины результата' : 'Результаты'}
                </h2>

                {!isPolygonMode ? (
                  <div className="max-h-60 space-y-1 overflow-y-auto pr-1">
                    {segmentResults.map((res) => {
                      const selected = selectedSegmentResult?.segmentId === res.segmentId
                      return (
                        <button
                          key={res.segmentId}
                          type="button"
                          onClick={() => {
                            setSelectedSegmentId(res.segmentId)
                            setActiveStep(null)
                          }}
                          className={`flex w-full items-center justify-between gap-2 border px-2.5 py-1.5 text-left text-xs transition ${
                            selected
                              ? 'border-white bg-zinc-900'
                              : 'border-zinc-800/80 bg-zinc-950 hover:border-zinc-700'
                          }`}
                        >
                          <div className="font-mono">
                            <div className="text-zinc-200">
                              #{res.segmentId}: {fmtPt(res.original.p1)} →{' '}
                              {fmtPt(res.original.p2)}
                            </div>
                            <div className="mt-0.5 text-[11px] text-zinc-500">
                              {res.clipped
                                ? `${fmtPt(res.clipped[0])} → ${fmtPt(res.clipped[1])}`
                                : '—'}
                            </div>
                          </div>
                          <span className="shrink-0 font-mono text-[11px] text-zinc-400">
                            {STATUS_LABEL[res.status]}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto font-mono text-xs text-zinc-300">
                    {polygonResult && polygonResult.clipped.length > 0 ? (
                      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                        {polygonResult.clipped.map((p, idx) => (
                          <div
                            key={idx}
                            className="border border-zinc-800 bg-zinc-900 px-2 py-1"
                          >
                            V{idx + 1}: {fmtPt(p)}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-zinc-500">Многоугольник полностью отброшен.</p>
                    )}
                  </div>
                )}
              </div>

              <div className="border border-zinc-800 bg-zinc-950 p-3">
                <div className="mb-2.5 flex items-center justify-between">
                  <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                    Трассировка{' '}
                    {!isPolygonMode && selectedSegmentResult
                      ? `(#${selectedSegmentResult.segmentId})`
                      : ''}
                  </h2>
                  {activeStep && (
                    <button
                      type="button"
                      onClick={() => setActiveStep(null)}
                      className="text-xs text-zinc-400 hover:text-white"
                    >
                      Сбросить
                    </button>
                  )}
                </div>

                <div className="max-h-60 space-y-1 overflow-y-auto pr-1">
                  {(isPolygonMode
                    ? polygonResult?.steps ?? []
                    : selectedSegmentResult?.steps ?? []
                  ).map((step, i) => {
                    const isActive = activeStep === step
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setActiveStep(isActive ? null : step)}
                        className={`w-full border px-2.5 py-1.5 text-left text-xs transition ${
                          isActive
                            ? 'border-white bg-zinc-900'
                            : 'border-zinc-800/80 bg-zinc-950 hover:border-zinc-700'
                        }`}
                      >
                        <div className="text-zinc-200">
                          {i + 1}. {step.label}
                        </div>
                        <div className="mt-0.5 font-mono text-[11px] text-zinc-500">
                          {step.detail}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

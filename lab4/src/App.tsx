import { useMemo, useState } from 'react'
import { ClippingCanvas } from './components/ClippingCanvas.tsx'
import { clipCohenSutherland } from './core/cohenSutherland.ts'
import { clipCyrusBeck } from './core/cyrusBeck.ts'
import {
  fmtPt,
  isConvexPolygon,
  rectToPolygon,
} from './core/geometry.ts'
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
  title: string
  short: string
  badge?: string
  description: string
}

const ALGORITHMS: AlgorithmMeta[] = [
  {
    id: 'midpoint',
    part: 1,
    title: 'Алгоритм средней точки',
    short: 'Средняя точка',
    badge: 'Вариант 3',
    description:
      'Рекурсивное деление отрезка пополам с 4-битовыми кодами концов (TBRL) до достижения точности ε.',
  },
  {
    id: 'cohen-sutherland',
    part: 1,
    title: 'Алгоритм Сазерленда-Коэна',
    short: 'Сазерленд-Коэн',
    description:
      'Отсечение прямоугольным окном через коды областей и явное уравнение прямой y = y1 + k(x − x1).',
  },
  {
    id: 'liang-barsky',
    part: 1,
    title: 'Алгоритм Лианга-Барски',
    short: 'Лианг-Барски',
    description:
      'Параметрическое задание отрезка P(t) = P1 + t(P2 − P1), t ∈ [0, 1], сужение интервала [t0, t1].',
  },
  {
    id: 'sutherland-hodgman',
    part: 2,
    title: 'Отсечение выпуклого многоугольника',
    short: 'Сазерленд-Ходжмен',
    badge: 'Вариант 3',
    description:
      'Последовательное отсечение вершин многоугольника каждой границей отсекающего окна/выпуклого отсекателя.',
  },
  {
    id: 'cyrus-beck',
    part: 2,
    title: 'Отсечение отрезков выпуклым многоугольником',
    short: 'Кирус-Бек',
    description:
      'Параметрическое отсечение отрезков произвольным выпуклым многоугольником через внутренние нормали к рёбрам.',
  },
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

const STATUS_BADGE: Record<
  'accepted' | 'clipped' | 'rejected',
  { label: string; cls: string }
> = {
  accepted: {
    label: 'Принят',
    cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  clipped: {
    label: 'Отсечён',
    cls: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  },
  rejected: {
    label: 'Отброшен',
    cls: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  },
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

  const activeMeta = ALGORITHMS.find((a) => a.id === algorithm) ?? ALGORITHMS[0]

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
    <div className="min-h-screen px-4 py-5 md:px-6 lg:px-8">
      <div className="mx-auto max-w-[1440px] space-y-5">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-700/60 bg-slate-900/65 px-5 py-4 backdrop-blur">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-lg font-semibold tracking-tight text-slate-100 md:text-xl">
                Лабораторная работа 4 — Алгоритмы отсечения
              </h1>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
                Вариант 3
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-400">
              {activeMeta.description}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="../"
              className="rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-slate-500 hover:text-white"
            >
              ← Все работы
            </a>
          </div>
        </header>

        {/* Algorithm Switcher */}
        <section className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-slate-700/60 bg-slate-900/55 p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Часть 1 — Отсечение отрезков прямоугольным окном
            </div>
            <div className="flex flex-wrap gap-2">
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
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                      active
                        ? 'border-cyan-400/60 bg-cyan-500/15 text-cyan-200'
                        : 'border-slate-700/80 bg-slate-800/60 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <span>{a.short}</span>
                    {a.badge && (
                      <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] text-emerald-300">
                        {a.badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="rounded-xl border border-slate-700/60 bg-slate-900/55 p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Часть 2 — Выпуклый многоугольник
            </div>
            <div className="flex flex-wrap gap-2">
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
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                      active
                        ? 'border-cyan-400/60 bg-cyan-500/15 text-cyan-200'
                        : 'border-slate-700/80 bg-slate-800/60 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <span>{a.short}</span>
                    {a.badge && (
                      <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] text-emerald-300">
                        {a.badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        {/* Main Grid */}
        <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
          {/* Left Panel: Inputs */}
          <aside className="space-y-4 rounded-2xl border border-slate-700/60 bg-slate-900/60 p-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Набор данных
              </label>
              <select
                value={presetId}
                onChange={(e) => handlePresetChange(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-400"
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

            <div className="flex flex-wrap gap-2">
              <label className="flex-1 cursor-pointer rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-center text-xs font-medium text-slate-200 transition hover:border-cyan-400/60">
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
                className="rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-slate-500"
              >
                Скачать .txt
              </button>
            </div>

            {algorithm === 'midpoint' && (
              <div className="rounded-xl border border-slate-700/70 bg-slate-950/50 p-3">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-slate-300">Точность деления ε</span>
                  <span className="font-mono text-cyan-300">{midpointEps}</span>
                </div>
                <input
                  type="range"
                  min={0.001}
                  max={0.5}
                  step={0.001}
                  value={midpointEps}
                  onChange={(e) => setMidpointEps(Number(e.target.value))}
                  className="w-full accent-cyan-400"
                />
              </div>
            )}

            {!isPolygonMode ? (
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Входной файл (n, отрезки, окно)
                  </label>
                  <span className="font-mono text-[11px] text-slate-500">
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
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/90 p-3 font-mono text-xs leading-relaxed text-slate-200 outline-none focus:border-cyan-400"
                />
                {parsed.warnings.length > 0 && (
                  <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-300">
                    {parsed.warnings.map((w, i) => (
                      <div key={i}>{w}</div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Отсекаемый многоугольник (x y)
                  </label>
                  <textarea
                    value={subjectPolyText}
                    onChange={(e) => setSubjectPolyText(e.target.value)}
                    rows={6}
                    spellCheck={false}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/90 p-3 font-mono text-xs leading-relaxed text-slate-200 outline-none focus:border-cyan-400"
                  />
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={useRectClipper}
                    onChange={(e) => setUseRectClipper(e.target.checked)}
                    className="accent-cyan-400"
                  />
                  Использовать прямоугольное окно из файла
                </label>
              </div>
            )}

            {needsConvexClipper && (
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Выпуклый отсекатель (x y)
                  </label>
                  <span
                    className={`text-[11px] font-medium ${
                      clipPolygonConvexValid ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {clipPolygonConvexValid ? 'Выпуклый' : 'Невыпуклый!'}
                  </span>
                </div>
                <textarea
                  value={clipPolyText}
                  onChange={(e) => setClipPolyText(e.target.value)}
                  rows={5}
                  spellCheck={false}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/90 p-3 font-mono text-xs leading-relaxed text-slate-200 outline-none focus:border-cyan-400"
                />
              </div>
            )}
          </aside>

          {/* Right Panel: Canvas + Results */}
          <main className="space-y-4">
            <div className="rounded-2xl border border-slate-700/60 bg-slate-900/55 p-3">
              <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 px-1">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {!isPolygonMode ? (
                    <>
                      <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-emerald-300">
                        Принято: {counts.accepted}
                      </span>
                      <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-cyan-300">
                        Отсечено: {counts.clipped}
                      </span>
                      <span className="rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-rose-300">
                        Отброшено: {counts.rejected}
                      </span>
                    </>
                  ) : (
                    polygonResult && (
                      <span
                        className={`rounded-md border px-2 py-0.5 ${
                          STATUS_BADGE[polygonResult.status].cls
                        }`}
                      >
                        {STATUS_BADGE[polygonResult.status].label} · Вершин результата:{' '}
                        {polygonResult.clipped.length}
                      </span>
                    )
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="hidden text-xs text-slate-400 sm:inline">
                    Колёсико — масштаб, перетаскивание — сдвиг
                  </span>
                  <button
                    type="button"
                    onClick={() => setFitTrigger((t) => t + 1)}
                    className="rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs font-medium text-slate-200 transition hover:border-cyan-400/60"
                  >
                    По размеру сцены
                  </button>
                </div>
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

            {/* Results & Steps */}
            <div className="grid gap-4 xl:grid-cols-2">
              {/* Summary List */}
              <div className="rounded-2xl border border-slate-700/60 bg-slate-900/55 p-4">
                <h2 className="mb-3 text-sm font-semibold text-slate-200">
                  {isPolygonMode ? 'Вершины отсечённого многоугольника' : 'Результаты отсечения отрезков'}
                </h2>

                {!isPolygonMode ? (
                  <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                    {segmentResults.map((res) => {
                      const badge = STATUS_BADGE[res.status]
                      const selected = selectedSegmentResult?.segmentId === res.segmentId
                      return (
                        <button
                          key={res.segmentId}
                          type="button"
                          onClick={() => {
                            setSelectedSegmentId(res.segmentId)
                            setActiveStep(null)
                          }}
                          className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-xs transition ${
                            selected
                              ? 'border-cyan-400/60 bg-cyan-500/10'
                              : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
                          }`}
                        >
                          <div>
                            <div className="font-mono text-slate-200">
                              #{res.segmentId}: {fmtPt(res.original.p1)} →{' '}
                              {fmtPt(res.original.p2)}
                            </div>
                            <div className="mt-0.5 font-mono text-[11px] text-slate-400">
                              {res.clipped
                                ? `Видимая часть: ${fmtPt(res.clipped[0])} → ${fmtPt(res.clipped[1])}`
                                : 'Невидим'}
                            </div>
                          </div>
                          <span
                            className={`shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-medium ${badge.cls}`}
                          >
                            {badge.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto font-mono text-xs text-slate-300">
                    {polygonResult && polygonResult.clipped.length > 0 ? (
                      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                        {polygonResult.clipped.map((p, idx) => (
                          <div
                            key={idx}
                            className="rounded-lg border border-slate-800 bg-slate-950/60 px-2.5 py-1.5"
                          >
                            V{idx + 1}: {fmtPt(p)}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-400">Многоугольник полностью отброшен.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Step-by-step trace */}
              <div className="rounded-2xl border border-slate-700/60 bg-slate-900/55 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-200">
                    Пошаговая трассировка{' '}
                    {!isPolygonMode && selectedSegmentResult
                      ? `(#${selectedSegmentResult.segmentId})`
                      : ''}
                  </h2>
                  {activeStep && (
                    <button
                      type="button"
                      onClick={() => setActiveStep(null)}
                      className="text-xs text-cyan-300 hover:underline"
                    >
                      Сбросить подсветку
                    </button>
                  )}
                </div>

                <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
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
                        className={`w-full rounded-lg border px-3 py-2 text-left text-xs transition ${
                          isActive
                            ? 'border-violet-400/70 bg-violet-500/15'
                            : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
                        }`}
                      >
                        <div className="font-medium text-slate-200">
                          {i + 1}. {step.label}
                        </div>
                        <div className="mt-0.5 font-mono text-[11px] text-slate-400">
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

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_BENCH_OPTIONS,
  runCircleBenchmark,
  runLineBenchmark,
  type BenchOptions,
  type BenchReport,
} from '../core/bench';
import { ALGORITHM_BY_ID } from '../core/registry';
import { DownloadIcon, SparkIcon } from './ui';

type BenchMode = 'raw' | 'trace';

const formatMs = (value: number): string => (value >= 10 ? value.toFixed(1) : value.toFixed(2));
const formatInt = (value: number): string => Math.round(value).toLocaleString('ru-RU');

export const BenchmarkPage = () => {
  const [options, setOptions] = useState<BenchOptions>(DEFAULT_BENCH_OPTIONS);
  const [mode, setMode] = useState<BenchMode>('raw');
  const [lineReport, setLineReport] = useState<BenchReport | null>(null);
  const [circleReport, setCircleReport] = useState<BenchReport | null>(null);
  const [running, setRunning] = useState(false);
  const startedRef = useRef(false);

  const run = useCallback(() => {
    setRunning(true);
    window.setTimeout(() => {
      try {
        setLineReport(runLineBenchmark(options, mode));
        setCircleReport(runCircleBenchmark(options, mode));
      } finally {
        setRunning(false);
      }
    }, 40);
  }, [mode, options]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const timer = window.setTimeout(run, 350);
    return () => window.clearTimeout(timer);
  }, [run]);

  const rows = lineReport?.rows ?? [];
  const maxThroughput = Math.max(1, ...rows.map((row) => row.megapixelsPerSecond));
  const baseline = rows.find((row) => row.id === 'bresenham');
  const fastest = rows.length
    ? rows.reduce((best, row) => (row.nsPerPixel < best.nsPerPixel ? row : best), rows[0])
    : null;
  const totalPixels = rows[0]?.pixels ?? 0;
  const circleCount = mode === 'trace' ? 120 : 300;

  const exportJson = () => {
    const payload = {
      measuredAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
      options,
      mode,
      line: lineReport,
      circle: circleReport,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'lab3-benchmark.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="bench-page">
      <div className="bench-inner">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="eyebrow mb-1">Замеры</div>
            <h2 className="page-title">Временные характеристики</h2>
            <p className="page-sub">
              Реализации написаны на TypeScript и работают с типизированными массивами. Замеряется чистая
              растеризация в буфер (без DOM) и, отдельно, режим с построением массива шагов — именно его
              использует визуализатор.
            </p>
          </div>
          <button type="button" className="btn btn-primary" onClick={run} disabled={running}>
            <SparkIcon size={14} />
            {running ? 'Измеряю…' : 'Измерить заново'}
          </button>
        </div>

        <div className="panel bench-controls">
          <label className="field-label">
            Отрезков в замере
            <select
              className="speed-select w-full"
              value={options.segments}
              onChange={(event) => setOptions({ ...options, segments: Number(event.target.value) })}
            >
              {[1000, 4000, 16000].map((value) => (
                <option key={value} value={value}>
                  {formatInt(value)}
                </option>
              ))}
            </select>
          </label>

          <label className="field-label">
            Повторов (медиана)
            <select
              className="speed-select w-full"
              value={options.reps}
              onChange={(event) => setOptions({ ...options, reps: Number(event.target.value) })}
            >
              {[5, 9, 15].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label className="field-label">
            Максимальная длина
            <select
              className="speed-select w-full"
              value={options.maxLen}
              onChange={(event) => setOptions({ ...options, maxLen: Number(event.target.value) })}
            >
              {[128, 512, 2048].map((value) => (
                <option key={value} value={value}>
                  {value} ед.
                </option>
              ))}
            </select>
          </label>

          <div className="field-label">
            Режим
            <div className="preset-row">
              <button
                type="button"
                className="chip"
                data-active={mode === 'raw'}
                style={
                  mode === 'raw'
                    ? { borderColor: 'rgba(34,211,238,.5)', color: '#a5f3fc', background: 'rgba(34,211,238,.1)' }
                    : undefined
                }
                onClick={() => setMode('raw')}
              >
                чистая растеризация
              </button>
              <button
                type="button"
                className="chip"
                data-active={mode === 'trace'}
                style={
                  mode === 'trace'
                    ? { borderColor: 'rgba(34,211,238,.5)', color: '#a5f3fc', background: 'rgba(34,211,238,.1)' }
                    : undefined
                }
                onClick={() => setMode('trace')}
              >
                с трассировкой
              </button>
            </div>
          </div>

          <button type="button" className="btn" onClick={exportJson} disabled={!lineReport}>
            <DownloadIcon size={14} />
            JSON
          </button>
        </div>

        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-value">{fastest ? fastest.name : '—'}</div>
            <div className="stat-label">минимум нс на пиксель</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{totalPixels ? `${(totalPixels / 1e6).toFixed(1).replace('.', ',')} M` : '—'}</div>
            <div className="stat-label">пикселей в замере</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{formatInt(options.segments)}</div>
            <div className="stat-label">отрезков на прогон</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {lineReport ? `${formatMs(lineReport.rows[0]?.medianMs ?? 0)} мс` : '—'}
            </div>
            <div className="stat-label">медиана прогона</div>
          </div>
        </div>

        <section className="panel">
          <div className="panel-head">
            <div>
              <div className="eyebrow">Отрезки</div>
              <div className="text-[13px] font-semibold text-mist-100 mt-0.5">
                {mode === 'raw' ? 'Растеризация в буфер' : 'Построение массива шагов'}
              </div>
            </div>
            <div className="text-[10px] dim mono">
              {lineReport ? `${lineReport.rows[0]?.pixels.toLocaleString('ru-RU')} px` : ''}
            </div>
          </div>

          <div className="px-2 pb-2">
            <table className="bench-table">
              <thead>
                <tr>
                  <th>Алгоритм</th>
                  <th>Время, мс</th>
                  <th>нс / пиксель</th>
                  <th>нс / отрезок</th>
                  <th>Мпикс/с</th>
                  <th style={{ width: '22%' }}>пропускная способность</th>
                  <th>× к Брезенхему</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center text-mist-500 py-8">
                      Замер выполняется…
                    </td>
                  </tr>
                )}
                {rows.map((row) => {
                  const meta = ALGORITHM_BY_ID[row.id];
                  const ratio = baseline && baseline.nsPerPixel > 0 ? row.nsPerPixel / baseline.nsPerPixel : 1;
                  return (
                    <tr key={row.id} style={{ ['--algo' as string]: meta?.color ?? '#22d3ee' }}>
                      <td>
                        <span className="flex items-center gap-2">
                          <span className="pixel-dot" style={{ background: meta?.color }} />
                          <span className="font-medium text-mist-200">{row.name}</span>
                        </span>
                      </td>
                      <td>{formatMs(row.medianMs)}</td>
                      <td className="text-mist-100">{row.nsPerPixel.toFixed(1)}</td>
                      <td>{formatInt(row.nsPerSegment)}</td>
                      <td>{row.megapixelsPerSecond.toFixed(1)}</td>
                      <td>
                        <div className="bar-track">
                          <div
                            className="bar-fill"
                            style={{
                              width: `${(row.megapixelsPerSecond / maxThroughput) * 100}%`,
                              background: `linear-gradient(90deg, ${meta?.color ?? '#22d3ee'}55, ${meta?.color ?? '#22d3ee'})`,
                            }}
                          />
                        </div>
                      </td>
                      <td className={ratio > 1.05 ? 'text-amber-300/80' : 'text-mist-400'}>
                        {ratio.toFixed(2)}×
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="px-4 pb-4">
            <div className="callout" style={{ ['--algo' as string]: '#22d3ee' }}>
              <b className="text-mist-200">Почему Брезенхем не всегда быстрее ЦДА?</b> На современных x86/ARM
              вещественная арифметика и округление выполняются за такт, а ветка <code>d ≥ 0</code> в
              Брезенхеме непредсказуема примерно в половине случаев. Предсказатель ошибается — и конвейер
              простаивает. Исторический выигрыш Брезенхема — отсутствие дробей и делений: он критичен на
              слабых CPU и в прошивках, где FPU медленный или его нет. В режиме трассировки, наоборот,
              Брезенхем обгоняет: его шаги содержат только целые поля.
            </div>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="panel p-4">
            <div className="eyebrow mb-2">Окружность</div>
            <p className="prose-note mb-3">
              Серия из {circleCount} окружностей с радиусами 10…309 (шаг псевдослучайный, но одинаковый для
              всех прогонов). Радиусы ограничены, чтобы точки гарантированно попадали в буфер.
            </p>
            {circleReport && (
              <div className="stat-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div>
                  <div className="stat-value">{formatMs(circleReport.rows[0].medianMs)} мс</div>
                  <div className="stat-label">на {circleCount} окружностей</div>
                </div>
                <div>
                  <div className="stat-value">{circleReport.rows[0].nsPerPixel.toFixed(1)}</div>
                  <div className="stat-label">нс на пиксель</div>
                </div>
                <div>
                  <div className="stat-value">{formatInt(circleReport.rows[0].pixels)}</div>
                  <div className="stat-label">пикселей</div>
                </div>
                <div>
                  <div className="stat-value">{circleReport.rows[0].megapixelsPerSecond.toFixed(1)}</div>
                  <div className="stat-label">Мпикс/с</div>
                </div>
              </div>
            )}
          </section>

          <section className="panel p-4">
            <div className="eyebrow mb-2">Методика</div>
            <ul className="prose-note m-0 pl-4 space-y-1.5">
              <li>
                <code className="text-cyan-300/90">performance.now()</code> вокруг серии; первый прогон
                играет роль прогрева, результат — медиана.
              </li>
              <li>Одинаковый набор отрезков (детерминированный PRNG, seed {DEFAULT_BENCH_OPTIONS.seed}).</li>
              <li>Медиана из {options.reps} повторов устойчивее среднего при фоновой нагрузке.</li>
              <li>
                «С трассировкой» дополнительно аллоцирует объекты шагов — это цена удобной визуализации,
                а не алгоритма.
              </li>
              <li>В режиме трассировки берётся 800 отрезков и 3 повтора (иначе замер длится слишком долго).</li>
            </ul>
            <div className="legal mt-3">
              Абсолютные значения зависят от браузера, JIT и загрузки CPU; сравнивать имеет смысл
              относительные величины в одной таблице.
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};

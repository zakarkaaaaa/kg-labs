import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlgorithmRail } from './components/AlgorithmRail';
import { BenchmarkPage } from './components/BenchmarkPage';
import { CanvasStage } from './components/CanvasStage';
import { Header } from './components/Header';
import { Inspector } from './components/Inspector';
import { TheoryPage } from './components/TheoryPage';
import { TraceDock } from './components/TraceDock';
import { Transport } from './components/Transport';
import { ALGORITHM_BY_ID, runAlgorithm } from './core/registry';
import type { AlgorithmId, CircleParams, LineParams } from './core/types';
import type { SceneToggles, View } from './lib/draw';

export type Page = 'explorer' | 'bench' | 'theory';

const DEFAULT_LINE: LineParams = { x0: -7, y0: -3, x1: 9, y1: 4 };
const DEFAULT_CIRCLE: CircleParams = { cx: 0, cy: 0, r: 7 };

const readPage = (): Page => {
  const hash = window.location.hash.replace('#', '');
  return hash === 'bench' || hash === 'theory' ? hash : 'explorer';
};

const randomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const App = () => {
  const [page, setPageState] = useState<Page>(readPage);
  const [algorithmId, setAlgorithmId] = useState<AlgorithmId>('bresenham');
  const [line, setLine] = useState<LineParams>(DEFAULT_LINE);
  const [circle, setCircle] = useState<CircleParams>(DEFAULT_CIRCLE);
  const [view, setView] = useState<View>({ cx: 1, cy: 0.5, scale: 36 });
  const [revealed, setRevealed] = useState<number>(Number.MAX_SAFE_INTEGER);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(8);
  const [toggles, setToggles] = useState<SceneToggles>({
    grid: true,
    labels: true,
    ideal: true,
    ghost: true,
  });

  useEffect(() => {
    const onHashChange = () => setPageState(readPage());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const setPage = useCallback((next: Page) => {
    setPageState(next);
    const hash = next === 'explorer' ? '' : `#${next}`;
    if (window.location.hash !== hash) {
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}${window.location.search}${hash}`,
      );
    }
  }, []);

  const meta = ALGORITHM_BY_ID[algorithmId];  const result = useMemo(() => {
    if (meta.kind === 'line') return runAlgorithm(algorithmId, line);
    return runAlgorithm(algorithmId, circle);
  }, [algorithmId, circle, line, meta.kind]);

  const total = result.steps.length;
  const shown = Math.min(revealed, total);

  useEffect(() => {
    setRevealed(result.steps.length);
    setPlaying(false);
  }, [result]);

  useEffect(() => {
    if (!playing) return;
    const interval = window.setInterval(() => {
      setRevealed((previous) => {
        if (previous >= result.steps.length) return previous;
        return previous + 1;
      });
    }, 1000 / speed);
    return () => window.clearInterval(interval);
  }, [playing, result.steps.length, speed]);

  useEffect(() => {
    if (playing && revealed >= total) setPlaying(false);
  }, [playing, revealed, total]);

  const togglePlay = useCallback(() => {
    setPlaying((previous) => {
      if (!previous && revealed >= total) setRevealed(0);
      return !previous;
    });
  }, [revealed, total]);

  const seek = useCallback((value: number) => {
    setPlaying(false);
    setRevealed(Math.max(0, Math.min(value, total)));
  }, [total]);

  const stepBy = useCallback(
    (delta: number) => {
      setPlaying(false);
      setRevealed((previous) => Math.max(0, Math.min(previous + delta, total)));
    },
    [total],
  );

  const resetAnimation = useCallback(() => {
    setPlaying(false);
    setRevealed(0);
  }, []);

  const handleRandom = useCallback(() => {
    if (meta.kind === 'line') {
      const x0 = randomInt(-9, 9);
      const y0 = randomInt(-7, 7);
      let dx = 0;
      let dy = 0;
      while (Math.abs(dx) < 3 || Math.abs(dy) < 2) {
        dx = randomInt(-14, 14);
        dy = randomInt(-9, 9);
      }
      setLine({ x0, y0, x1: x0 + dx, y1: y0 + dy });
    } else {
      setCircle({ cx: randomInt(-3, 3), cy: randomInt(-2, 2), r: randomInt(4, 12) });
    }
  }, [meta.kind]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return;
      if (event.code === 'Space') {
        event.preventDefault();
        togglePlay();
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        stepBy(1);
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        stepBy(-1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [stepBy, togglePlay]);

  const paramsLabel =
    meta.kind === 'line'
      ? `A(${line.x0}; ${line.y0}) → B(${line.x1}; ${line.y1})`
      : `O(${circle.cx}; ${circle.cy}), R = ${circle.r}`;

  return (
    <div className="shell">
      <Header page={page} onPageChange={setPage} />

      {page === 'explorer' && (
        <>
          <div className="workspace">
            <AlgorithmRail activeId={algorithmId} onSelect={setAlgorithmId} />

            <div className="stage-column">
              <CanvasStage
                meta={meta}
                result={result}
                kind={meta.kind}
                line={line}
                circle={circle}
                view={view}
                onViewChange={setView}
                revealed={shown}
                toggles={toggles}
                onLineChange={setLine}
                onCircleChange={setCircle}
              />
              <Transport
                meta={meta}
                result={result}
                revealed={shown}
                playing={playing}
                speed={speed}
                onToggle={togglePlay}
                onSeek={seek}
                onStep={stepBy}
                onReset={resetAnimation}
                onSpeedChange={setSpeed}
              />
            </div>

            <Inspector
              kind={meta.kind}
              line={line}
              circle={circle}
              toggles={toggles}
              onLineChange={setLine}
              onCircleChange={setCircle}
              onTogglesChange={setToggles}
              onRandom={handleRandom}
            />
          </div>

          <div className="dock-wrap">
            <TraceDock meta={meta} result={result} revealed={shown} paramsLabel={paramsLabel} />
          </div>
        </>
      )}

      {page === 'bench' && <BenchmarkPage />}
      {page === 'theory' && <TheoryPage />}

      <footer className="footer">
        <div className="flex items-center gap-3">
          <span>Лабораторная работа №3 · Базовые растровые алгоритмы</span>
          <span className="hidden sm:inline text-mist-500">·</span>
          <span className="hidden sm:inline">Денищич Захар, 4а</span>
        </div>
        <div className="flex items-center gap-3">
          <a href="./report.pdf" target="_blank" rel="noreferrer">
            report.pdf
          </a>
          <span className="text-mist-500">·</span>
          <a href="https://github.com" target="_blank" rel="noreferrer">
            исходники
          </a>
        </div>
      </footer>
    </div>
  );
};

export default App;

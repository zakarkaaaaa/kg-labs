import type { AlgorithmMeta } from '../core/registry';
import type { RasterResult } from '../core/types';
import { PauseIcon, PlayIcon, ResetIcon, StepBackIcon, StepForwardIcon } from './ui';

interface TransportProps {
  meta: AlgorithmMeta;
  result: RasterResult;
  revealed: number;
  playing: boolean;
  speed: number;
  onToggle: () => void;
  onSeek: (value: number) => void;
  onStep: (delta: number) => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
}

export const Transport = ({
  meta,
  result,
  revealed,
  playing,
  speed,
  onToggle,
  onSeek,
  onStep,
  onReset,
  onSpeedChange,
}: TransportProps) => {
  const total = result.steps.length;
  const progress = total > 0 ? (revealed / total) * 100 : 0;

  return (
    <div className="transport" style={{ ['--algo' as string]: meta.color }}>
      <button
        type="button"
        className="play-btn"
        onClick={onToggle}
        title={playing ? 'Пауза' : 'Запустить анимацию'}
      >
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>

      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <span className="eyebrow">Шаг</span>
            <span className="mono text-[12px] text-mist-100">
              {revealed}
              <span className="dim"> / {total}</span>
            </span>
          </div>
          <span className="mono text-[10px] dim">{Math.round(progress)}%</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="icon-btn"
            title="Предыдущий шаг"
            onClick={() => onStep(-1)}
            disabled={revealed <= 0}
          >
            <StepBackIcon />
          </button>
          <input
            className="range"
            type="range"
            min={0}
            max={total}
            value={revealed}
            style={{ ['--progress' as string]: `${progress}%` }}
            onChange={(event) => onSeek(Number(event.target.value))}
            aria-label="Позиция анимации"
          />
          <button
            type="button"
            className="icon-btn"
            title="Следующий шаг"
            onClick={() => onStep(1)}
            disabled={revealed >= total}
          >
            <StepForwardIcon />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-none">
        <select
          className="speed-select"
          value={speed}
          onChange={(event) => onSpeedChange(Number(event.target.value))}
          title="Скорость анимации"
          aria-label="Скорость анимации"
        >
          {[2, 4, 8, 16, 32].map((value) => (
            <option key={value} value={value}>
              {value} шаг/с
            </option>
          ))}
        </select>
        <button type="button" className="icon-btn" title="Сбросить в начало" onClick={onReset}>
          <ResetIcon />
        </button>
      </div>
    </div>
  );
};

import type { CircleParams, LineParams } from '../core/types';
import type { SceneToggles } from '../lib/draw';
import { DiceIcon, Switch } from './ui';

interface InspectorProps {
  kind: 'line' | 'circle';
  line: LineParams;
  circle: CircleParams;
  toggles: SceneToggles;
  onLineChange: (line: LineParams) => void;
  onCircleChange: (circle: CircleParams) => void;
  onTogglesChange: (toggles: SceneToggles) => void;
  onRandom: () => void;
}

const LINE_PRESETS: Array<{ label: string; value: LineParams }> = [
  { label: 'Пологий', value: { x0: -8, y0: -2, x1: 8, y1: 3 } },
  { label: 'Крутой', value: { x0: -3, y0: -8, x1: 4, y1: 8 } },
  { label: 'Диагональ', value: { x0: -6, y0: -6, x1: 6, y1: 6 } },
  { label: 'Обратный', value: { x0: 8, y0: -5, x1: -6, y1: 6 } },
  { label: 'Из отчёта', value: { x0: -4, y0: -3, x1: 8, y1: 4 } },
];

const RADIUS_PRESETS = [3, 6, 9, 12];

export const Inspector = ({
  kind,
  line,
  circle,
  toggles,
  onLineChange,
  onCircleChange,
  onTogglesChange,
  onRandom,
}: InspectorProps) => {
  const toggle = (key: keyof SceneToggles) => (value: boolean) =>
    onTogglesChange({ ...toggles, [key]: value });

  return (
    <aside className="panel inspector">
      <div className="flex items-center justify-between">
        <div>
          <div className="eyebrow">Параметры</div>
          <div className="text-[12.5px] text-mist-300 mt-0.5">
            {kind === 'line' ? 'Отрезок' : 'Окружность'}
          </div>
        </div>
        <button type="button" className="icon-btn" title="Случайный пример" onClick={onRandom}>
          <DiceIcon />
        </button>
      </div>

      {kind === 'line' ? (
        <>
          <div className="field-grid">
            <label className="field-label">
              X₀
              <input
                className="field"
                type="number"
                min={-40}
                max={40}
                value={line.x0}
                onChange={(event) => onLineChange({ ...line, x0: Number(event.target.value) || 0 })}
              />
            </label>
            <label className="field-label">
              Y₀
              <input
                className="field"
                type="number"
                min={-40}
                max={40}
                value={line.y0}
                onChange={(event) => onLineChange({ ...line, y0: Number(event.target.value) || 0 })}
              />
            </label>
            <label className="field-label">
              X₁
              <input
                className="field"
                type="number"
                min={-40}
                max={40}
                value={line.x1}
                onChange={(event) => onLineChange({ ...line, x1: Number(event.target.value) || 0 })}
              />
            </label>
            <label className="field-label">
              Y₁
              <input
                className="field"
                type="number"
                min={-40}
                max={40}
                value={line.y1}
                onChange={(event) => onLineChange({ ...line, y1: Number(event.target.value) || 0 })}
              />
            </label>
          </div>

          <div className="preset-row">
            {LINE_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                className="chip"
                onClick={() => onLineChange(preset.value)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="field-grid">
            <label className="field-label">
              X центра
              <input
                className="field"
                type="number"
                min={-40}
                max={40}
                value={circle.cx}
                onChange={(event) => onCircleChange({ ...circle, cx: Number(event.target.value) || 0 })}
              />
            </label>
            <label className="field-label">
              Y центра
              <input
                className="field"
                type="number"
                min={-40}
                max={40}
                value={circle.cy}
                onChange={(event) => onCircleChange({ ...circle, cy: Number(event.target.value) || 0 })}
              />
            </label>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="field-label">Радиус R</span>
              <span className="mono text-[12px] text-mist-200">{circle.r}</span>
            </div>
            <input
              className="range"
              type="range"
              min={1}
              max={24}
              value={circle.r}
              style={{ ['--progress' as string]: `${((circle.r - 1) / 23) * 100}%` }}
              onChange={(event) => onCircleChange({ ...circle, r: Number(event.target.value) })}
            />
          </div>

          <div className="preset-row">
            {RADIUS_PRESETS.map((radius) => (
              <button
                key={radius}
                type="button"
                className="chip"
                onClick={() => onCircleChange({ ...circle, r: radius })}
              >
                R = {radius}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="section">
        <div className="eyebrow">Отображение</div>
        <div>
          <div className="toggle-row">
            <div>
              <div className="toggle-label">Сетка</div>
              <div className="toggle-hint">линии через 1, 2, 5, 10 единиц</div>
            </div>
            <Switch on={toggles.grid} onChange={toggle('grid')} label="Сетка" />
          </div>
          <div className="toggle-row">
            <div>
              <div className="toggle-label">Подписи осей</div>
              <div className="toggle-hint">числа у штрихов и имена X / Y</div>
            </div>
            <Switch on={toggles.labels} onChange={toggle('labels')} label="Подписи" />
          </div>
          <div className="toggle-row">
            <div>
              <div className="toggle-label">Идеальная фигура</div>
              <div className="toggle-hint">пунктир — непрерывный прообраз</div>
            </div>
            <Switch on={toggles.ideal} onChange={toggle('ideal')} label="Прообраз" />
          </div>
          <div className="toggle-row">
            <div>
              <div className="toggle-label">Призрак растра</div>
              <div className="toggle-hint">бледные клетки будущих пикселей</div>
            </div>
            <Switch on={toggles.ghost} onChange={toggle('ghost')} label="Призрак" />
          </div>
        </div>
      </div>

      <div className="section">
        <div className="callout" style={{ fontSize: 10.5 }}>
          <b className="text-mist-200">Привязка к сетке.</b> Пиксель (x; y) — клетка [x−0,5; x+0,5) ×
          [y−0,5; y+0,5) с центром в узле сетки; ось Y направлена вверх.
        </div>
      </div>
    </aside>
  );
};

import type { AlgorithmId } from '../core/types';
import { ALGORITHMS, type AlgorithmMeta } from '../core/registry';

const AlgoGlyph = ({ id, color }: { id: AlgorithmId; color: string }) => {
  if (id === 'circle') {
    return (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.3">
        <circle cx="8" cy="8" r="5.4" strokeDasharray="2 2" opacity="0.55" />
        <rect x="7" y="1.6" width="2" height="2" fill={color} stroke="none" />
        <rect x="12.4" y="7" width="2" height="2" fill={color} stroke="none" />
        <rect x="7" y="12.4" width="2" height="2" fill={color} stroke="none" />
        <rect x="1.6" y="7" width="2" height="2" fill={color} stroke="none" />
      </svg>
    );
  }
  if (id === 'wu') {
    return (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <line x1="2" y1="13.4" x2="13.4" y2="2.6" stroke={color} strokeWidth="1.2" opacity="0.35" />
        <line x1="2" y1="13.4" x2="13.4" y2="2.6" stroke={color} strokeWidth="2.6" strokeLinecap="round" opacity="0.28" />
        <circle cx="2.6" cy="12.8" r="1.1" fill={color} />
        <circle cx="6" cy="9.4" r="1.1" fill={color} opacity="0.8" />
        <circle cx="9.4" cy="6" r="1.1" fill={color} opacity="0.55" />
        <circle cx="12.8" cy="2.6" r="1.1" fill={color} opacity="0.35" />
      </svg>
    );
  }
  if (id === 'bresenham') {
    return (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="square">
        <path d="M2 13h3v-3h3V7h3V4h3" />
        <rect x="1.2" y="12.2" width="1.8" height="1.8" fill={color} stroke="none" />
      </svg>
    );
  }
  if (id === 'dda') {
    return (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <line x1="2" y1="13" x2="13" y2="3" stroke={color} strokeWidth="1.2" opacity="0.5" />
        <rect x="2.4" y="12" width="1.7" height="1.7" fill={color} />
        <rect x="5.6" y="9.3" width="1.7" height="1.7" fill={color} />
        <rect x="8.8" y="6.6" width="1.7" height="1.7" fill={color} />
        <rect x="12" y="3.4" width="1.7" height="1.7" fill={color} />
      </svg>
    );
  }
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <line x1="2" y1="13" x2="13.5" y2="3" stroke={color} strokeWidth="1.1" opacity="0.4" />
      <rect x="2.2" y="11.6" width="1.8" height="1.8" fill={color} />
      <rect x="4.6" y="9.6" width="1.8" height="1.8" fill={color} />
      <rect x="7" y="7.6" width="1.8" height="1.8" fill={color} />
      <rect x="9.4" y="5.6" width="1.8" height="1.8" fill={color} />
      <rect x="11.8" y="3.6" width="1.8" height="1.8" fill={color} />
    </svg>
  );
};

const PointsBadge = ({ meta }: { meta: AlgorithmMeta }) => {
  if (meta.points === 'бонус') {
    return (
      <span className="badge" data-tone="bonus">
        бонус
      </span>
    );
  }
  return <span className="badge">{meta.points} б.</span>;
};

interface AlgorithmRailProps {
  activeId: AlgorithmId;
  onSelect: (id: AlgorithmId) => void;
}

export const AlgorithmRail = ({ activeId, onSelect }: AlgorithmRailProps) => {
  const lines = ALGORITHMS.filter((item) => item.kind === 'line');
  const curves = ALGORITHMS.filter((item) => item.kind === 'circle');

  const renderItem = (meta: AlgorithmMeta) => (
    <button
      key={meta.id}
      type="button"
      className="rail-item"
      style={{ ['--algo' as string]: meta.color }}
      data-active={meta.id === activeId}
      onClick={() => onSelect(meta.id)}
    >
      <span className="rail-icon">
        <AlgoGlyph id={meta.id} color={meta.color} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="rail-title truncate">{meta.name}</span>
          <PointsBadge meta={meta} />
        </span>
        <span className="rail-sub block truncate">{meta.short}</span>
      </span>
    </button>
  );

  return (
    <aside className="panel rail">
      <div className="eyebrow px-2 pt-1 pb-0.5">Алгоритмы</div>
      <div className="rail-label">Отрезки</div>
      {lines.map(renderItem)}
      <div className="rail-label">Кривые</div>
      {curves.map(renderItem)}

      <div className="rail-hint">
        <div className="font-semibold text-mist-300 mb-1">Как управлять</div>
        Перетаскивайте точки на полотне, колесом меняйте масштаб, фон — панорама. <br />
        <span className="dim">Пробел — play/pause, ← → — шаг.</span>
      </div>
    </aside>
  );
};

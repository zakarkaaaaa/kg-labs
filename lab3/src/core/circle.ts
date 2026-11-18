import type { CircleParams, RasterResult, TraceStep } from './types.ts';

const symmetricPoints = (cx: number, cy: number, x: number, y: number): Array<{ x: number; y: number }> => {
  const raw = [
    { x: cx + x, y: cy + y },
    { x: cx + y, y: cy + x },
    { x: cx + y, y: cy - x },
    { x: cx + x, y: cy - y },
    { x: cx - x, y: cy - y },
    { x: cx - y, y: cy - x },
    { x: cx - y, y: cy + x },
    { x: cx - x, y: cy + y },
  ];
  const seen = new Set<string>();
  return raw.filter((point) => {
    const key = `${point.x};${point.y}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/**
 * Алгоритм Брезенхема для окружности (срединная точка).
 * Строится один октант, остальные семь получаются отражениями.
 */
export function rasterCircleBresenham(params: CircleParams): RasterResult {
  const cx = Math.round(params.cx);
  const cy = Math.round(params.cy);
  const r = Math.max(0, Math.round(Math.abs(params.r)));
  const steps: TraceStep[] = [];

  if (r === 0) {
    steps.push({
      plot: [{ x: cx, y: cy, alpha: 1, step: 0 }],
      values: { i: 0, x: 0, y: 0, p: 1, octant: `(${cx}; ${cy})` },
    });
  } else {
    let x = 0;
    let y = r;
    let p = 1 - r;

    while (x <= y) {
      const points = symmetricPoints(cx, cy, x, y);
      const pBefore = p;
      const negative = p < 0;

      steps.push({
        plot: points.map((point) => ({ ...point, alpha: 1, step: steps.length })),
        values: {
          i: steps.length,
          x,
          y,
          p: pBefore,
          octant: `(${cx + x}; ${cy + y})`,
        },
      });

      if (negative) {
        p += 2 * x + 3;
      } else {
        p += 2 * (x - y) + 5;
        y -= 1;
      }
      x += 1;
    }
  }

  return {
    steps,
    pixels: steps.flatMap((step) => step.plot),
    columns: [
      { key: 'i', label: 'i', kind: 'int' },
      { key: 'x', label: 'x', kind: 'int' },
      { key: 'y', label: 'y', kind: 'int' },
      { key: 'p', label: 'p', kind: 'int', hint: 'решающая переменная срединной точки' },
      { key: 'octant', label: 'базовая точка', kind: 'text' },
    ],
    legend: 'Строится один октант (x ≤ y); остальные точки получаются восемью отражениями относительно центра.',
    extra: {
      R: r,
      'p₀ = 1 − R': 1 - r,
      октантов: 8,
      точек: steps.reduce((sum, step) => sum + step.plot.length, 0),
    },
  };
}

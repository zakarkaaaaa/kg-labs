import type { LineParams, RasterPixel, RasterResult, TraceStep } from './types.ts';

/**
 * Сглаженная линия по алгоритму Сяолинь Ву: для каждого столбца
 * (или строки, если прямая крутая) закрашиваются два соседних пикселя
 * с интенсивностями, равными долям покрытия.
 */
export function rasterWu(params: LineParams): RasterResult {
  const { x0, y0, x1, y1 } = params;
  const steep = Math.abs(y1 - y0) > Math.abs(x1 - x0);

  let u0 = steep ? y0 : x0;
  let v0 = steep ? x0 : y0;
  let u1 = steep ? y1 : x1;
  let v1 = steep ? x1 : y1;

  const reversed = u0 > u1;

  if (u0 > u1) {
    [u0, u1] = [u1, u0];
    [v0, v1] = [v1, v0];
  }

  const du = u1 - u0;
  const dv = v1 - v0;
  const gradient = du === 0 ? 0 : dv / du;
  const steps: TraceStep[] = [];

  for (let i = 0; i <= du; i += 1) {
    const major = u0 + i;
    const exact = v0 + gradient * i;
    const low = Math.floor(exact);
    const frac = exact - low;
    const lowAlpha = 1 - frac;
    const highAlpha = frac;

    const plot: RasterPixel[] = [];
    if (lowAlpha > 0.002) {
      plot.push(
        steep
          ? { x: low, y: major, alpha: lowAlpha, step: steps.length }
          : { x: major, y: low, alpha: lowAlpha, step: steps.length },
      );
    }
    if (highAlpha > 0.002) {
      plot.push(
        steep
          ? { x: low + 1, y: major, alpha: highAlpha, step: steps.length }
          : { x: major, y: low + 1, alpha: highAlpha, step: steps.length },
      );
    }

    steps.push({
      plot,
      values: {
        i,
        major,
        exact,
        low,
        a0: lowAlpha,
        a1: highAlpha,
      },
    });
  }

  if (reversed) {
    steps.reverse();
    steps.forEach((step, index) => {
      step.values.i = index;
    });
  }

  return {
    steps,
    pixels: steps.flatMap((step) => step.plot),
    columns: [
      { key: 'i', label: 'i', kind: 'int' },
      { key: 'major', label: steep ? 'y' : 'x', kind: 'int' },
      { key: 'exact', label: steep ? 'x*' : 'y*', kind: 'float' },
      { key: 'low', label: steep ? '⌊x⌋' : '⌊y⌋', kind: 'int' },
      { key: 'a0', label: 'α нижн.', kind: 'float' },
      { key: 'a1', label: 'α верх.', kind: 'float' },
    ],
    legend: 'Идеальная прямая пересекает пиксель; доля покрытия превращается в интенсивность (альфа-канал).',
    extra: {
      'k = Δy/Δx': gradient,
      'пикселей на шаг': 2,
      шагов: steps.length,
    },
  };
}

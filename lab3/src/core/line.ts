import type { LineParams, RasterPixel, RasterResult, TraceStep } from './types.ts';
import { roundHalfUp } from './types.ts';

const pixel = (x: number, y: number, step: number): RasterPixel => ({
  x,
  y,
  alpha: 1,
  step,
});

const collectPixels = (steps: TraceStep[]): RasterPixel[] =>
  steps.flatMap((step) => step.plot);

/**
 * Пошаговый (наивный) алгоритм: координата по ведущей оси меняется на 1,
 * вторая координата вычисляется из уравнения прямой и округляется.
 */
export function rasterStepByStep(params: LineParams): RasterResult {
  const { x0, y0, x1, y1 } = params;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const steps: TraceStep[] = [];

  if (Math.abs(dx) >= Math.abs(dy)) {
    const n = Math.abs(dx);
    const sign = Math.sign(dx);
    const k = n === 0 ? 0 : dy / dx;
    for (let i = 0; i <= n; i += 1) {
      const x = x0 + i * sign;
      const yExact = y0 + k * (x - x0);
      const y = roundHalfUp(yExact);
      steps.push({
        plot: [pixel(x, y, steps.length)],
        values: {
          i,
          x,
          yExact,
          y,
          err: Math.abs(yExact - y),
        },
      });
    }
  } else {
    const n = Math.abs(dy);
    const sign = Math.sign(dy);
    const k = dx / dy;
    for (let i = 0; i <= n; i += 1) {
      const y = y0 + i * sign;
      const xExact = x0 + k * (y - y0);
      const x = roundHalfUp(xExact);
      steps.push({
        plot: [pixel(x, y, steps.length)],
        values: {
          i,
          x,
          y,
          xExact,
          err: Math.abs(xExact - x),
        },
      });
    }
  }

  return {
    steps,
    pixels: collectPixels(steps),
    columns: [
      { key: 'i', label: 'i', kind: 'int' },
      { key: 'x', label: 'x', kind: 'int' },
      { key: 'y', label: 'y', kind: 'int' },
      { key: 'yExact', label: 'y*', kind: 'float', hint: 'точное значение по уравнению прямой' },
      { key: 'xExact', label: 'x*', kind: 'float', hint: 'точное значение при ведущей оси Y' },
      { key: 'err', label: '|Δ|', kind: 'float' },
    ],
    legend:
      'Один пиксель на каждый шаг по ведущей оси; вторая координата округляется к ближайшему целому.',
    extra: {
      'Δx': dx,
      'Δy': dy,
      'ведущая ось': Math.abs(dx) >= Math.abs(dy) ? 'X' : 'Y',
      k: Math.abs(dx) >= Math.abs(dy) ? (dx === 0 ? 0 : dy / dx) : dy === 0 ? 0 : dx / dy,
      точек: steps.length,
    },
  };
}

/**
 * Цифровой дифференциальный анализатор: обе координаты накапливают
 * вещественные приращения dx/steps и dy/steps.
 */
export function rasterDda(params: LineParams): RasterResult {
  const { x0, y0, x1, y1 } = params;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const stepsCount = Math.max(Math.abs(dx), Math.abs(dy));
  const xInc = stepsCount === 0 ? 0 : dx / stepsCount;
  const yInc = stepsCount === 0 ? 0 : dy / stepsCount;

  const steps: TraceStep[] = [];
  let x = x0;
  let y = y0;

  for (let i = 0; i <= stepsCount; i += 1) {
    const isLast = i === stepsCount;
    const px = roundHalfUp(isLast ? x1 : x);
    const py = roundHalfUp(isLast ? y1 : y);
    steps.push({
      plot: [pixel(px, py, steps.length)],
      values: {
        i,
        x: isLast ? x1 : x,
        y: isLast ? y1 : y,
        px,
        py,
      },
    });
    x += xInc;
    y += yInc;
  }

  return {
    steps,
    pixels: collectPixels(steps),
    columns: [
      { key: 'i', label: 'i', kind: 'int' },
      { key: 'x', label: 'x (float)', kind: 'float' },
      { key: 'y', label: 'y (float)', kind: 'float' },
      { key: 'px', label: '[x]', kind: 'int' },
      { key: 'py', label: '[y]', kind: 'int' },
    ],
    legend: 'Приращения Δx = dx/N и Δy = dy/N накапливаются в вещественных переменных, затем округляются.',
    extra: {
      N: stepsCount,
      'Δx': xInc,
      'Δy': yInc,
      точек: steps.length,
    },
  };
}

/**
 * Целочисленный алгоритм Брезенхема для отрезка (с транспонированием
 * для крутых прямых), с классической решающей переменной d = 2Δy − Δx.
 */
export function rasterBresenham(params: LineParams): RasterResult {
  const { x0, y0, x1, y1 } = params;
  const steep = Math.abs(y1 - y0) > Math.abs(x1 - x0);
  const reversed = steep ? y0 > y1 : x0 > x1;

  let wx0 = steep ? y0 : x0;
  let wy0 = steep ? x0 : y0;
  let wx1 = steep ? y1 : x1;
  let wy1 = steep ? x1 : y1;

  if (wx0 > wx1) {
    [wx0, wx1] = [wx1, wx0];
    [wy0, wy1] = [wy1, wy0];
  }

  const dx = wx1 - wx0;
  const dy = Math.abs(wy1 - wy0);
  const sy = wy0 < wy1 ? 1 : -1;

  let d = 2 * dy - dx;
  let y = wy0;
  const steps: TraceStep[] = [];

  for (let x = wx0; x <= wx1; x += 1) {
    const px = steep ? y : x;
    const py = steep ? x : y;
    const dBefore = d;
    const rise = d >= 0;

    steps.push({
      plot: [pixel(px, py, steps.length)],
      values: {
        i: steps.length,
        x: px,
        y: py,
        d: dBefore,
        rise: rise ? 1 : 0,
      },
    });

    if (rise) {
      y += sy;
      d -= 2 * dx;
    }
    d += 2 * dy;
  }

  if (reversed) {
    steps.reverse();
    steps.forEach((step, index) => {
      step.values.i = index;
    });
  }

  return {
    steps,
    pixels: collectPixels(steps),
    columns: [
      { key: 'i', label: 'i', kind: 'int' },
      { key: 'x', label: 'x', kind: 'int' },
      { key: 'y', label: 'y', kind: 'int' },
      { key: 'd', label: 'd', kind: 'int', hint: 'решающая переменная перед выбором пикселя' },
      { key: 'rise', label: 'd ≥ 0', kind: 'bool' },
    ],
    legend: steep
      ? 'Прямая крутая: оси транспонированы, шаг идёт по Y, решающая переменная считается в транспонированной системе.'
      : 'Шаг идёт по X, решающая переменная d = 2Δy − Δx определяет, нужно ли поднимать пиксель.',
    extra: {
      'Δx': dx,
      'Δy': dy,
      'd₀': 2 * dy - dx,
      '2Δx': 2 * dx,
      '2Δy': 2 * dy,
      транспонирование: steep ? 'да' : 'нет',
      точек: steps.length,
    },
  };
}

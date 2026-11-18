import assert from 'node:assert/strict';
import { rasterStepByStep, rasterDda, rasterBresenham } from '../src/core/line.ts';
import { rasterCircleBresenham } from '../src/core/circle.ts';
import { rasterWu } from '../src/core/wu.ts';
import { generateSegments } from '../src/core/bench.ts';
import type { LineParams, RasterResult } from '../src/core/types.ts';

let checks = 0;
const ok = (condition: boolean, message: string): void => {
  assert.ok(condition, message);
  checks += 1;
};

const key = (x: number, y: number): string => `${x};${y}`;
const unique = (result: RasterResult): Set<string> =>
  new Set(result.pixels.map((pixel) => key(pixel.x, pixel.y)));

const segments = generateSegments(600, 40, 42);
const lines: LineParams[] = [];
for (let i = 0; i < segments.length; i += 4) {
  lines.push({
    x0: segments[i],
    y0: segments[i + 1],
    x1: segments[i + 2],
    y1: segments[i + 3],
  });
}
lines.push(
  { x0: 0, y0: 0, x1: 0, y1: 0 },
  { x0: 5, y0: 3, x1: 5, y1: 3 },
  { x0: -7, y0: -3, x1: 9, y1: 4 },
  { x0: 9, y0: 4, x1: -7, y1: -3 },
  { x0: 0, y0: 0, x1: 0, y1: 12 },
  { x0: 0, y0: 0, x1: 12, y1: 0 },
);

for (const line of lines) {
  const step = rasterStepByStep(line);
  const dda = rasterDda(line);
  const bres = rasterBresenham(line);

  ok(step.steps.length === Math.max(Math.abs(line.x1 - line.x0), Math.abs(line.y1 - line.y0)) + 1, 'step: число шагов');
  ok(dda.steps.length === step.steps.length, 'dda: число шагов совпадает');
  ok(bres.steps.length === step.steps.length, 'bresenham: число шагов совпадает');
  ok(step.pixels[0].x === line.x0 && step.pixels[0].y === line.y0, 'step: первый пиксель');
  ok(
    step.pixels[step.pixels.length - 1].x === line.x1 && step.pixels[step.pixels.length - 1].y === line.y1,
    'step: последний пиксель',
  );
  ok(
    bres.pixels[0].x === line.x0 && bres.pixels[0].y === line.y0,
    'bresenham: начало',
  );
  ok(
    bres.pixels[bres.pixels.length - 1].x === line.x1 &&
      bres.pixels[bres.pixels.length - 1].y === line.y1,
    'bresenham: конец',
  );

  const stepSet = unique(step);
  const ddaSet = unique(dda);
  const bresSet = unique(bres);
  const dx = line.x1 - line.x0;
  const dy = line.y1 - line.y0;
  const steep = Math.abs(dy) > Math.abs(dx);
  const isHalf = (value: number): boolean => Math.abs(value - Math.floor(value) - 0.5) < 1e-9;

  const exactAt = (pixel: { x: number; y: number }): number =>
    steep ? line.x0 + (dx / dy) * (pixel.y - line.y0) : line.y0 + (dy / dx) * (pixel.x - line.x0);

  // Отличия от точного округления допустимы только в ничьих (ровно 0,5):
  // у Брезенхема — из-за правила выбора при d = 0, у ЦДА — из-за накопления ошибки.
  const mismatches = [
    ...dda.pixels.filter((pixel) => !stepSet.has(key(pixel.x, pixel.y))),
    ...step.pixels.filter((pixel) => !ddaSet.has(key(pixel.x, pixel.y))),
    ...bres.pixels.filter((pixel) => !stepSet.has(key(pixel.x, pixel.y))),
    ...step.pixels.filter((pixel) => !bresSet.has(key(pixel.x, pixel.y))),
  ];
  for (const pixel of mismatches) {
    const exact = exactAt(pixel);
    ok(
      isHalf(exact),
      `расхождение допускается только в ничьей: (${pixel.x}; ${pixel.y}), ${exact}`,
    );
  }

  // пиксели не дальше 0.5 от идеальной прямой (кроме концов)
  const length = Math.hypot(dx, dy);
  if (length > 0) {
    for (const pixel of bres.pixels) {
      const distance = Math.abs(dy * (pixel.x - line.x0) - dx * (pixel.y - line.y0)) / length;
      ok(distance <= 0.5 + 1e-9, 'bresenham: отклонение ≤ 0.5');
    }
  }
}

// Окружность: симметрия и число точек
for (let r = 1; r <= 50; r += 1) {
  const circle = rasterCircleBresenham({ cx: 0, cy: 0, r });
  const set = unique(circle);
  for (const pixel of circle.pixels) {
    ok(set.has(key(pixel.y, pixel.x)), `circle r=${r}: симметрия x/y`);
    ok(set.has(key(-pixel.x, pixel.y)), `circle r=${r}: симметрия по x`);
    ok(set.has(key(pixel.x, -pixel.y)), `circle r=${r}: симметрия по y`);
    const radius = Math.hypot(pixel.x, pixel.y);
    ok(Math.abs(radius - r) <= 0.75, `circle r=${r}: радиус ${radius.toFixed(3)}`);
  }
  ok(set.size >= 8 * Math.floor(r / Math.SQRT2) - 8, `circle r=${r}: достаточно точек`);
  ok(set.size <= 8 * r, `circle r=${r}: не больше 8R точек`);
}

// Ву: сумма альф по столбцу равна 1, строки — соседние
for (const line of lines.slice(0, 100)) {
  const wu = rasterWu(line);
  const columns = new Map<number, number>();
  for (const pixel of wu.pixels) {
    columns.set(pixel.x, (columns.get(pixel.x) ?? 0) + pixel.alpha);
  }
  const dx = Math.abs(line.x1 - line.x0);
  const dy = Math.abs(line.y1 - line.y0);
  if (dx >= dy) {
    for (const sum of columns.values()) {
      ok(Math.abs(sum - 1) < 0.03, `wu: сумма альф ${sum.toFixed(3)}`);
    }
    const y = new Set(wu.pixels.map((pixel) => pixel.y));
    ok(y.size <= dy + 1, 'wu: строк не больше, чем нужно');
  }
}

console.log(`Проверок пройдено: ${checks}`);
console.log('Все проверки растровых алгоритмов пройдены.');

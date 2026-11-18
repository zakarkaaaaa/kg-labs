import type { AlgorithmId, LineParams } from './types.ts';
import { rasterStepByStep, rasterDda, rasterBresenham } from './line.ts';
import { rasterCircleBresenham } from './circle.ts';
import { rasterWu } from './wu.ts';

export interface BenchOptions {
  segments: number;
  reps: number;
  maxLen: number;
  seed: number;
}

export interface BenchRow {
  id: AlgorithmId;
  name: string;
  pixels: number;
  medianMs: number;
  nsPerPixel: number;
  nsPerSegment: number;
  megapixelsPerSecond: number;
}

export interface BenchReport {
  rows: BenchRow[];
  options: BenchOptions;
  checksum: number;
  mode: 'raw' | 'trace';
}

export const DEFAULT_BENCH_OPTIONS: BenchOptions = {
  segments: 4000,
  reps: 9,
  maxLen: 512,
  seed: 20260214,
};

const mulberry32 = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export function generateSegments(count: number, maxLen: number, seed: number): Int16Array {
  const random = mulberry32(seed);
  const data = new Int16Array(count * 4);
  for (let i = 0; i < count; i += 1) {
    const x0 = Math.round((random() * 2 - 1) * maxLen);
    const y0 = Math.round((random() * 2 - 1) * maxLen);
    let dx = 0;
    let dy = 0;
    while (dx === 0 && dy === 0) {
      dx = Math.round((random() * 2 - 1) * maxLen);
      dy = Math.round((random() * 2 - 1) * maxLen);
    }
    data[i * 4] = x0;
    data[i * 4 + 1] = y0;
    data[i * 4 + 2] = x0 + dx;
    data[i * 4 + 3] = y0 + dy;
  }
  return data;
}

type HotFn = (
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  outX: Int16Array,
  outY: Int16Array,
  outA: Float32Array,
) => number;

/** Ядро пошагового алгоритма: без трассировки, запись в плоские буферы. */
const stepHot: HotFn = (x0, y0, x1, y1, outX, outY) => {
  const dx = x1 - x0;
  const dy = y1 - y0;
  let n = 0;

  if (Math.abs(dx) >= Math.abs(dy)) {
    const sign = dx >= 0 ? 1 : -1;
    const k = dx === 0 ? 0 : dy / dx;
    const steps = Math.abs(dx);
    for (let i = 0; i <= steps; i += 1) {
      const x = x0 + i * sign;
      outX[n] = x;
      outY[n] = Math.floor(y0 + k * (x - x0) + 0.5);
      n += 1;
    }
  } else {
    const sign = dy >= 0 ? 1 : -1;
    const k = dx / dy;
    const steps = Math.abs(dy);
    for (let i = 0; i <= steps; i += 1) {
      const y = y0 + i * sign;
      outX[n] = Math.floor(x0 + k * (y - y0) + 0.5);
      outY[n] = y;
      n += 1;
    }
  }

  return n;
};

/** Ядро ЦДА: накопление вещественных приращений. */
const ddaHot: HotFn = (x0, y0, x1, y1, outX, outY) => {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  const xInc = steps === 0 ? 0 : dx / steps;
  const yInc = steps === 0 ? 0 : dy / steps;
  let n = 0;
  let x = x0;
  let y = y0;

  for (let i = 0; i < steps; i += 1) {
    outX[n] = Math.floor(x + 0.5);
    outY[n] = Math.floor(y + 0.5);
    n += 1;
    x += xInc;
    y += yInc;
  }
  outX[n] = x1;
  outY[n] = y1;
  return n + 1;
};

/** Ядро Брезенхема: целочисленная решающая переменная, ветка steep вынесена из цикла. */
const bresenhamHot: HotFn = (x0, y0, x1, y1, outX, outY) => {
  const steep = Math.abs(y1 - y0) > Math.abs(x1 - x0);
  let u0 = steep ? y0 : x0;
  let v0 = steep ? x0 : y0;
  let u1 = steep ? y1 : x1;
  let v1 = steep ? x1 : y1;

  if (u0 > u1) {
    const tu = u0;
    u0 = u1;
    u1 = tu;
    const tv = v0;
    v0 = v1;
    v1 = tv;
  }

  const du = u1 - u0;
  const dv = Math.abs(v1 - v0);
  const sv = v0 < v1 ? 1 : -1;
  const d2u = 2 * du;
  const d2v = 2 * dv;
  let d = d2v - du;
  let v = v0;
  let n = 0;

  if (steep) {
    for (let u = u0; u <= u1; u += 1) {
      outX[n] = v;
      outY[n] = u;
      n += 1;
      if (d >= 0) {
        v += sv;
        d -= d2u;
      }
      d += d2v;
    }
  } else {
    for (let u = u0; u <= u1; u += 1) {
      outX[n] = u;
      outY[n] = v;
      n += 1;
      if (d >= 0) {
        v += sv;
        d -= d2u;
      }
      d += d2v;
    }
  }

  return n;
};

/** Ядро Ву: два пикселя с альфой на каждый столбец. */
const wuHot: HotFn = (x0, y0, x1, y1, outX, outY, outA) => {
  const steep = Math.abs(y1 - y0) > Math.abs(x1 - x0);
  let u0 = steep ? y0 : x0;
  let v0 = steep ? x0 : y0;
  let u1 = steep ? y1 : x1;
  let v1 = steep ? x1 : y1;

  if (u0 > u1) {
    const tu = u0;
    u0 = u1;
    u1 = tu;
    const tv = v0;
    v0 = v1;
    v1 = tv;
  }

  const du = u1 - u0;
  const gradient = du === 0 ? 0 : (v1 - v0) / du;
  let n = 0;

  for (let i = 0; i <= du; i += 1) {
    const u = u0 + i;
    const exact = v0 + gradient * i;
    const low = Math.floor(exact);
    const frac = exact - low;
    const lowAlpha = 1 - frac;

    if (lowAlpha > 0.002) {
      if (steep) {
        outX[n] = low;
        outY[n] = u;
      } else {
        outX[n] = u;
        outY[n] = low;
      }
      outA[n] = lowAlpha;
      n += 1;
    }
    if (frac > 0.002) {
      if (steep) {
        outX[n] = low + 1;
        outY[n] = u;
      } else {
        outX[n] = u;
        outY[n] = low + 1;
      }
      outA[n] = frac;
      n += 1;
    }
  }

  return n;
};

/** Ядро окружности: 8 отражений на шаг. */
const circleHot = (
  cx: number,
  cy: number,
  r: number,
  outX: Int16Array,
  outY: Int16Array,
): number => {
  let x = 0;
  let y = r;
  let p = 1 - r;
  let n = 0;

  while (x <= y) {
    outX[n] = cx + x;
    outY[n] = cy + y;
    outX[n + 1] = cx + y;
    outY[n + 1] = cy + x;
    outX[n + 2] = cx + y;
    outY[n + 2] = cy - x;
    outX[n + 3] = cx + x;
    outY[n + 3] = cy - y;
    outX[n + 4] = cx - x;
    outY[n + 4] = cy - y;
    outX[n + 5] = cx - y;
    outY[n + 5] = cy - x;
    outX[n + 6] = cx - y;
    outY[n + 6] = cy + x;
    outX[n + 7] = cx - x;
    outY[n + 7] = cy + y;
    n += 8;

    if (p < 0) {
      p += 2 * x + 3;
    } else {
      p += 2 * (x - y) + 5;
      y -= 1;
    }
    x += 1;
  }

  return n;
};

const LINE_NAMES: Record<'step' | 'dda' | 'bresenham' | 'wu', string> = {
  step: 'Пошаговый',
  dda: 'ЦДА (DDA)',
  bresenham: 'Брезенхем (отрезок)',
  wu: 'Ву (сглаживание)',
};

const LINE_FNS = {
  step: stepHot,
  dda: ddaHot,
  bresenham: bresenhamHot,
  wu: wuHot,
} as const;

const TRACERS: Record<'step' | 'dda' | 'bresenham' | 'wu', (p: LineParams) => { steps: unknown[] }> = {
  step: rasterStepByStep,
  dda: rasterDda,
  bresenham: rasterBresenham,
  wu: rasterWu,
};

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
};

export function runLineBenchmark(
  options: BenchOptions,
  mode: 'raw' | 'trace' = 'raw',
): BenchReport {
  const segments = generateSegments(options.segments, options.maxLen, options.seed);
  const limit = options.maxLen * 2 + 16;
  const outX = new Int16Array(limit);
  const outY = new Int16Array(limit);
  const outA = new Float32Array(limit);
  const rows: BenchRow[] = [];
  let checksum = 0;

  const ids = ['step', 'dda', 'bresenham', 'wu'] as const;

  for (const id of ids) {
    let pixels = 0;
    const times: number[] = [];

    if (mode === 'trace') {
      const traceCount = Math.min(options.segments, 800);
      for (let rep = 0; rep < 3; rep += 1) {
        const start = performance.now();
        let total = 0;
        for (let i = 0; i < traceCount * 4; i += 4) {
          const result = TRACERS[id]({
            x0: segments[i],
            y0: segments[i + 1],
            x1: segments[i + 2],
            y1: segments[i + 3],
          });
          total += result.steps.length;
        }
        times.push(performance.now() - start);
        pixels = total;
        checksum += total & 1;
      }
      const best = median(times);
      rows.push({
        id,
        name: LINE_NAMES[id],
        pixels,
        medianMs: best,
        nsPerPixel: (best * 1e6) / Math.max(1, pixels),
        nsPerSegment: (best * 1e6) / traceCount,
        megapixelsPerSecond: pixels / best / 1000,
      });
      continue;
    }

    for (let rep = 0; rep < options.reps; rep += 1) {
      const start = performance.now();
      let total = 0;
      for (let i = 0; i < segments.length; i += 4) {
        total += LINE_FNS[id](
          segments[i],
          segments[i + 1],
          segments[i + 2],
          segments[i + 3],
          outX,
          outY,
          outA,
        );
      }
      times.push(performance.now() - start);
      pixels = total;
      checksum += outX[0] + outY[0];
    }

    const best = median(times);
    rows.push({
      id,
      name: LINE_NAMES[id],
      pixels,
      medianMs: best,
      nsPerPixel: (best * 1e6) / Math.max(1, pixels),
      nsPerSegment: (best * 1e6) / options.segments,
      megapixelsPerSecond: pixels / best / 1000,
    });
  }

  return { rows, options, checksum, mode };
}

export function runCircleBenchmark(options: BenchOptions, mode: 'raw' | 'trace' = 'raw'): BenchReport {
  const radii = 300;

  if (mode === 'trace') {
    const samples = 120;
    const times: number[] = [];
    let pixels = 0;
    for (let rep = 0; rep < 3; rep += 1) {
      const start = performance.now();
      let total = 0;
      for (let i = 0; i < samples; i += 1) {
        total += rasterCircleBresenham({ cx: 0, cy: 0, r: 10 + ((i * 37) % 300) }).steps.length;
      }
      times.push(performance.now() - start);
      pixels = total;
    }
    const best = median(times);
    return {
      rows: [
        {
          id: 'circle',
          name: 'Брезенхем (окружность)',
          pixels,
          medianMs: best,
          nsPerPixel: (best * 1e6) / Math.max(1, pixels),
          nsPerSegment: (best * 1e6) / samples,
          megapixelsPerSecond: pixels / best / 1000,
        },
      ],
      options,
      checksum: pixels & 1,
      mode,
    };
  }

  const limit = 8 * 320;
  const outX = new Int16Array(limit);
  const outY = new Int16Array(limit);
  const times: number[] = [];
  let pixels = 0;
  let checksum = 0;

  for (let rep = 0; rep < options.reps; rep += 1) {
    const start = performance.now();
    let total = 0;
    for (let i = 0; i < radii; i += 1) {
      total += circleHot(0, 0, 10 + ((i * 37) % 300), outX, outY);
    }
    times.push(performance.now() - start);
    pixels = total;
    checksum += outX[0] + outY[0];
  }

  const best = median(times);
  return {
    rows: [
      {
        id: 'circle',
        name: 'Брезенхем (окружность)',
        pixels,
        medianMs: best,
        nsPerPixel: (best * 1e6) / Math.max(1, pixels),
        nsPerSegment: (best * 1e6) / radii,
        megapixelsPerSecond: pixels / best / 1000,
      },
    ],
    options,
    checksum,
    mode,
  };
}

import type { AlgorithmId, TraceStep } from './types.ts';
import { formatNumber } from './types.ts';

/**
 * Человекочитаемое пояснение к шагу. Строится в UI, а не в ядре
 * растеризации, чтобы замеры не включали форматирование строк.
 */
export function describeStep(id: AlgorithmId, step: TraceStep): string {
  const values = step.values;

  switch (id) {
    case 'step': {
      if (values.yExact !== undefined) {
        return `y* = ${formatNumber(Number(values.yExact), 3)} → y = ${values.y}`;
      }
      return `x* = ${formatNumber(Number(values.xExact), 3)} → x = ${values.x} (ведущая ось — Y)`;
    }
    case 'dda':
      return `x = ${formatNumber(Number(values.x), 4)}, y = ${formatNumber(Number(values.y), 4)} → (${values.px}; ${values.py})`;
    case 'bresenham': {
      const d = Number(values.d);
      return Number(values.rise) === 1
        ? `d = ${d} ≥ 0 ⇒ y += 1, d −= 2Δx`
        : `d = ${d} < 0 ⇒ y без изменений`;
    }
    case 'circle': {
      const p = Number(values.p);
      const x = Number(values.x);
      const y = Number(values.y);
      return p < 0
        ? `p = ${p} < 0 ⇒ p += 2·${x} + 3 = ${p + 2 * x + 3}`
        : `p = ${p} ≥ 0 ⇒ p += 2·(${x} − ${y}) + 5 = ${p + 2 * (x - y) + 5}, y −= 1`;
    }
    case 'wu': {
      const exact = Number(values.exact);
      const low = Number(values.low);
      return `${formatNumber(exact, 3)} ∈ [${low}; ${low + 1}]: α₁ = ${formatNumber(Number(values.a0), 3)}, α₂ = ${formatNumber(Number(values.a1), 3)}`;
    }
  }
}

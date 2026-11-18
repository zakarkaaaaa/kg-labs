import type { AlgorithmId, CircleParams, LineParams, RasterResult } from './types.ts';
import { rasterDda, rasterBresenham, rasterStepByStep } from './line.ts';
import { rasterCircleBresenham } from './circle.ts';
import { rasterWu } from './wu.ts';

export interface AlgorithmMeta {
  id: AlgorithmId;
  name: string;
  short: string;
  kind: 'line' | 'circle';
  color: string;
  points: string;
  theory: string[];
  formulas: string[];
  complexity: string;
  pseudocode: string[];
}

export const ALGORITHMS: AlgorithmMeta[] = [
  {
    id: 'step',
    name: 'Пошаговый',
    short: 'y = y₀ + k·(x − x₀)',
    kind: 'line',
    color: '#f472b6',
    points: '10',
    theory: [
      'Простейший подход: по ведущей оси координата меняется ровно на 1, а вторая вычисляется из уравнения прямой и округляется к ближайшему целому.',
      'Если |Δx| ≥ |Δy|, ведущая ось — X, иначе Y (иначе на крутой прямой появились бы разрывы). Округление выполняется как ⌊y* + 0,5⌋, поэтому пиксель всегда лежит в полосе ±0,5 от идеальной прямой.',
    ],
    formulas: ['y* = y₀ + k·(x − x₀),   k = Δy / Δx', 'y = ⌊y* + 0,5⌋'],
    complexity: 'O(max(|Δx|, |Δy|)), вещественная арифметика на каждом шаге',
    pseudocode: [
      'dx = x1 - x0; dy = y1 - y0',
      'если |dx| ≥ |dy|: ведущая ось X',
      '  k = dy / dx',
      '  для x от x0 до x1:',
      '    y = floor(y0 + k*(x - x0) + 0.5)',
      '    plot(x, y)',
      'иначе: ведущая ось Y (симметрично)',
    ],
  },
  {
    id: 'dda',
    name: 'ЦДА (DDA)',
    short: 'x += Δx/N, y += Δy/N',
    kind: 'line',
    color: '#fbbf24',
    points: '10',
    theory: [
      'Цифровой дифференциальный анализатор (Digital Differential Analyzer) разбивает отрезок на N = max(|Δx|, |Δy|) одинаковых шагов и накапливает вещественные приращения обеих координат.',
      'В отличие от пошагового алгоритма, здесь нет умножения на каждом шаге — только сложение, но накопление ошибки с плавающей точкой и округление на каждом шаге остаются.',
    ],
    formulas: ['N = max(|Δx|, |Δy|)', 'Δx′ = Δx / N,   Δy′ = Δy / N', 'xᵢ = x₀ + i·Δx′,   yᵢ = y₀ + i·Δy′'],
    complexity: 'O(N), N = max(|Δx|, |Δy|); сложение вещественных чисел',
    pseudocode: [
      'N = max(|dx|, |dy|)',
      'dx /= N; dy /= N',
      'x = x0; y = y0',
      'пока i ≤ N:',
      '  plot(round(x), round(y))',
      '  x += dx; y += dy',
    ],
  },
  {
    id: 'bresenham',
    name: 'Брезенхем',
    short: 'd = 2Δy − Δx',
    kind: 'line',
    color: '#22d3ee',
    points: '20',
    theory: [
      'Алгоритм Брезенхема выбирает между двумя соседними пикселями по знаку целочисленной решающей переменной d. Никаких делений и дробей: только сложения и сдвиги.',
      'd — это удвоенное отклонение середины пикселя от прямой. Если d ≥ 0, середина оказалась не ниже прямой, и нужно поднять y; после этого из d вычитается 2Δx. На каждом шаге к d прибавляется 2Δy.',
      'Для крутых прямых (|Δy| > |Δx|) оси транспонируются: шаг идёт по Y, а d считается в повёрнутой системе — результат совпадает с растром, построенным по X, но без разрывов.',
    ],
    formulas: ['d₀ = 2Δy − Δx', 'd ≥ 0 ⇒ y += s,  d −= 2Δx', 'd += 2Δy на каждом шаге'],
    complexity: 'O(N), только целочисленные сложения и сравнения',
    pseudocode: [
      'dx = |x1 - x0|; dy = |y1 - y0|',
      'sx = sign(x1 - x0); sy = sign(y1 - y0)',
      'd = 2*dy - dx',
      'для i от 0 до dx:',
      '  plot(x, y)',
      '  если d ≥ 0: y += sy; d -= 2*dx',
      '  x += sx; d += 2*dy',
    ],
  },
  {
    id: 'circle',
    name: 'Окружность',
    short: 'Брезенхем · p = 1 − R',
    kind: 'circle',
    color: '#a78bfa',
    points: '20',
    theory: [
      'Окружность растрируется по одному октанту (0 ≤ x ≤ y), остальные семь получаются отражениями: (±x, ±y) и (±y, ±x).',
      'Решающая переменная p оценивает положение срединной точки между кандидатами. Если p < 0, средняя точка внутри окружности — выбирается пиксель (x+1, y); иначе (x+1, y−1).',
      'Все вычисления целочисленные; число шагов ≈ R/√2, а точек на всём контуре — около 8R.',
    ],
    formulas: ['p₀ = 1 − R', 'p < 0 ⇒ p += 2x + 3', 'p ≥ 0 ⇒ p += 2(x − y) + 5,  y −= 1'],
    complexity: 'O(R), целочисленная арифметика, 8 точек на шаг',
    pseudocode: [
      'x = 0; y = R; p = 1 - R',
      'пока x ≤ y:',
      '  plot8(cx, cy, x, y)',
      '  если p < 0: p += 2*x + 3',
      '  иначе: p += 2*(x - y) + 5; y -= 1',
      '  x += 1',
    ],
  },
  {
    id: 'wu',
    name: 'Ву',
    short: 'сглаживание · α = 1 − frac',
    kind: 'line',
    color: '#60a5fa',
    points: 'бонус',
    theory: [
      'Сяолинь Ву предложил вместо одного «жёсткого» пикселя закрашивать два соседних с интенсивностями, равными долям покрытия. Сумма интенсивностей в каждом столбце равна 1, поэтому линия не становится ярче или темнее.',
      'Доля покрытия вычисляется через дробную часть точной координаты: α₁ = 1 − frac(y), α₂ = frac(y). Для крутых прямых столбцы заменяются строками (транспонирование).',
      'Альфа-канал смешивает цвет линии с фоном: I = α·C + (1 − α)·B. Это и есть визуальное сглаживание (anti-aliasing).',
    ],
    formulas: ['y* = y₀ + k·(x − x₀)', 'α₁ = 1 − frac(y*),   α₂ = frac(y*)', 'I = α·C + (1 − α)·B'],
    complexity: 'O(N), 2 пикселя и 2 смешения на шаг',
    pseudocode: [
      'для каждого столбца x:',
      '  y* = y0 + k*(x - x0)',
      '  y = floor(y*); f = y* - y',
      '  pixel(x, y,   1 - f)',
      '  pixel(x, y+1, f)',
    ],
  },
];

export const ALGORITHM_BY_ID: Record<AlgorithmId, AlgorithmMeta> = Object.fromEntries(
  ALGORITHMS.map((item) => [item.id, item]),
) as Record<AlgorithmId, AlgorithmMeta>;

export function runAlgorithm(id: AlgorithmId, params: LineParams | CircleParams): RasterResult {
  switch (id) {
    case 'step':
      return rasterStepByStep(params as LineParams);
    case 'dda':
      return rasterDda(params as LineParams);
    case 'bresenham':
      return rasterBresenham(params as LineParams);
    case 'wu':
      return rasterWu(params as LineParams);
    case 'circle':
      return rasterCircleBresenham(params as CircleParams);
  }
}

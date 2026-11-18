import { useMemo } from 'react';
import type { AlgorithmId, CircleParams, LineParams } from '../core/types';
import { runAlgorithm } from '../core/registry';
import { SparkIcon } from './ui';

const LINE: LineParams = { x0: -6, y0: -2, x1: 6, y1: 3 };
const CIRCLE: CircleParams = { cx: 0, cy: 0, r: 6 };

const MiniRaster = ({
  id,
  params,
  color,
  label,
  note,
}: {
  id: AlgorithmId;
  params: LineParams | CircleParams;
  color: string;
  label: string;
  note: string;
}) => {
  const result = useMemo(() => runAlgorithm(id, params), [id, params]);
  const width = 250;
  const height = 150;
  const isCircle = 'r' in params;

  const points = isCircle
    ? [
        { x: params.cx - params.r - 1, y: params.cy - params.r - 1 },
        { x: params.cx + params.r + 1, y: params.cy + params.r + 1 },
      ]
    : [
        { x: params.x0, y: params.y0 },
        { x: params.x1, y: params.y1 },
      ];

  const minX = Math.min(points[0].x, points[1].x);
  const maxX = Math.max(points[0].x, points[1].x);
  const minY = Math.min(points[0].y, points[1].y);
  const maxY = Math.max(points[0].y, points[1].y);
  const scale = Math.min((width - 24) / (maxX - minX), (height - 24) / (maxY - minY));
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const ox = width / 2 - cx * scale;
  const oy = height / 2 + cy * scale;

  const pixelKeys = new Set<string>();

  return (
    <div className="mini-card">
      <h4>
        <span className="pixel-dot" style={{ background: color }} />
        {label}
      </h4>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
        {Array.from({ length: Math.floor(maxX - minX) + 1 }, (_, i) => minX + i).map((x) => (
          <line
            key={`x${x}`}
            x1={ox + x * scale}
            y1={12}
            x2={ox + x * scale}
            y2={height - 12}
            stroke="rgba(148,163,184,0.09)"
            strokeWidth="1"
          />
        ))}
        {Array.from({ length: Math.floor(maxY - minY) + 1 }, (_, i) => minY + i).map((y) => (
          <line
            key={`y${y}`}
            x1={12}
            y1={oy - y * scale}
            x2={width - 12}
            y2={oy - y * scale}
            stroke="rgba(148,163,184,0.09)"
            strokeWidth="1"
          />
        ))}

        {isCircle ? (
          <circle
            cx={ox + params.cx * scale}
            cy={oy - params.cy * scale}
            r={params.r * scale}
            fill="none"
            stroke={color}
            strokeOpacity="0.35"
            strokeDasharray="3 3"
          />
        ) : (
          <line
            x1={ox + params.x0 * scale}
            y1={oy - params.y0 * scale}
            x2={ox + params.x1 * scale}
            y2={oy - params.y1 * scale}
            stroke={color}
            strokeOpacity="0.35"
            strokeDasharray="3 3"
          />
        )}

        {result.pixels.map((pixel, index) => {
          const key = `${pixel.x};${pixel.y}`;
          if (pixelKeys.has(key)) return null;
          pixelKeys.add(key);
          const size = Math.max(2, scale * 0.74);
          return (
            <rect
              key={`${key}-${index}`}
              x={ox + pixel.x * scale - size / 2}
              y={oy - pixel.y * scale - size / 2}
              width={size}
              height={size}
              rx={Math.min(2, size * 0.2)}
              fill={color}
              fillOpacity={0.35 + pixel.alpha * 0.6}
            />
          );
        })}
      </svg>
      <div className="mini-note">{note}</div>
    </div>
  );
};

const CoordinateDiagram = () => {
  const width = 340;
  const height = 180;
  const scale = 20;
  const ox = 30;
  const oy = height - 30;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', maxWidth: 420 }} role="img">
      <defs>
        <linearGradient id="cell-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#22d3ee" stopOpacity="0.35" />
          <stop offset="1" stopColor="#a78bfa" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      {Array.from({ length: 13 }, (_, i) => (
        <line
          key={`gx${i}`}
          x1={ox + i * scale}
          y1={18}
          x2={ox + i * scale}
          y2={height - 18}
          stroke="rgba(148,163,184,0.12)"
        />
      ))}
      {Array.from({ length: 7 }, (_, i) => (
        <line
          key={`gy${i}`}
          x1={ox - 8}
          y1={oy - i * scale}
          x2={ox + 12 * scale}
          y2={oy - i * scale}
          stroke="rgba(148,163,184,0.12)"
        />
      ))}
      <rect
        x={ox + 2.5 * scale}
        y={oy - 3.5 * scale}
        width={scale}
        height={scale}
        fill="url(#cell-grad)"
        stroke="#22d3ee"
        strokeOpacity="0.6"
      />
      <circle cx={ox + 3 * scale} cy={oy - 3 * scale} r="3.2" fill="#e0fbff" />
      <text
        x={ox + 3 * scale + 9}
        y={oy - 3 * scale - 9}
        fill="#e2e8f0"
        fontSize="11"
        fontFamily="JetBrains Mono Variable, monospace"
      >
        (3; 3)
      </text>

      <line x1={ox - 10} y1={oy} x2={width - 12} y2={oy} stroke="rgba(226,232,240,0.55)" />
      <line x1={ox} y1={height - 10} x2={ox} y2={18} stroke="rgba(226,232,240,0.55)" />
      <text x={width - 20} y={oy - 8} fill="#94a3b8" fontSize="10">
        X
      </text>
      <text x={ox + 8} y={26} fill="#94a3b8" fontSize="10">
        Y
      </text>
      {[1, 2, 3, 4].map((tick) => (
        <text
          key={tick}
          x={ox + tick * scale}
          y={oy + 14}
          fill="#64748b"
          fontSize="9"
          textAnchor="middle"
          fontFamily="JetBrains Mono Variable, monospace"
        >
          {tick}
        </text>
      ))}
    </svg>
  );
};

const REFERENCES = [
  { label: 'J. E. Bresenham, Algorithm for computer control of a digital plotter (1965)', href: 'https://en.wikipedia.org/wiki/Bresenham%27s_line_algorithm' },
  { label: 'X. Wu, An efficient antialiasing technique (1991)', href: 'https://en.wikipedia.org/wiki/Xiaolin_Wu%27s_line_algorithm' },
  { label: 'Интуит: алгоритмы растеризации отрезков и окружностей', href: 'https://intuit.ru/studies/courses/993/163/lecture/4495' },
  { label: 'MDN: CanvasRenderingContext2D и пиксельные операции', href: 'https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API' },
];

export const TheoryPage = () => (
  <main className="theory-page">
    <div className="theory-inner">
      <div>
        <div className="eyebrow mb-1">Теория</div>
        <h2 className="page-title">Как непрерывное становится пиксельным</h2>
        <p className="page-sub">
          Короткий конспект: растеризация, привязка координат к сетке, четыре базовых алгоритма и
          сглаживание Ву. Все иллюстрации построены той же реализацией, что и в визуализаторе.
        </p>
      </div>

      <section className="panel theory-card">
        <h2>1. Растр и растеризация</h2>
        <p>
          Растровое изображение — это матрица пикселей, у каждого из которых есть целочисленные координаты.
          Непрерывная геометрическая фигура (отрезок, окружность) в таком изображении не существует: её
          нужно заменить конечным множеством клеток, которые «лучше всего» её приближают.
        </p>
        <p>
          Критерий качества для отрезка простой: для каждого столбца (или строки) выбранный пиксель должен
          отстоять от идеальной прямой не более чем на половину пикселя. Тогда ломаная из центров выбранных
          клеток нигде не уходит дальше 0,5 от исходной прямой.
        </p>
        <div className="callout" style={{ ['--algo' as string]: '#22d3ee' }}>
          Растеризация — это не «рисование линии», а выбор подмножества дискретной сетки. Именно поэтому
          алгоритмы работают с целыми числами и решающими переменными, а не с непрерывной геометрией.
        </div>
      </section>

      <section className="panel theory-card">
        <h2>2. Привязка целочисленных координат к сетке</h2>
        <p>
          В приложении пиксель с координатами <code>(x; y)</code> — это <b>клетка</b> единичного размера с
          центром в узле сетки:
        </p>
        <div className="formula mb-3" style={{ ['--algo' as string]: '#22d3ee' }}>
          [x − 0,5; x + 0,5) × [y − 0,5; y + 0,5), центр = (x; y)
        </div>
        <CoordinateDiagram />
        <p className="mt-3">
          Поэтому отрезок из (0; 0) в (5; 3) состоит из 6 пикселей: оба конца лежат в центрах клеток и
          включаются в растр. Округление выполняется как <code>⌊v + 0,5⌋</code>: значения ровно на границе
          клеток уходят вверх — это фиксированное правило, одинаковое для всех алгоритмов.
        </p>
        <p>
          Ось <b>Y направлена вверх</b>, как в математике, а не вниз, как в экранных координатах Canvas.
          Пересчёт: <code>sx = W/2 + (x − cx)·s</code>, <code>sy = H/2 − (y − cy)·s</code>, где (cx; cy) —
          центр вида в мировых координатах, s — масштаб в пикселях на единицу. При s = 40 одна клетка
          занимает 40×40 экранных пикселей, поэтому «ступеньки» растра видно глазом.
        </p>
        <p>
          Сетка и подписи адаптируются к масштабу: шаг выбирается из ряда 1, 2, 5, 10, … так, чтобы
          расстояние между линиями было не меньше ~20 px, а подписи — не реже ~90 px.
        </p>
      </section>

      <section className="panel theory-card">
        <h2>3. Четыре базовых алгоритма</h2>
        <h3>3.1. Пошаговый алгоритм</h3>
        <p>
          По ведущей оси (той, где |Δ| больше) координата меняется на 1, вторая вычисляется из уравнения
          прямой: <code>y* = y₀ + k·(x − x₀)</code>, <code>y = ⌊y* + 0,5⌋</code>. Просто и наглядно, но на
          каждом шаге есть умножение и вещественная арифметика.
        </p>
        <h3>3.2. Цифровой дифференциальный анализатор (ЦДА)</h3>
        <p>
          Отрезок делится на <code>N = max(|Δx|, |Δy|)</code> шагов, и обе координаты накапливают
          приращения <code>Δx/N</code> и <code>Δy/N</code>. Умножения нет, но ошибка накапливается в
          вещественных переменных, а округление выполняется на каждом шаге.
        </p>
        <h3>3.3. Алгоритм Брезенхема для отрезка</h3>
        <p>
          Вместо вещественного отклонения хранится целая решающая переменная{' '}
          <code>d = 2Δy − Δx</code>. Если <code>d ≥ 0</code>, середина текущего пикселя оказалась не ниже
          прямой — нужно поднять y и вычесть <code>2Δx</code>; затем всегда прибавляется{' '}
          <code>2Δy</code>. Только сложения, вычитания и сравнения — идеально для простых видеоконтроллеров.
        </p>
        <h3>3.4. Алгоритм Брезенхема для окружности</h3>
        <p>
          Строится один октант (0 ≤ x ≤ y), остальные семь получаются отражениями. Решающая переменная{' '}
          <code>p</code> проверяет срединную точку между кандидатами (x+1; y) и (x+1; y−1):{' '}
          <code>p &lt; 0</code> — средняя точка внутри окружности, иначе y уменьшается. Вся арифметика
          целочисленная.
        </p>
      </section>

      <section className="panel theory-card">
        <h2>4. Сравнение на одном отрезке</h2>
        <p>
          Один и тот же отрезок A(−6; −2) → B(6; 3), построенный четырьмя способами. Пошаговый и ЦДА дают
          одинаковый растр (одна точка на шаг), Брезенхем — тот же набор клеток при целочисленных
          вычислениях, а Ву добавляет второй ряд полупрозрачных пикселей.
        </p>
        <div className="mini-grid">
          <MiniRaster id="step" params={LINE} color="#f472b6" label="Пошаговый" note="13 пикселей — по одному на столбец, y округляется" />
          <MiniRaster id="dda" params={LINE} color="#fbbf24" label="ЦДА" note="Те же клетки, но y накапливается сложением" />
          <MiniRaster id="bresenham" params={LINE} color="#22d3ee" label="Брезенхем" note="Тот же растр без дробей: d = 2Δy − Δx" />
          <MiniRaster id="wu" params={LINE} color="#60a5fa" label="Ву" note="Два пикселя на столбец, α = доле покрытия" />
        </div>
      </section>

      <section className="panel theory-card">
        <h2>5. Сглаживание: алгоритм Ву</h2>
        <p>
          Жёсткий пиксель создаёт «лесенку». Ву предлагает для каждого столбца закрашивать два соседних
          пикселя с интенсивностями <code>α₁ = 1 − frac(y*)</code> и <code>α₂ = frac(y*)</code>. Сумма
          интенсивностей равна единице, поэтому линия не становится ярче или темнее — размывается только
          её край.
        </p>
        <div className="formula mb-3" style={{ ['--algo' as string]: '#60a5fa' }}>
          I = α·C + (1 − α)·B,   α ∈ [0; 1]
        </div>
        <p>
          На канве это обычное альфа-смешение: цвет линии C смешивается с фоном B. Для крутых прямых
          столбцы заменяются строками (транспонирование), чтобы на каждый шаг приходилось ровно два
          пикселя.
        </p>
        <div className="mini-grid">
          <MiniRaster id="circle" params={CIRCLE} color="#a78bfa" label="Окружность Брезенхема" note="R = 6, восемь отражений на шаг" />
          <MiniRaster id="wu" params={{ x0: -6, y0: -4, x1: 5, y1: 5 }} color="#60a5fa" label="Ву на крутой прямой" note="Транспонирование: два пикселя на строку" />
        </div>
      </section>

      <section className="panel theory-card">
        <h2>6. Что и как измеряется</h2>
        <p>
          В приложении есть отдельная вкладка «Бенчмарк». Замеры выполняются через{' '}
          <code>performance.now()</code>: одинаковый набор случайных отрезков (детерминированный PRNG),
          прогрев, несколько повторов и медиана. Сравниваются два режима — чистая растеризация в
          типизированный буфер и построение массива шагов для визуализации.
        </p>
        <p>
          В отчёте приведены абсолютные времена и производные величины (нс на пиксель, млн пикселей в
          секунду). Абсолютные числа зависят от машины и браузера; устойчивее вывод об отношении
          «вещественная арифметика → целочисленная» и о цене трассировки.
        </p>
      </section>

      <section className="panel theory-card">
        <h2>7. Что посмотреть в приложении</h2>
        <ul>
          <li>Переключение алгоритмов слева: один и тот же пример, разный растр и разные вычисления.</li>
          <li>Анимация шагов, таблица с решающими переменными и «Вычисления» с подстановкой чисел.</li>
          <li>Перетаскивание концов отрезка и радиуса окружности прямо на полотне.</li>
          <li>Масштаб колесом, панорама перетаскиванием, двойной клик — вписать фигуру.</li>
          <li>Призрак растра показывает, какие клетки будут закрашены, ещё до анимации.</li>
        </ul>
        <div className="callout mt-3" style={{ ['--algo' as string]: '#a78bfa' }}>
          <SparkIcon size={13} /> Бонус: сглаженные линии Ву включены и в визуализатор, и в бенчмарк.
        </div>
      </section>

      <section className="panel theory-card">
        <h2>8. Источники</h2>
        <ul>
          {REFERENCES.map((reference) => (
            <li key={reference.href}>
              <a href={reference.href} target="_blank" rel="noreferrer" className="text-cyan-300/90 hover:text-cyan-200">
                {reference.label}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  </main>
);

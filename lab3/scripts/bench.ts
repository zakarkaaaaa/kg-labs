import fs from 'node:fs';
import os from 'node:os';
import {
  runCircleBenchmark,
  runLineBenchmark,
  DEFAULT_BENCH_OPTIONS,
  type BenchReport,
} from '../src/core/bench.ts';

const options = { ...DEFAULT_BENCH_OPTIONS, segments: 20000, reps: 11 };
const traceOptions = { ...options, segments: 2000, reps: 5 };

const raw = runLineBenchmark(options, 'raw');
const trace = runLineBenchmark(traceOptions, 'trace');
const circle = runCircleBenchmark({ ...options, segments: 300 }, 'raw');

const fmt = (value: number, digits = 2): string => value.toFixed(digits);
const int = (value: number): string => Math.round(value).toLocaleString('ru-RU');

const markdown = (report: BenchReport): string => {
  const lines = [
    '| Алгоритм | Время, мс | нс / пиксель | нс / отрезок | Мпикс/с |',
    '|---|---:|---:|---:|---:|',
    ...report.rows.map(
      (row) =>
        `| ${row.name} | ${fmt(row.medianMs)} | ${row.nsPerPixel.toFixed(2)} | ${int(row.nsPerSegment)} | ${row.megapixelsPerSecond.toFixed(1)} |`,
    ),
  ];
  return lines.join('\n');
};

console.log(`Node ${process.version} · ${os.cpus()[0]?.model ?? 'unknown CPU'} · ${os.platform()} ${os.arch()}`);
console.log(`Отрезков: ${options.segments}, повторов: ${options.reps}, maxLen: ${options.maxLen}\n`);
console.log('RAW\n' + markdown(raw));
console.log('\nTRACE\n' + markdown(trace));
console.log(
  `\nCIRCLE (300 окружностей): ${fmt(circle.rows[0].medianMs)} мс, ${circle.rows[0].nsPerPixel.toFixed(2)} нс/px, ${circle.rows[0].megapixelsPerSecond.toFixed(1)} Мпикс/с, ${int(circle.rows[0].pixels)} px`,
);

fs.writeFileSync(
  'bench.json',
  JSON.stringify(
    {
      measuredAt: new Date().toISOString(),
      runtime: `Node ${process.version}`,
      cpu: os.cpus()[0]?.model ?? 'unknown',
      raw,
      trace,
      circle,
    },
    null,
    2,
  ),
);
fs.writeFileSync('bench.md', `## Без трассировки\n\n${markdown(raw)}\n\n## С трассировкой\n\n${markdown(trace)}\n`);
console.log('\nСохранено: bench.json, bench.md');

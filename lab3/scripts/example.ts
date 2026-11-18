import fs from 'node:fs';
import { rasterStepByStep, rasterDda, rasterBresenham } from '../src/core/line.ts';
import { rasterCircleBresenham } from '../src/core/circle.ts';
import { rasterWu } from '../src/core/wu.ts';

const line = { x0: -4, y0: -3, x1: 8, y1: 4 };
const step = rasterStepByStep(line);
const dda = rasterDda(line);
const bresenham = rasterBresenham(line);
const wu = rasterWu(line);
const circle = rasterCircleBresenham({ cx: 0, cy: 0, r: 7 });

const data = {
  line,
  step: step.steps.map((s) => s.values),
  dda: dda.steps.map((s) => s.values),
  bresenham: bresenham.steps.map((s) => s.values),
  wu: wu.steps.map((s) => s.values),
  circle: {
    r: 7,
    rows: circle.steps.map((s) => s.values),
  },
};

fs.writeFileSync('examples.json', JSON.stringify(data, null, 2));
console.log('examples.json:', data.step.length, 'step,', data.dda.length, 'dda,', data.bresenham.length, 'bresenham,', data.wu.length, 'wu,', data.circle.rows.length, 'circle');
console.log('Bresenham d0 =', data.bresenham[0].d, 'circle p0 =', data.circle.rows[0].p);

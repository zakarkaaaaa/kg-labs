import type { CircleParams, LineParams, RasterResult } from '../core/types.ts';

export interface View {
  cx: number;
  cy: number;
  scale: number;
}

export interface SceneToggles {
  grid: boolean;
  labels: boolean;
  ideal: boolean;
  ghost: boolean;
}

export interface Scene {
  width: number;
  height: number;
  dpr: number;
  view: View;
  result: RasterResult;
  revealed: number;
  color: string;
  kind: 'line' | 'circle';
  line: LineParams;
  circle: CircleParams;
  hover: { x: number; y: number } | null;
  toggles: SceneToggles;
}

const BG = '#05070f';

export const worldToScreen = (
  view: View,
  width: number,
  height: number,
  x: number,
  y: number,
): { x: number; y: number } => ({
  x: width / 2 + (x - view.cx) * view.scale,
  y: height / 2 - (y - view.cy) * view.scale,
});

export const screenToWorld = (
  view: View,
  width: number,
  height: number,
  sx: number,
  sy: number,
): { x: number; y: number } => ({
  x: (sx - width / 2) / view.scale + view.cx,
  y: (height / 2 - sy) / view.scale + view.cy,
});

const niceStep = (target: number): number => {
  const exponent = Math.floor(Math.log10(target));
  const base = 10 ** exponent;
  const normalized = target / base;
  if (normalized <= 1) return base;
  if (normalized <= 2) return 2 * base;
  if (normalized <= 5) return 5 * base;
  return 10 * base;
};

const formatTick = (value: number, step: number): string => {
  if (step >= 1) return String(Math.round(value));
  const digits = Math.min(2, Math.ceil(-Math.log10(step)));
  return value.toFixed(digits);
};

const hexToRgba = (hex: string, alpha: number): string => {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const drawGrid = (ctx: CanvasRenderingContext2D, scene: Scene): void => {
  const { width, height, view, toggles, color } = scene;
  const minorStep = niceStep(20 / view.scale);
  const majorStep = niceStep(92 / view.scale);

  const xMin = view.cx - width / (2 * view.scale);
  const xMax = view.cx + width / (2 * view.scale);
  const yMin = view.cy - height / (2 * view.scale);
  const yMax = view.cy + height / (2 * view.scale);

  ctx.save();
  ctx.lineWidth = 1;

  if (toggles.grid) {
    for (let i = Math.ceil(xMin / minorStep); i * minorStep <= xMax; i += 1) {
      const worldX = i * minorStep;
      if (Math.abs(worldX) < 1e-9) continue;
      const { x } = worldToScreen(view, width, height, worldX, 0);
      const isMajor = Math.abs(worldX / majorStep - Math.round(worldX / majorStep)) < 1e-6;
      ctx.strokeStyle = isMajor ? 'rgba(148, 163, 184, 0.16)' : 'rgba(148, 163, 184, 0.07)';
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let i = Math.ceil(yMin / minorStep); i * minorStep <= yMax; i += 1) {
      const worldY = i * minorStep;
      if (Math.abs(worldY) < 1e-9) continue;
      const { y } = worldToScreen(view, width, height, 0, worldY);
      const isMajor = Math.abs(worldY / majorStep - Math.round(worldY / majorStep)) < 1e-6;
      ctx.strokeStyle = isMajor ? 'rgba(148, 163, 184, 0.16)' : 'rgba(148, 163, 184, 0.07)';
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }

  // Оси
  const origin = worldToScreen(view, width, height, 0, 0);
  const axisX = Math.min(height, Math.max(0, origin.y));
  const axisY = Math.min(width, Math.max(0, origin.x));

  ctx.strokeStyle = 'rgba(226, 232, 240, 0.55)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(0, axisX);
  ctx.lineTo(width - 2, axisX);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(axisY, 0);
  ctx.lineTo(axisY, height);
  ctx.stroke();

  // Подсветка осей (под подписями)
  ctx.strokeStyle = hexToRgba(color, 0.16);
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, axisX);
  ctx.lineTo(width, axisX);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(axisY, 0);
  ctx.lineTo(axisY, height);
  ctx.stroke();

  // Стрелки осей
  const arrow = (x: number, y: number, dx: number, dy: number): void => {
    ctx.fillStyle = 'rgba(226, 232, 240, 0.7)';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 9 * dx + 4 * dy, y - 9 * dy + 4 * dx);
    ctx.lineTo(x - 9 * dx - 4 * dy, y - 9 * dy - 4 * dx);
    ctx.closePath();
    ctx.fill();
  };
  if (axisX < height - 2) arrow(width - 2, axisX, 1, 0);
  if (axisY > 2) arrow(axisY, 0, 0, 1);

  ctx.fillStyle = 'rgba(226, 232, 240, 0.6)';
  ctx.font = '600 11px "JetBrains Mono Variable", monospace';
  if (axisX < height - 24) ctx.fillText('X', width - 18, axisX - 10);
  if (axisY > 18) ctx.fillText('Y', axisY + 10, 16);

  if (toggles.labels) {
    ctx.font = '10px "JetBrains Mono Variable", monospace';
    ctx.fillStyle = 'rgba(148, 163, 184, 0.75)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const labelY = Math.min(height - 16, Math.max(12, axisX + 6));
    for (let i = Math.ceil(xMin / majorStep); i * majorStep <= xMax; i += 1) {
      const worldX = i * majorStep;
      const { x } = worldToScreen(view, width, height, worldX, 0);
      if (Math.abs(worldX) < 1e-9) continue;
      if (x < -8 || x > width + 8) continue;
      ctx.textAlign = x < 26 ? 'left' : x > width - 26 ? 'right' : 'center';
      ctx.fillText(formatTick(worldX, majorStep), x < 26 ? x + 2 : x > width - 26 ? x - 2 : x, labelY);
    }

    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const labelX = Math.min(width - 8, Math.max(24, axisY - 8));
    for (let i = Math.ceil(yMin / majorStep); i * majorStep <= yMax; i += 1) {
      const worldY = i * majorStep;
      const { y } = worldToScreen(view, width, height, 0, worldY);
      if (Math.abs(worldY) < 1e-9) continue;
      if (y < 14 || y > height - 14) continue;
      ctx.fillText(formatTick(worldY, majorStep), labelX, y);
    }

    // Подпись нуля
    if (origin.x > 14 && origin.x < width - 14 && origin.y > 10 && origin.y < height - 10) {
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillStyle = 'rgba(148, 163, 184, 0.55)';
      ctx.fillText('0', origin.x - 4, origin.y + 5);
    }
  }

  ctx.restore();
};

const drawIdeal = (ctx: CanvasRenderingContext2D, scene: Scene): void => {
  const { width, height, view, color, kind, line, circle } = scene;
  ctx.save();
  ctx.strokeStyle = hexToRgba(color, 0.42);
  ctx.lineWidth = 1.4;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();

  if (kind === 'line') {
    const a = worldToScreen(view, width, height, line.x0, line.y0);
    const b = worldToScreen(view, width, height, line.x1, line.y1);
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  } else {
    const center = worldToScreen(view, width, height, circle.cx, circle.cy);
    ctx.arc(center.x, center.y, Math.max(0.5, circle.r * view.scale), 0, Math.PI * 2);
  }
  ctx.stroke();
  ctx.restore();
};

const drawPixels = (ctx: CanvasRenderingContext2D, scene: Scene): void => {
  const { width, height, view, result, revealed, color, toggles } = scene;
  const scale = view.scale;
  const inset = Math.max(0.5, Math.min(scale * 0.1, 3.2));
  const radius = Math.max(1.5, Math.min(scale * 0.22, 5));

  if (toggles.ghost) {
    const seen = new Set<string>();
    ctx.fillStyle = 'rgba(148, 163, 184, 0.055)';
    for (const pixel of result.pixels) {
      const key = `${pixel.x};${pixel.y}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const point = worldToScreen(view, width, height, pixel.x, pixel.y);
      ctx.beginPath();
      ctx.roundRect(
        point.x - scale / 2 + inset,
        point.y - scale / 2 + inset,
        scale - inset * 2,
        scale - inset * 2,
        radius,
      );
      ctx.fill();
    }
  }

  const currentStep = revealed - 1;
  const visible = new Set<string>();

  for (let stepIndex = 0; stepIndex < revealed; stepIndex += 1) {
    const step = result.steps[stepIndex];
    if (!step) continue;
    for (const pixel of step.plot) {
      const key = `${pixel.x};${pixel.y}:${pixel.alpha.toFixed(3)}`;
      if (visible.has(key)) continue;
      visible.add(key);
      const point = worldToScreen(view, width, height, pixel.x, pixel.y);
      const isCurrent = stepIndex === currentStep;
      const alpha = pixel.alpha;

      if (isCurrent) {
        ctx.save();
        ctx.shadowColor = hexToRgba(color, 0.85);
        ctx.shadowBlur = Math.min(24, scale * 0.55);
        ctx.fillStyle = hexToRgba(color, Math.min(1, 0.95 * alpha + 0.08));
        ctx.beginPath();
        ctx.roundRect(
          point.x - scale / 2 + inset,
          point.y - scale / 2 + inset,
          scale - inset * 2,
          scale - inset * 2,
          radius,
        );
        ctx.fill();
        ctx.restore();
      } else {
        ctx.fillStyle = hexToRgba(color, 0.9 * alpha);
        ctx.beginPath();
        ctx.roundRect(
          point.x - scale / 2 + inset,
          point.y - scale / 2 + inset,
          scale - inset * 2,
          scale - inset * 2,
          radius,
        );
        ctx.fill();
      }

      if (isCurrent && scale > 16) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.roundRect(
          point.x - scale / 2 + inset - 1,
          point.y - scale / 2 + inset - 1,
          scale - inset * 2 + 2,
          scale - inset * 2 + 2,
          radius + 1,
        );
        ctx.stroke();
      }
    }
  }
};

const drawHandles = (ctx: CanvasRenderingContext2D, scene: Scene): void => {
  const { width, height, view, color, kind, line, circle } = scene;
  const handles: Array<{ x: number; y: number; label: string; strong?: boolean }> = [];

  if (kind === 'line') {
    handles.push({ x: line.x0, y: line.y0, label: `(${line.x0}; ${line.y0})` });
    handles.push({ x: line.x1, y: line.y1, label: `(${line.x1}; ${line.y1})` });
  } else {
    handles.push({ x: circle.cx, y: circle.cy, label: `O(${circle.cx}; ${circle.cy})`, strong: true });
    handles.push({ x: circle.cx + circle.r, y: circle.cy, label: `R = ${circle.r}` });
  }

  ctx.save();
  ctx.font = '600 10px "JetBrains Mono Variable", monospace';
  ctx.textBaseline = 'middle';

  for (const handle of handles) {
    const point = worldToScreen(view, width, height, handle.x, handle.y);
    ctx.beginPath();
    ctx.arc(point.x, point.y, handle.strong ? 7 : 5.5, 0, Math.PI * 2);
    ctx.fillStyle = BG;
    ctx.fill();
    ctx.strokeStyle = hexToRgba(color, 0.95);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(point.x, point.y, handle.strong ? 2.2 : 1.8, 0, Math.PI * 2);
    ctx.fillStyle = '#f8fafc';
    ctx.fill();

    const labelWidth = ctx.measureText(handle.label).width + 12;
    const boxX = Math.min(width - labelWidth - 6, Math.max(6, point.x + 12));
    const boxY = Math.max(6, point.y - 26);
    ctx.fillStyle = 'rgba(8, 12, 24, 0.92)';
    ctx.strokeStyle = hexToRgba(color, 0.32);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, labelWidth, 18, 5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = hexToRgba(color, 0.95);
    ctx.textAlign = 'left';
    ctx.fillText(handle.label, boxX + 6, boxY + 9.5);
  }

  ctx.restore();
};

const drawHover = (ctx: CanvasRenderingContext2D, scene: Scene): void => {
  const { hover, width, height, view } = scene;
  if (!hover) return;
  const point = worldToScreen(view, width, height, hover.x, hover.y);
  ctx.save();
  ctx.strokeStyle = 'rgba(226, 232, 240, 0.28)';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 4]);
  ctx.beginPath();
  ctx.moveTo(0, point.y);
  ctx.lineTo(width, point.y);
  ctx.moveTo(point.x, 0);
  ctx.lineTo(point.x, height);
  ctx.stroke();
  ctx.restore();
};

export function drawScene(ctx: CanvasRenderingContext2D, scene: Scene): void {
  const { width, height, dpr } = scene;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  drawGrid(ctx, scene);
  if (scene.toggles.ideal) drawIdeal(ctx, scene);
  drawPixels(ctx, scene);
  drawHover(ctx, scene);
  drawHandles(ctx, scene);
}

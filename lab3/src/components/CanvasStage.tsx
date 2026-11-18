import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { AlgorithmMeta } from '../core/registry';
import type { CircleParams, LineParams, RasterResult } from '../core/types';
import { clamp } from '../core/types';
import {
  drawScene,
  screenToWorld,
  type SceneToggles,
  type View,
} from '../lib/draw';
import { FitIcon, ZoomInIcon, ZoomOutIcon } from './ui';

interface CanvasStageProps {
  meta: AlgorithmMeta;
  result: RasterResult;
  kind: 'line' | 'circle';
  line: LineParams;
  circle: CircleParams;
  view: View;
  onViewChange: (view: View) => void;
  revealed: number;
  toggles: SceneToggles;
  onLineChange: (line: LineParams) => void;
  onCircleChange: (circle: CircleParams) => void;
}

type DragMode = 'p0' | 'p1' | 'center' | 'radius' | 'pan';

interface DragState {
  mode: DragMode;
  startX: number;
  startY: number;
  startCx: number;
  startCy: number;
}

const HANDLE_RADIUS = 14;

const distance = (ax: number, ay: number, bx: number, by: number): number =>
  Math.hypot(ax - bx, ay - by);

export const CanvasStage = ({
  meta,
  result,
  kind,
  line,
  circle,
  view,
  onViewChange,
  revealed,
  toggles,
  onLineChange,
  onCircleChange,
}: CanvasStageProps) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const fitView = useCallback(() => {
    if (size.width < 40 || size.height < 40) return;
    const padding = 2.2;
    let minX: number;
    let maxX: number;
    let minY: number;
    let maxY: number;

    if (kind === 'line') {
      minX = Math.min(line.x0, line.x1) - padding;
      maxX = Math.max(line.x0, line.x1) + padding;
      minY = Math.min(line.y0, line.y1) - padding;
      maxY = Math.max(line.y0, line.y1) + padding;
    } else {
      const radius = Math.max(1, circle.r) + padding;
      minX = circle.cx - radius;
      maxX = circle.cx + radius;
      minY = circle.cy - radius;
      maxY = circle.cy + radius;
    }

    const spanX = Math.max(1, maxX - minX);
    const spanY = Math.max(1, maxY - minY);
    const scale = clamp(Math.min(size.width / spanX, size.height / spanY), 7, 96);
    onViewChange({ cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, scale });
  }, [circle, kind, line, onViewChange, size.height, size.width]);

  useEffect(() => {
    const element = wrapRef.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      setSize({ width: Math.max(0, Math.floor(rect.width)), height: Math.max(0, Math.floor(rect.height)) });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const fitRef = useRef(fitView);
  fitRef.current = fitView;

  useEffect(() => {
    if (size.width > 0 && size.height > 0) {
      fitRef.current();
    }
  }, [kind, size.height, size.width]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.width === 0 || size.height === 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    canvas.width = Math.round(size.width * dpr);
    canvas.height = Math.round(size.height * dpr);
    const context = canvas.getContext('2d');
    if (!context) return;
    drawScene(context, {
      width: size.width,
      height: size.height,
      dpr,
      view,
      result,
      revealed,
      color: meta.color,
      kind,
      line,
      circle,
      hover,
      toggles,
    });
  }, [circle, hover, kind, line, meta.color, result, revealed, size, toggles, view]);

  const zoomAt = useCallback(
    (factor: number, anchorX?: number, anchorY?: number) => {
      if (size.width === 0) return;
      const px = anchorX ?? size.width / 2;
      const py = anchorY ?? size.height / 2;
      const before = screenToWorld(view, size.width, size.height, px, py);
      const scale = clamp(view.scale * factor, 6, 180);
      onViewChange({
        scale,
        cx: before.x - (px - size.width / 2) / scale,
        cy: before.y + (py - size.height / 2) / scale,
      });
    },
    [onViewChange, size.height, size.width, view],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const factor = Math.exp(-event.deltaY * 0.0015);
      zoomAt(factor, event.clientX - rect.left, event.clientY - rect.top);
    };
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [zoomAt]);

  const eventPoint = (event: ReactPointerEvent<HTMLCanvasElement>): { x: number; y: number } => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const point = eventPoint(event);
    const world = screenToWorld(view, size.width, size.height, point.x, point.y);
    let mode: DragMode = 'pan';

    if (kind === 'line') {
      const p0 = { x: line.x0, y: line.y0 };
      const p1 = { x: line.x1, y: line.y1 };
      if (
        distance(point.x, point.y, size.width / 2 + (p0.x - view.cx) * view.scale, size.height / 2 - (p0.y - view.cy) * view.scale) <
        HANDLE_RADIUS
      ) {
        mode = 'p0';
      } else if (
        distance(point.x, point.y, size.width / 2 + (p1.x - view.cx) * view.scale, size.height / 2 - (p1.y - view.cy) * view.scale) <
        HANDLE_RADIUS
      ) {
        mode = 'p1';
      }
    } else {
      const centerX = size.width / 2 + (circle.cx - view.cx) * view.scale;
      const centerY = size.height / 2 - (circle.cy - view.cy) * view.scale;
      const radiusX = size.width / 2 + (circle.cx + circle.r - view.cx) * view.scale;
      if (distance(point.x, point.y, centerX, centerY) < HANDLE_RADIUS) mode = 'center';
      else if (distance(point.x, point.y, radiusX, centerY) < HANDLE_RADIUS) mode = 'radius';
    }

    dragRef.current = {
      mode,
      startX: event.clientX,
      startY: event.clientY,
      startCx: view.cx,
      startCy: view.cy,
    };
    event.currentTarget.setPointerCapture(event.pointerId);

    if (mode !== 'pan' && Number.isFinite(world.x)) {
      // Немедленно подхватываем точку под курсором, чтобы не было «прыжка».
      if (mode === 'p0') onLineChange({ ...line, x0: Math.round(world.x), y0: Math.round(world.y) });
      if (mode === 'p1') onLineChange({ ...line, x1: Math.round(world.x), y1: Math.round(world.y) });
      if (mode === 'center') onCircleChange({ ...circle, cx: Math.round(world.x), cy: Math.round(world.y) });
    }
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const point = eventPoint(event);
    const world = screenToWorld(view, size.width, size.height, point.x, point.y);
    const drag = dragRef.current;

    if (!drag) {
      setHover({ x: Math.round(world.x), y: Math.round(world.y) });
      return;
    }

    if (drag.mode === 'pan') {
      onViewChange({
        ...view,
        cx: drag.startCx - (event.clientX - drag.startX) / view.scale,
        cy: drag.startCy + (event.clientY - drag.startY) / view.scale,
      });
      return;
    }

    const x = clamp(Math.round(world.x), -60, 60);
    const y = clamp(Math.round(world.y), -60, 60);

    if (drag.mode === 'p0') onLineChange({ ...line, x0: x, y0: y });
    if (drag.mode === 'p1') onLineChange({ ...line, x1: x, y1: y });
    if (drag.mode === 'center') onCircleChange({ ...circle, cx: x, cy: y });
    if (drag.mode === 'radius') {
      const radius = clamp(Math.round(Math.hypot(world.x - circle.cx, world.y - circle.cy)), 1, 40);
      onCircleChange({ ...circle, r: radius });
    }
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const currentStep = revealed > 0 ? result.steps[revealed - 1] : undefined;
  const currentPixel = currentStep?.plot[0];
  const uniquePixels = new Set(result.pixels.map((pixel) => `${pixel.x};${pixel.y}`)).size;
  const progress = result.steps.length > 0 ? Math.round((revealed / result.steps.length) * 100) : 0;

  return (
    <div
      ref={wrapRef}
      className="stage"
      style={{ ['--algo' as string]: meta.color }}
      onDoubleClick={fitView}
    >
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={() => {
          if (!dragRef.current) setHover(null);
        }}
        onContextMenu={(event) => event.preventDefault()}
      />

      <div className="stage-overlay">
        <div className="overlay-row">
          <div className="overlay-chip">
            <span className="pixel-dot" />
            <span className="font-semibold text-mist-100">{meta.name}</span>
            <span className="dim mono text-[10px]">
              шаг {revealed} / {result.steps.length}
            </span>
          </div>

          <div className="overlay-controls">
            <button type="button" className="icon-btn" title="Приблизить" onClick={() => zoomAt(1.35)}>
              <ZoomInIcon />
            </button>
            <button type="button" className="icon-btn" title="Отдалить" onClick={() => zoomAt(1 / 1.35)}>
              <ZoomOutIcon />
            </button>
            <button type="button" className="icon-btn" title="Вписать в экран" onClick={fitView}>
              <FitIcon />
            </button>
          </div>
        </div>

        <div className="overlay-row" style={{ alignItems: 'flex-end' }}>
          <div className="overlay-meta">
            <span className="meta-pill">
              <span className="dim">пикселей</span> <strong>{uniquePixels}</strong>
            </span>
            <span className="meta-pill">
              <span className="dim">1 ед.</span> <strong>{Math.round(view.scale)} px</strong>
            </span>
            {currentPixel && (
              <span className="meta-pill">
                <span className="dim">текущий</span>{' '}
                <strong>
                  ({currentPixel.x}; {currentPixel.y})
                </strong>
                {currentPixel.alpha < 0.999 && (
                  <span className="dim">α {currentPixel.alpha.toFixed(2)}</span>
                )}
              </span>
            )}
            <span className="meta-pill">
              <span className="dim">прогресс</span> <strong>{progress}%</strong>
            </span>
          </div>

          <div className="meta-pill overlay-hint">
            колесо — масштаб · перетаскивание — сдвиг · 2× клик — вписать
          </div>
        </div>
      </div>
    </div>
  );
};

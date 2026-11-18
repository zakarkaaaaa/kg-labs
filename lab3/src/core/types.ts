export type AlgorithmId = 'step' | 'dda' | 'bresenham' | 'circle' | 'wu';

export interface Point {
  x: number;
  y: number;
}

export interface RasterPixel extends Point {
  /** 0..1 — доля покрытия пикселя (для сглаженных линий). */
  alpha: number;
  /** Номер шага, на котором пиксель был закрашен. */
  step: number;
}

export interface TraceStep {
  plot: RasterPixel[];
  values: Record<string, number | string>;
}

export type ColumnKind = 'int' | 'float' | 'bool' | 'text';

export interface TraceColumn {
  key: string;
  label: string;
  kind?: ColumnKind;
  hint?: string;
}

export interface RasterResult {
  steps: TraceStep[];
  pixels: RasterPixel[];
  columns: TraceColumn[];
  /** Короткое описание того, что видно на полотне. */
  legend: string;
  /** Дополнительные характеристики примера (k, gcd, длина и т.п.). */
  extra: Record<string, string | number>;
}

export interface LineParams {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface CircleParams {
  cx: number;
  cy: number;
  r: number;
}

export type FigureParams = LineParams | CircleParams;

export const roundHalfUp = (value: number): number => Math.floor(value + 0.5);

export const formatNumber = (value: number, digits = 3): string =>
  Number.isInteger(value) ? String(value) : value.toFixed(digits);

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

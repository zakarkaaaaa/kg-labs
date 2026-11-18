import React, { useEffect, useRef, useMemo } from 'react';
import type { ChannelHistograms } from '../utils/histogram';

interface SingleHistProps {
  label: string;
  hist: Uint32Array;
}

function calcStats(hist: Uint32Array) {
  let min = 255;
  let max = 0;
  let sum = 0;
  let count = 0;
  for (let i = 0; i < 256; i++) {
    const c = hist[i];
    if (c > 0) {
      if (i < min) min = i;
      if (i > max) max = i;
      sum += i * c;
      count += c;
    }
  }
  const mean = count > 0 ? Math.round(sum / count) : 0;
  return { min: count > 0 ? min : 0, max, mean };
}

const SingleHistogram: React.FC<SingleHistProps> = ({ label, hist }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stats = useMemo(() => calcStats(hist), [hist]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = 512;
    const h = 86;
    canvas.width = w;
    canvas.height = h;

    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, w, h);

    let peak = 0;
    for (let i = 0; i < 256; i++) {
      if (hist[i] > peak) peak = hist[i];
    }
    if (peak === 0) return;

    ctx.fillStyle = '#e5e5e5';
    const barW = w / 256;
    for (let i = 0; i < 256; i++) {
      const barH = (hist[i] / peak) * (h - 6);
      if (barH > 0) {
        ctx.fillRect(i * barW, h - barH, barW, barH);
      }
    }
  }, [hist]);

  return (
    <div className="hist-box">
      <div className="hist-head">
        <span>{label}</span>
        <span>
          [{stats.min}..{stats.max}] μ={stats.mean}
        </span>
      </div>
      <canvas ref={canvasRef} className="hist-canvas" />
    </div>
  );
};

interface HistogramViewProps {
  before: ChannelHistograms | null;
  after: ChannelHistograms | null;
}

export const HistogramView: React.FC<HistogramViewProps> = ({ before, after }) => {
  if (!before || !after) return null;

  return (
    <div className="hist-strip">
      <SingleHistogram label="ДО · Y" hist={before.luminance} />
      <SingleHistogram label="ПОСЛЕ · Y" hist={after.luminance} />
    </div>
  );
};

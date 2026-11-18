import React, { useEffect, useRef, useState } from 'react';

export type ViewMode = 'split' | 'side' | 'after';

interface CanvasImageProps {
  imageData: ImageData | null;
}

export const CanvasImage: React.FC<CanvasImageProps> = ({ imageData }) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !imageData) return;
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.putImageData(imageData, 0, 0);
  }, [imageData]);

  return <canvas ref={ref} />;
};

interface ImageCompareProps {
  original: ImageData | null;
  processed: ImageData | null;
  viewMode: ViewMode;
}

export const ImageCompare: React.FC<ImageCompareProps> = ({
  original,
  processed,
  viewMode,
}) => {
  const [splitPos, setSplitPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const updateSplit = (clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setSplitPos(Math.max(0, Math.min(100, pct)));
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (draggingRef.current) updateSplit(e.clientX);
    };
    const onUp = () => {
      draggingRef.current = false;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);

  if (!original || !processed) return null;

  if (viewMode === 'after') {
    return (
      <div className="img-frame">
        <CanvasImage imageData={processed} />
      </div>
    );
  }

  if (viewMode === 'side') {
    return (
      <div className="side-by-side">
        <div className="img-frame">
          <div className="img-frame-head">До</div>
          <CanvasImage imageData={original} />
        </div>
        <div className="img-frame">
          <div className="img-frame-head">После</div>
          <CanvasImage imageData={processed} />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="split-container"
      onPointerDown={(e) => {
        draggingRef.current = true;
        updateSplit(e.clientX);
      }}
    >
      <CanvasImage imageData={processed} />
      <div
        className="split-overlay"
        style={{ clipPath: `inset(0 ${100 - splitPos}% 0 0)` }}
      >
        <CanvasImage imageData={original} />
      </div>
      <div className="split-line" style={{ left: `${splitPos}%` }}>
        <div className="split-handle">↔</div>
      </div>
    </div>
  );
};

import React, { useRef, useEffect, useCallback } from 'react';
import { Box, Stack, Group, Tooltip, Slider, Text } from '@mantine/core';
import { CMYK, clamp } from '../utils/color';

interface CmykPaletteProps {
  cmyk: CMYK;
  onChange?: (cmyk: CMYK) => void;
  onSetChannel?: (channel: keyof CMYK, value: number) => void;
}

interface CmykProcessSwatch {
  name: string;
  cmyk: CMYK;
  cssColor: string;
}

const PROCESS_SWATCHES: CmykProcessSwatch[] = [
  { name: 'Cyan (C 100%)', cmyk: { c: 100, m: 0, y: 0, k: 0 }, cssColor: '#00ffff' },
  { name: 'Magenta (M 100%)', cmyk: { c: 0, m: 100, y: 0, k: 0 }, cssColor: '#ff00ff' },
  { name: 'Yellow (Y 100%)', cmyk: { c: 0, m: 0, y: 100, k: 0 }, cssColor: '#ffff00' },
  { name: 'Black (K 100%)', cmyk: { c: 0, m: 0, y: 0, k: 100 }, cssColor: '#000000' },
  { name: 'Синий (C+M)', cmyk: { c: 100, m: 100, y: 0, k: 0 }, cssColor: '#0000ff' },
  { name: 'Красный (M+Y)', cmyk: { c: 0, m: 100, y: 100, k: 0 }, cssColor: '#ff0000' },
  { name: 'Зеленый (C+Y)', cmyk: { c: 100, m: 0, y: 100, k: 0 }, cssColor: '#00ff00' },
  { name: 'Глубокий черный', cmyk: { c: 60, m: 40, y: 40, k: 100 }, cssColor: '#111111' },
];

export const CmykPalette: React.FC<CmykPaletteProps> = React.memo(({
  cmyk,
  onChange,
  onSetChannel,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rectRef = useRef<DOMRect | null>(null);
  const latestPosRef = useRef<{ x: number; y: number } | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const rafYRef = useRef<number | null>(null);
  const rafKRef = useRef<number | null>(null);
  const imgDataRef = useRef<ImageData | null>(null);
  const lastEmittedRef = useRef<{ c: number; m: number }>({ c: cmyk.c, m: cmyk.m });
  const cmykRef = useRef(cmyk);
  cmykRef.current = cmyk;

  const CW = 240;
  const CH = 120;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let imgData = imgDataRef.current;
    if (!imgData || imgData.width !== CW || imgData.height !== CH) {
      imgData = ctx.createImageData(CW, CH);
      imgDataRef.current = imgData;
    }
    const data32 = new Uint32Array(imgData.data.buffer);

    const yVal = cmyk.y / 100;
    const kVal = cmyk.k / 100;

    // Precalculate R lookup table (only depends on X and K)
    const rTable = new Uint8Array(CW);
    const factorK = 1 - kVal;
    for (let px = 0; px < CW; px++) {
      const cVal = px / (CW - 1);
      rTable[px] = Math.round((1 - cVal) * factorK * 255);
    }

    const b = Math.round((1 - yVal) * factorK * 255);

    let idx = 0;
    for (let py = 0; py < CH; py++) {
      const mVal = 1 - py / (CH - 1);
      const g = Math.round((1 - mVal) * factorK * 255);
      const gbPart = (255 << 24) | (b << 16) | (g << 8);

      for (let px = 0; px < CW; px++) {
        data32[idx++] = gbPart | rTable[px];
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }, [cmyk.y, cmyk.k]);

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
      if (rafYRef.current !== null) cancelAnimationFrame(rafYRef.current);
      if (rafKRef.current !== null) cancelAnimationFrame(rafKRef.current);
    };
  }, []);

  const updateFromCoords = useCallback(
    (clientX: number, clientY: number) => {
      const rect = rectRef.current || containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const px = clamp((clientX - rect.left) / rect.width, 0, 1);
      const py = clamp((clientY - rect.top) / rect.height, 0, 1);

      const c = Math.round(px * 100);
      const m = Math.round((1 - py) * 100);

      if (c === lastEmittedRef.current.c && m === lastEmittedRef.current.m) {
        return;
      }
      lastEmittedRef.current = { c, m };

      if (onChange) {
        onChange({ c, m, y: cmykRef.current.y, k: cmykRef.current.k });
      } else if (onSetChannel) {
        onSetChannel('c', c);
        onSetChannel('m', m);
      }
    },
    [onChange, onSetChannel]
  );

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    rectRef.current = containerRef.current?.getBoundingClientRect() || null;
    latestPosRef.current = { x: e.clientX, y: e.clientY };
    lastEmittedRef.current = { c: -1, m: -1 };
    updateFromCoords(e.clientX, e.clientY);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (rectRef.current !== null || e.buttons === 1) {
      latestPosRef.current = { x: e.clientX, y: e.clientY };
      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(() => {
          rafIdRef.current = null;
          if (latestPosRef.current) {
            updateFromCoords(latestPosRef.current.x, latestPosRef.current.y);
          }
        });
      }
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (latestPosRef.current) {
      updateFromCoords(latestPosRef.current.x, latestPosRef.current.y);
      latestPosRef.current = null;
    }
    rectRef.current = null;
  };

  const handleYChange = useCallback((val: number) => {
    if (val === cmykRef.current.y) return;
    if (rafYRef.current === null) {
      rafYRef.current = requestAnimationFrame(() => {
        rafYRef.current = null;
        if (onChange) {
          onChange({ ...cmykRef.current, y: val });
        } else if (onSetChannel) {
          onSetChannel('y', val);
        }
      });
    }
  }, [onChange, onSetChannel]);

  const handleYChangeEnd = useCallback((val: number) => {
    if (rafYRef.current !== null) {
      cancelAnimationFrame(rafYRef.current);
      rafYRef.current = null;
    }
    if (onChange) {
      onChange({ ...cmykRef.current, y: val });
    } else if (onSetChannel) {
      onSetChannel('y', val);
    }
  }, [onChange, onSetChannel]);

  const handleKChange = useCallback((val: number) => {
    if (val === cmykRef.current.k) return;
    if (rafKRef.current === null) {
      rafKRef.current = requestAnimationFrame(() => {
        rafKRef.current = null;
        if (onChange) {
          onChange({ ...cmykRef.current, k: val });
        } else if (onSetChannel) {
          onSetChannel('k', val);
        }
      });
    }
  }, [onChange, onSetChannel]);

  const handleKChangeEnd = useCallback((val: number) => {
    if (rafKRef.current !== null) {
      cancelAnimationFrame(rafKRef.current);
      rafKRef.current = null;
    }
    if (onChange) {
      onChange({ ...cmykRef.current, k: val });
    } else if (onSetChannel) {
      onSetChannel('k', val);
    }
  }, [onChange, onSetChannel]);

  const markerPercentX = cmyk.c;
  const markerPercentY = 100 - cmyk.m;

  const cNorm = cmyk.c / 100;
  const mNorm = cmyk.m / 100;
  const yNorm = cmyk.y / 100;
  const kNorm = cmyk.k / 100;

  const y0R = Math.round((1 - cNorm) * (1 - kNorm) * 255);
  const y0G = Math.round((1 - mNorm) * (1 - kNorm) * 255);
  const y0B = Math.round((1 - kNorm) * 255);

  const y1R = Math.round((1 - cNorm) * (1 - kNorm) * 255);
  const y1G = Math.round((1 - mNorm) * (1 - kNorm) * 255);
  const y1B = 0;

  const k0R = Math.round((1 - cNorm) * 255);
  const k0G = Math.round((1 - mNorm) * 255);
  const k0B = Math.round((1 - yNorm) * 255);

  return (
    <Stack gap="xs">
      <Box
        ref={containerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        title="Ось X: Cyan (0–100%), Ось Y: Magenta (0–100%)"
        style={{
          position: 'relative',
          height: 120,
          borderRadius: 6,
          cursor: 'crosshair',
          overflow: 'hidden',
          touchAction: 'none',
          userSelect: 'none',
          backgroundColor: '#111827',
          boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.12)',
        }}
      >
        <canvas
          ref={canvasRef}
          width={CW}
          height={CH}
          style={{ width: '100%', height: '100%', display: 'block' }}
        />

        <span
          style={{
            position: 'absolute',
            top: 3,
            left: 6,
            fontSize: 10,
            fontWeight: 700,
            color: '#ec4899',
            textShadow: '0 1px 3px rgba(0, 0, 0, 0.9)',
            pointerEvents: 'none',
          }}
        >
          M 100%
        </span>
        <span
          style={{
            position: 'absolute',
            bottom: 3,
            right: 6,
            fontSize: 10,
            fontWeight: 700,
            color: '#06b6d4',
            textShadow: '0 1px 3px rgba(0, 0, 0, 0.9)',
            pointerEvents: 'none',
          }}
        >
          C 100%
        </span>
        <span
          style={{
            position: 'absolute',
            bottom: 3,
            left: 6,
            fontSize: 9,
            fontWeight: 700,
            color: 'rgba(255, 255, 255, 0.8)',
            textShadow: '0 1px 3px rgba(0, 0, 0, 0.9)',
            pointerEvents: 'none',
          }}
        >
          0%
        </span>

        <Box
          style={{
            position: 'absolute',
            left: `${markerPercentX}%`,
            top: `${markerPercentY}%`,
            width: 14,
            height: 14,
            marginLeft: -7,
            marginTop: -7,
            borderRadius: '50%',
            border: '2px solid #ffffff',
            boxShadow: '0 0 4px rgba(0, 0, 0, 0.9), inset 0 0 2px rgba(0, 0, 0, 0.6)',
            pointerEvents: 'none',
            transform: 'translate3d(0,0,0)',
          }}
        />
      </Box>

      <Group gap="xs" align="center" wrap="nowrap">
        <Text size="xs" fw={700} c="#eab308" style={{ minWidth: 12 }}>
          Y
        </Text>
        <Slider
          value={cmyk.y}
          min={0}
          max={100}
          style={{ flex: 1 }}
          size="xs"
          thumbSize={14}
          color="yellow"
          styles={{
            track: {
              background: `linear-gradient(to right, rgb(${y0R}, ${y0G}, ${y0B}), rgb(${y1R}, ${y1G}, ${y1B}))`,
            },
          }}
          onChange={handleYChange}
          onChangeEnd={handleYChangeEnd}
        />
        <Text
          size="xs"
          c="dimmed"
          style={{ minWidth: 32, textAlign: 'right', fontFamily: 'var(--mantine-font-family-monospace)' }}
        >
          {cmyk.y}%
        </Text>
      </Group>

      <Group gap="xs" align="center" wrap="nowrap">
        <Text size="xs" fw={700} c="gray.4" style={{ minWidth: 12 }}>
          K
        </Text>
        <Slider
          value={cmyk.k}
          min={0}
          max={100}
          style={{ flex: 1 }}
          size="xs"
          thumbSize={14}
          color="dark"
          styles={{
            track: {
              background: `linear-gradient(to right, rgb(${k0R}, ${k0G}, ${k0B}), #000000)`,
            },
          }}
          onChange={handleKChange}
          onChangeEnd={handleKChangeEnd}
        />
        <Text
          size="xs"
          c="dimmed"
          style={{ minWidth: 32, textAlign: 'right', fontFamily: 'var(--mantine-font-family-monospace)' }}
        >
          {cmyk.k}%
        </Text>
      </Group>

      <Group gap={6} wrap="wrap">
        {PROCESS_SWATCHES.map((sw, idx) => {
          const isActive =
            cmyk.c === sw.cmyk.c &&
            cmyk.m === sw.cmyk.m &&
            cmyk.y === sw.cmyk.y &&
            cmyk.k === sw.cmyk.k;
          return (
            <Tooltip
              key={idx}
              label={`${sw.name}: C${sw.cmyk.c} M${sw.cmyk.m} Y${sw.cmyk.y} K${sw.cmyk.k}%`}
              withArrow
              position="top"
              openDelay={120}
            >
              <button
                type="button"
                onClick={() => {
                  if (onChange) onChange(sw.cmyk);
                  else if (onSetChannel) {
                    onSetChannel('c', sw.cmyk.c);
                    onSetChannel('m', sw.cmyk.m);
                    onSetChannel('y', sw.cmyk.y);
                    onSetChannel('k', sw.cmyk.k);
                  }
                }}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  backgroundColor: sw.cssColor,
                  border: isActive ? '2px solid #ffffff' : '1px solid rgba(255, 255, 255, 0.25)',
                  boxShadow: isActive ? '0 0 6px rgba(255, 255, 255, 0.8)' : 'none',
                  cursor: 'pointer',
                  padding: 0,
                  outline: 'none',
                }}
                aria-label={sw.name}
              />
            </Tooltip>
          );
        })}
      </Group>
    </Stack>
  );
});

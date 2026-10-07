import React, { useRef, useCallback, useEffect } from 'react';
import { Stack, Box, Group, Tooltip } from '@mantine/core';
import { HLS, clamp } from '../utils/color';

interface HlsPaletteProps {
  hls: HLS;
  onChange: (hls: HLS) => void;
}

interface HlsSpectralSwatch {
  name: string;
  hls: HLS;
  color: string;
}

const HLS_SPECTRAL_SWATCHES: HlsSpectralSwatch[] = [
  { name: 'Красный (0°)', hls: { h: 0, l: 50, s: 100 }, color: 'hsl(0, 100%, 50%)' },
  { name: 'Оранжевый (30°)', hls: { h: 30, l: 50, s: 100 }, color: 'hsl(30, 100%, 50%)' },
  { name: 'Желтый (60°)', hls: { h: 60, l: 50, s: 100 }, color: 'hsl(60, 100%, 50%)' },
  { name: 'Зеленый (120°)', hls: { h: 120, l: 50, s: 100 }, color: 'hsl(120, 100%, 50%)' },
  { name: 'Циан (180°)', hls: { h: 180, l: 50, s: 100 }, color: 'hsl(180, 100%, 50%)' },
  { name: 'Синий (240°)', hls: { h: 240, l: 50, s: 100 }, color: 'hsl(240, 100%, 50%)' },
  { name: 'Маджента (300°)', hls: { h: 300, l: 50, s: 100 }, color: 'hsl(300, 100%, 50%)' },
  { name: 'Серый (L50 S0)', hls: { h: 0, l: 50, s: 0 }, color: '#808080' },
];

export const HlsPalette: React.FC<HlsPaletteProps> = React.memo(({ hls, onChange }) => {
  const satLightRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const satRectRef = useRef<DOMRect | null>(null);
  const hueRectRef = useRef<DOMRect | null>(null);

  const satRafIdRef = useRef<number | null>(null);
  const hueRafIdRef = useRef<number | null>(null);

  const latestSatPosRef = useRef<{ x: number; y: number } | null>(null);
  const latestHuePosRef = useRef<{ x: number } | null>(null);

  const lastEmittedSatLightRef = useRef<{ s: number; l: number }>({ s: hls.s, l: hls.l });
  const lastEmittedHueRef = useRef<number>(hls.h);

  const hlsRef = useRef(hls);
  hlsRef.current = hls;

  useEffect(() => {
    return () => {
      if (satRafIdRef.current !== null) cancelAnimationFrame(satRafIdRef.current);
      if (hueRafIdRef.current !== null) cancelAnimationFrame(hueRafIdRef.current);
    };
  }, []);

  const updateSatLightFromCoords = useCallback(
    (clientX: number, clientY: number) => {
      const el = satLightRef.current;
      if (!el) return;

      const rect = satRectRef.current || el.getBoundingClientRect();
      const x = clamp((clientX - rect.left) / rect.width, 0, 1);
      const y = clamp((clientY - rect.top) / rect.height, 0, 1);

      const s = Math.round(x * 100);
      const l = Math.round((1 - y) * 100);

      if (s === lastEmittedSatLightRef.current.s && l === lastEmittedSatLightRef.current.l) {
        return;
      }
      lastEmittedSatLightRef.current = { s, l };

      onChange({ ...hlsRef.current, s, l });
    },
    [onChange]
  );

  const onSatLightDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    satRectRef.current = satLightRef.current?.getBoundingClientRect() || null;
    latestSatPosRef.current = { x: e.clientX, y: e.clientY };
    lastEmittedSatLightRef.current = { s: -1, l: -1 };
    updateSatLightFromCoords(e.clientX, e.clientY);
  };

  const onSatLightMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (satRectRef.current !== null || e.buttons === 1) {
      latestSatPosRef.current = { x: e.clientX, y: e.clientY };
      if (satRafIdRef.current === null) {
        satRafIdRef.current = requestAnimationFrame(() => {
          satRafIdRef.current = null;
          if (latestSatPosRef.current) {
            updateSatLightFromCoords(latestSatPosRef.current.x, latestSatPosRef.current.y);
          }
        });
      }
    }
  };

  const onSatLightUp = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    if (satRafIdRef.current !== null) {
      cancelAnimationFrame(satRafIdRef.current);
      satRafIdRef.current = null;
    }
    if (latestSatPosRef.current) {
      updateSatLightFromCoords(latestSatPosRef.current.x, latestSatPosRef.current.y);
      latestSatPosRef.current = null;
    }
    satRectRef.current = null;
  };

  const updateHueFromCoords = useCallback(
    (clientX: number) => {
      const el = hueRef.current;
      if (!el) return;

      const rect = hueRectRef.current || el.getBoundingClientRect();
      const x = clamp((clientX - rect.left) / rect.width, 0, 1);
      const h = Math.round(x * 360);

      if (h === lastEmittedHueRef.current) {
        return;
      }
      lastEmittedHueRef.current = h;

      onChange({ ...hlsRef.current, h });
    },
    [onChange]
  );

  const onHueDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    hueRectRef.current = hueRef.current?.getBoundingClientRect() || null;
    latestHuePosRef.current = { x: e.clientX };
    lastEmittedHueRef.current = -1;
    updateHueFromCoords(e.clientX);
  };

  const onHueMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (hueRectRef.current !== null || e.buttons === 1) {
      latestHuePosRef.current = { x: e.clientX };
      if (hueRafIdRef.current === null) {
        hueRafIdRef.current = requestAnimationFrame(() => {
          hueRafIdRef.current = null;
          if (latestHuePosRef.current) {
            updateHueFromCoords(latestHuePosRef.current.x);
          }
        });
      }
    }
  };

  const onHueUp = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    if (hueRafIdRef.current !== null) {
      cancelAnimationFrame(hueRafIdRef.current);
      hueRafIdRef.current = null;
    }
    if (latestHuePosRef.current) {
      updateHueFromCoords(latestHuePosRef.current.x);
      latestHuePosRef.current = null;
    }
    hueRectRef.current = null;
  };

  return (
    <Stack gap="xs">
      <Box
        ref={satLightRef}
        onPointerDown={onSatLightDown}
        onPointerMove={onSatLightMove}
        onPointerUp={onSatLightUp}
        onPointerCancel={onSatLightUp}
        style={{
          position: 'relative',
          height: 120,
          borderRadius: 6,
          cursor: 'crosshair',
          overflow: 'hidden',
          touchAction: 'none',
          userSelect: 'none',
          backgroundColor: `hsl(${hls.h}, 100%, 50%)`,
          boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.12)',
        }}
        title="Перетащите курсор для выбора Насыщенности (X) и Светлоты (Y)"
      >
        <Box
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to right, #808080, transparent)',
          }}
        />

        <Box
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(to top, #000000 0%, rgba(0, 0, 0, 0) 50%, rgba(255, 255, 255, 0) 50%, #ffffff 100%)',
          }}
        />

        <Box
          style={{
            position: 'absolute',
            left: `${hls.s}%`,
            top: `${100 - hls.l}%`,
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

      <Box
        ref={hueRef}
        onPointerDown={onHueDown}
        onPointerMove={onHueMove}
        onPointerUp={onHueUp}
        onPointerCancel={onHueUp}
        style={{
          position: 'relative',
          height: 14,
          borderRadius: 4,
          cursor: 'ew-resize',
          touchAction: 'none',
          userSelect: 'none',
          background:
            'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)',
          boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.1)',
        }}
        title="Перетащите ползунок для выбора тона H (0-360°)"
      >
        <Box
          style={{
            position: 'absolute',
            left: `${(hls.h / 360) * 100}%`,
            top: 0,
            bottom: 0,
            width: 8,
            marginLeft: -4,
            borderRadius: 2,
            backgroundColor: '#ffffff',
            border: '1px solid rgba(0, 0, 0, 0.5)',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.5)',
            pointerEvents: 'none',
          }}
        />
      </Box>

      <Group gap={6} wrap="wrap">
        {HLS_SPECTRAL_SWATCHES.map((sw, idx) => {
          const isActive =
            sw.hls.l === 0
              ? hls.l === 0
              : sw.hls.l === 100
              ? hls.l === 100
              : sw.hls.s === 0
              ? hls.s === 0
              : hls.h % 360 === sw.hls.h % 360 && hls.l === sw.hls.l && hls.s === sw.hls.s;
          return (
            <Tooltip
              key={idx}
              label={`${sw.name}: H${sw.hls.h}° L${sw.hls.l}% S${sw.hls.s}%`}
              withArrow
              position="top"
              openDelay={120}
            >
              <button
                type="button"
                onClick={() => onChange(sw.hls)}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  backgroundColor: sw.color,
                  border: isActive ? '2px solid #ffffff' : '1px solid rgba(255, 255, 255, 0.25)',
                  boxShadow: isActive ? '0 0 6px rgba(255, 255, 255, 0.8)' : 'none',
                  cursor: 'pointer',
                  padding: 0,
                  outline: 'none',
                  transition: 'transform 80ms ease, box-shadow 80ms ease',
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

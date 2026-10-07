import React, { useRef, useEffect, useCallback } from 'react';
import { Stack, ColorPicker, Group, Button, Tooltip } from '@mantine/core';
import { IconColorPicker } from '@tabler/icons-react';
import { RGB } from '../utils/color';

interface RgbPaletteProps {
  hex: string;
  rgb: RGB;
  onHexChange?: (hex: string) => void;
  onSetFullRgb?: (rgb: RGB) => void;
}

interface RgbSwatch {
  name: string;
  rgb: RGB;
  color: string;
}

const RGB_ADDITIVE_SWATCHES: RgbSwatch[] = [
  { name: 'Красный (Pure R)', rgb: { r: 255, g: 0, b: 0 }, color: '#ff0000' },
  { name: 'Зеленый (Pure G)', rgb: { r: 0, g: 255, b: 0 }, color: '#00ff00' },
  { name: 'Синий (Pure B)', rgb: { r: 0, g: 0, b: 255 }, color: '#0000ff' },
  { name: 'Желтый (R+G)', rgb: { r: 255, g: 255, b: 0 }, color: '#ffff00' },
  { name: 'Голубой (G+B)', rgb: { r: 0, g: 255, b: 255 }, color: '#00ffff' },
  { name: 'Пурпурный (R+B)', rgb: { r: 255, g: 0, b: 255 }, color: '#ff00ff' },
  { name: 'Белый (255)', rgb: { r: 255, g: 255, b: 255 }, color: '#ffffff' },
  { name: 'Черный (0)', rgb: { r: 0, g: 0, b: 0 }, color: '#000000' },
];

export const RgbPalette: React.FC<RgbPaletteProps> = React.memo(({
  hex,
  rgb,
  onHexChange,
  onSetFullRgb,
}) => {
  const nativeInputRef = useRef<HTMLInputElement>(null);
  const rafIdRef = useRef<number | null>(null);
  const latestHexRef = useRef<string | null>(null);
  const safeHexValue = hex.startsWith('#') && hex.length === 7 ? hex : '#3B82F6';

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  const handleColorPickerChange = useCallback(
    (val: string) => {
      latestHexRef.current = val;
      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(() => {
          rafIdRef.current = null;
          if (latestHexRef.current && onHexChange) {
            onHexChange(latestHexRef.current);
          }
        });
      }
    },
    [onHexChange]
  );

  const handleNativePicker = () => {
    if (!nativeInputRef.current) return;
    if ('showPicker' in HTMLInputElement.prototype) {
      try {
        nativeInputRef.current.showPicker();
      } catch {
        nativeInputRef.current.click();
      }
    } else {
      nativeInputRef.current.click();
    }
  };

  const handleSelectSwatch = (sw: RgbSwatch) => {
    if (onSetFullRgb) {
      onSetFullRgb(sw.rgb);
    } else if (onHexChange) {
      onHexChange(sw.color);
    }
  };

  return (
    <Stack gap="xs">
      <input
        ref={nativeInputRef}
        type="color"
        value={safeHexValue.toLowerCase()}
        onChange={(e) => onHexChange?.(e.target.value)}
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
        tabIndex={-1}
        aria-hidden="true"
      />

      <ColorPicker
        format="hex"
        value={safeHexValue}
        onChange={handleColorPickerChange}
        fullWidth
        size="xs"
      />

      <Group justify="space-between" align="center" wrap="nowrap" gap={6}>
        <Group gap={6} wrap="wrap" style={{ flex: 1 }}>
          {RGB_ADDITIVE_SWATCHES.map((sw, idx) => {
            const isActive =
              rgb.r === sw.rgb.r && rgb.g === sw.rgb.g && rgb.b === sw.rgb.b;
            return (
              <Tooltip
                key={idx}
                label={`${sw.name}: R${sw.rgb.r} G${sw.rgb.g} B${sw.rgb.b}`}
                withArrow
                position="top"
                openDelay={120}
              >
                <button
                  type="button"
                  onClick={() => handleSelectSwatch(sw)}
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

        <Tooltip label="Системный диалог цвета ОС" withArrow position="top">
          <Button
            size="compact-xs"
            variant="light"
            color="gray"
            leftSection={<IconColorPicker size={12} />}
            onClick={handleNativePicker}
            style={{ fontSize: 10, padding: '0 6px', height: 22 }}
          >
            ОС
          </Button>
        </Tooltip>
      </Group>
    </Stack>
  );
});

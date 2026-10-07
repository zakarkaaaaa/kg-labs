import React, { useCallback } from 'react';
import { SimpleGrid, Paper, Text, Divider, Stack } from '@mantine/core';
import { RGB, CMYK, HLS } from '../utils/color';
import { ModelChannel } from './ModelChannel';
import { CmykPalette } from './CmykPalette';
import { RgbPalette } from './RgbPalette';
import { HlsPalette } from './HlsPalette';

export interface ModelSectionProps {
  rgb: RGB;
  cmyk: CMYK;
  hls: HLS;
  hex: string;
  onRgbChange: (channel: keyof RGB, value: number) => void;
  onCmykChange: (channel: keyof CMYK, value: number) => void;
  onHlsChange: (channel: keyof HLS, value: number) => void;
  onSetFullRgb?: (rgb: RGB) => void;
  onSetFullCmyk?: (cmyk: CMYK) => void;
  onSetFullHls?: (hls: HLS) => void;
  onSetHex?: (hex: string) => void;
}

export const ModelSection: React.FC<ModelSectionProps> = React.memo(({
  rgb,
  cmyk,
  hls,
  hex,
  onRgbChange,
  onCmykChange,
  onHlsChange,
  onSetFullRgb,
  onSetFullCmyk,
  onSetFullHls,
  onSetHex,
}) => {
  const handleCmykC = useCallback((v: number) => onCmykChange('c', v), [onCmykChange]);
  const handleCmykM = useCallback((v: number) => onCmykChange('m', v), [onCmykChange]);
  const handleCmykY = useCallback((v: number) => onCmykChange('y', v), [onCmykChange]);
  const handleCmykK = useCallback((v: number) => onCmykChange('k', v), [onCmykChange]);

  const handleRgbR = useCallback((v: number) => onRgbChange('r', v), [onRgbChange]);
  const handleRgbG = useCallback((v: number) => onRgbChange('g', v), [onRgbChange]);
  const handleRgbB = useCallback((v: number) => onRgbChange('b', v), [onRgbChange]);

  const handleHlsH = useCallback((v: number) => onHlsChange('h', v), [onHlsChange]);
  const handleHlsL = useCallback((v: number) => onHlsChange('l', v), [onHlsChange]);
  const handleHlsS = useCallback((v: number) => onHlsChange('s', v), [onHlsChange]);

  const handleHlsPaletteChange = useCallback(
    (newHls: HLS) => {
      if (onSetFullHls) {
        onSetFullHls(newHls);
      } else {
        onHlsChange('h', newHls.h);
        onHlsChange('l', newHls.l);
        onHlsChange('s', newHls.s);
      }
    },
    [onSetFullHls, onHlsChange]
  );

  return (
    <Stack gap="md">
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        <Paper withBorder radius="md" p="md" bg="var(--mantine-color-dark-7)">
          <Text fw={700} size="sm" c="gray.1" mb="xs" style={{ letterSpacing: '0.04em' }}>
            CMYK
          </Text>
          <Divider mb="sm" color="dark.5" />

          <ModelChannel
            label="C"
            value={cmyk.c}
            min={0}
            max={100}
            suffix="%"
            trackGradient="linear-gradient(to right, #ffffff, #06b6d4)"
            thumbColor="#06b6d4"
            onChange={handleCmykC}
          />
          <ModelChannel
            label="M"
            value={cmyk.m}
            min={0}
            max={100}
            suffix="%"
            trackGradient="linear-gradient(to right, #ffffff, #ec4899)"
            thumbColor="#ec4899"
            onChange={handleCmykM}
          />
          <ModelChannel
            label="Y"
            value={cmyk.y}
            min={0}
            max={100}
            suffix="%"
            trackGradient="linear-gradient(to right, #ffffff, #eab308)"
            thumbColor="#eab308"
            onChange={handleCmykY}
          />
          <ModelChannel
            label="K"
            value={cmyk.k}
            min={0}
            max={100}
            suffix="%"
            trackGradient="linear-gradient(to right, #ffffff, #000000)"
            thumbColor="#475569"
            onChange={handleCmykK}
          />
        </Paper>

        <Paper withBorder radius="md" p="md" bg="var(--mantine-color-dark-7)">
          <Text fw={700} size="sm" c="gray.1" mb="xs" style={{ letterSpacing: '0.04em' }}>
            RGB
          </Text>
          <Divider mb="sm" color="dark.5" />

          <ModelChannel
            label="R"
            value={rgb.r}
            min={0}
            max={255}
            trackGradient={`linear-gradient(to right, rgb(0, ${rgb.g}, ${rgb.b}), rgb(255, ${rgb.g}, ${rgb.b}))`}
            thumbColor="#ef4444"
            onChange={handleRgbR}
          />
          <ModelChannel
            label="G"
            value={rgb.g}
            min={0}
            max={255}
            trackGradient={`linear-gradient(to right, rgb(${rgb.r}, 0, ${rgb.b}), rgb(${rgb.r}, 255, ${rgb.b}))`}
            thumbColor="#22c55e"
            onChange={handleRgbG}
          />
          <ModelChannel
            label="B"
            value={rgb.b}
            min={0}
            max={255}
            trackGradient={`linear-gradient(to right, rgb(${rgb.r}, ${rgb.g}, 0), rgb(${rgb.r}, ${rgb.g}, 255))`}
            thumbColor="#3b82f6"
            onChange={handleRgbB}
          />
        </Paper>

        <Paper withBorder radius="md" p="md" bg="var(--mantine-color-dark-7)">
          <Text fw={700} size="sm" c="gray.1" mb="xs" style={{ letterSpacing: '0.04em' }}>
            HLS
          </Text>
          <Divider mb="sm" color="dark.5" />

          <ModelChannel
            label="H"
            value={hls.h}
            min={0}
            max={360}
            suffix="°"
            trackGradient="linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)"
            thumbColor={`hsl(${hls.h}, 90%, 55%)`}
            onChange={handleHlsH}
          />
          <ModelChannel
            label="L"
            value={hls.l}
            min={0}
            max={100}
            suffix="%"
            trackGradient={`linear-gradient(to right, #000000 0%, hsl(${hls.h}, ${hls.s}%, 50%) 50%, #ffffff 100%)`}
            thumbColor="#f8fafc"
            onChange={handleHlsL}
          />
          <ModelChannel
            label="S"
            value={hls.s}
            min={0}
            max={100}
            suffix="%"
            trackGradient={`linear-gradient(to right, hsl(${hls.h}, 0%, ${hls.l}%), hsl(${hls.h}, 100%, ${hls.l}%))`}
            thumbColor="#a855f7"
            onChange={handleHlsS}
          />
        </Paper>
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        <Paper withBorder radius="md" p="md" bg="var(--mantine-color-dark-7)">
          <Text fw={700} size="sm" c="gray.1" mb="xs" style={{ letterSpacing: '0.04em' }}>
            Палитра CMYK
          </Text>
          <Divider mb="sm" color="dark.5" />

          <CmykPalette
            cmyk={cmyk}
            onChange={onSetFullCmyk}
            onSetChannel={onCmykChange}
          />
        </Paper>

        <Paper withBorder radius="md" p="md" bg="var(--mantine-color-dark-7)">
          <Text fw={700} size="sm" c="gray.1" mb="xs" style={{ letterSpacing: '0.04em' }}>
            Палитра RGB
          </Text>
          <Divider mb="sm" color="dark.5" />

          <RgbPalette
            hex={hex}
            rgb={rgb}
            onHexChange={onSetHex}
            onSetFullRgb={onSetFullRgb}
          />
        </Paper>

        <Paper withBorder radius="md" p="md" bg="var(--mantine-color-dark-7)">
          <Text fw={700} size="sm" c="gray.1" mb="xs" style={{ letterSpacing: '0.04em' }}>
            Палитра HLS
          </Text>
          <Divider mb="sm" color="dark.5" />

          <HlsPalette
            hls={hls}
            onChange={handleHlsPaletteChange}
          />
        </Paper>
      </SimpleGrid>
    </Stack>
  );
});

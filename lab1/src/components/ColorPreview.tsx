import React, { useState } from 'react';
import {
  Paper,
  Group,
  Text,
  ActionIcon,
  Tooltip,
  CopyButton,
  Badge,
  Box,
  rem,
} from '@mantine/core';
import {
  IconCopy,
  IconCheck,
  IconColorPicker,
  IconAlertTriangle,
} from '@tabler/icons-react';
import { NormalizedRGB, GamutInfo, getContrastColor } from '../utils/color';

interface ColorPreviewProps {
  hex: string;
  normalized: NormalizedRGB;
  gamutInfo?: GamutInfo;
  onPickColor?: (hex: string) => void;
}

export const ColorPreview: React.FC<ColorPreviewProps> = React.memo(({
  hex,
  normalized,
  gamutInfo,
  onPickColor,
}) => {
  const contrast = getContrastColor(normalized);
  const [hasEyeDropper] = useState(() => typeof window !== 'undefined' && 'EyeDropper' in window);

  const handleEyeDropper = async () => {
    if (!hasEyeDropper || !onPickColor) return;
    try {
      const eyeDropper = new (window as any).EyeDropper();
      const result = await eyeDropper.open();
      if (result?.sRGBHex) {
        onPickColor(result.sRGBHex);
      }
    } catch {
    }
  };

  const isOutside = gamutInfo?.isOutside;

  return (
    <Paper
      withBorder
      radius="md"
      p="md"
      style={{
        backgroundColor: hex,
        color: contrast,
        position: 'relative',
        minHeight: isOutside ? 150 : 110,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxShadow: 'inset 0 0 0 1px rgba(0, 0, 0, 0.08)',
      }}
    >
      <Group justify="space-between" align="flex-start">
        <Text
          size="xs"
          fw={700}
          style={{
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            opacity: 0.85,
            fontFamily: 'var(--mantine-font-family-monospace)',
          }}
        >
          Active Color
        </Text>

        <Group gap={6}>
          {hasEyeDropper && onPickColor && (
            <Tooltip label="Пипетка с экрана" withArrow position="bottom">
              <ActionIcon
                variant="subtle"
                color={contrast === '#f8fafc' ? 'gray.0' : 'dark.8'}
                onClick={handleEyeDropper}
                size="md"
                radius="sm"
                aria-label="Пипетка"
              >
                <IconColorPicker style={{ width: rem(18), height: rem(18) }} />
              </ActionIcon>
            </Tooltip>
          )}

          <CopyButton value={hex} timeout={1800}>
            {({ copied, copy }) => (
              <Tooltip
                label={copied ? 'Скопировано!' : 'Копировать HEX'}
                withArrow
                position="bottom-end"
                transitionProps={{ transition: 'fade', duration: 100 }}
                styles={{
                  tooltip: {
                    whiteSpace: 'nowrap',
                    minWidth: 105,
                    textAlign: 'center',
                    lineHeight: '1.2',
                  },
                }}
              >
                <ActionIcon
                  variant="subtle"
                  color={contrast === '#f8fafc' ? 'gray.0' : 'dark.8'}
                  onClick={copy}
                  size="md"
                  radius="sm"
                  aria-label="Copy HEX"
                >
                  {copied ? (
                    <IconCheck style={{ width: rem(18), height: rem(18) }} />
                  ) : (
                    <IconCopy style={{ width: rem(18), height: rem(18) }} />
                  )}
                </ActionIcon>
              </Tooltip>
            )}
          </CopyButton>
        </Group>
      </Group>

      <div>
        <Text
          fw={800}
          style={{
            fontSize: rem(28),
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            fontFamily: 'var(--mantine-font-family-monospace)',
            userSelect: 'all',
          }}
        >
          {hex}
        </Text>

        {isOutside && (
          <Box
            mt="xs"
            p="xs"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.72)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(234, 179, 8, 0.5)',
              borderRadius: 6,
              color: '#fef08a',
            }}
          >
            <Group justify="space-between" align="center" gap="xs">
              <Group gap={6}>
                <IconAlertTriangle size={15} color="#eab308" />
                <Text size="xs" fw={700} style={{ letterSpacing: '0.02em' }}>
                  Outside the sRGB gamut
                </Text>
              </Group>
              <Badge size="xs" variant="filled" color="yellow.8">
                Fallback: {gamutInfo?.fallbackHex}
              </Badge>
            </Group>

            {gamutInfo?.originalChroma !== undefined && gamutInfo?.reducedChroma !== undefined && (
              <Text
                size="10px"
                mt={3}
                style={{
                  fontFamily: 'var(--mantine-font-family-monospace)',
                  opacity: 0.9,
                }}
              >
                Chroma reduced ({gamutInfo.originalChroma} → {gamutInfo.reducedChroma}), Lightness & Hue preserved
              </Text>
            )}
          </Box>
        )}
      </div>
    </Paper>
  );
});

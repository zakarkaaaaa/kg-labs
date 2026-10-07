import React, { useCallback } from 'react';
import {
  Container,
  Stack,
  Grid,
  Group,
  Paper,
  ActionIcon,
  Tooltip,
  Divider,
} from '@mantine/core';
import { IconRotateDot } from '@tabler/icons-react';
import { useColorState } from './hooks/useColorState';
import { ColorPreview } from './components/ColorPreview';
import { ColorDistributionGraph } from './components/ColorDistributionGraph';
import { ModelSection } from './components/ModelSection';

interface PresetItem {
  id: string;
  color: string;
  isWideGamut?: boolean;
  oklch?: { l: number; c: number; h: number };
  tooltip?: string;
}

const PRESET_ITEMS: PresetItem[] = [
  { id: 'red', color: '#EF4444' },
  { id: 'green', color: '#22C55E' },
  { id: 'blue', color: '#3B82F6' },
  { id: 'cyan', color: '#06B6D4' },
  { id: 'magenta', color: '#EC4899' },
  { id: 'yellow', color: '#EAB308' },
  { id: 'black', color: '#000000' },
  { id: 'white', color: '#FFFFFF' },
  { id: 'gray', color: '#6B7280' },
  {
    id: 'p3-green',
    color: 'oklch(85% 0.30 145)',
    isWideGamut: true,
    oklch: { l: 85, c: 0.30, h: 145 },
    tooltip: 'P3 Vivid Green (Outside sRGB)',
  },
  {
    id: 'p3-pink',
    color: 'oklch(65% 0.34 328)',
    isWideGamut: true,
    oklch: { l: 65, c: 0.34, h: 328 },
    tooltip: 'P3 Hyper Magenta (Outside sRGB)',
  },
  {
    id: 'p3-cyan',
    color: 'oklch(88% 0.22 195)',
    isWideGamut: true,
    oklch: { l: 88, c: 0.22, h: 195 },
    tooltip: 'P3 Laser Cyan (Outside sRGB)',
  },
];

export const App: React.FC = () => {
  const {
    rgb,
    cmyk,
    hls,
    hex,
    normalized,
    gamutInfo,
    setRgbChannel,
    setCmykChannel,
    setHlsChannel,
    setFullHls,
    setFullRgb,
    setFullCmyk,
    setHex,
    setOklchColor,
  } = useColorState();

  const handleReset = () => {
    setHex('#3B82F6');
  };

  const handleSelectPreset = useCallback(
    (item: PresetItem) => {
      if (item.isWideGamut && item.oklch) {
        setOklchColor(item.oklch.l, item.oklch.c, item.oklch.h, item.color);
      } else {
        setHex(item.color);
      }
    },
    [setOklchColor, setHex]
  );

  return (
    <Container size="lg" py="xl" px="md">
      <Stack gap="md">
        <Group justify="flex-end" align="center" wrap="wrap" gap="sm">
          <Group gap="xs">
            <Tooltip label="Сбросить цвет (#3B82F6)" position="left">
              <ActionIcon variant="subtle" color="gray" onClick={handleReset} size="sm">
                <IconRotateDot size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>

        <Grid gap="md">
          <Grid.Col span={{ base: 12, md: 5 }}>
            <Stack gap="sm" justify="space-between" style={{ height: '100%' }}>
              <ColorPreview
                hex={hex}
                normalized={normalized}
                gamutInfo={gamutInfo}
                onPickColor={setHex}
              />

              <Paper withBorder radius="md" p="xs" bg="var(--mantine-color-dark-7)">
                <Group gap={6} justify="center" wrap="nowrap" style={{ width: '100%', overflowX: 'auto' }}>
                  {PRESET_ITEMS.map((item, idx) => {
                    const isGroupDivider = idx === 9;
                    return (
                      <React.Fragment key={item.id}>
                        {isGroupDivider && (
                          <Divider orientation="vertical" style={{ height: 22, margin: '0 2px' }} />
                        )}
                        <BoxPreset
                          item={item}
                          isActive={
                            gamutInfo.isOutside && item.isWideGamut
                              ? gamutInfo.originalColorStr === item.color
                              : hex.toLowerCase() === item.color.toLowerCase()
                          }
                          onSelect={handleSelectPreset}
                        />
                      </React.Fragment>
                    );
                  })}
                </Group>
              </Paper>
            </Stack>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 7 }}>
            <Paper
              withBorder
              radius="md"
              p="md"
              bg="var(--mantine-color-dark-7)"
              style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ColorDistributionGraph rgb={rgb} cmyk={cmyk} hls={hls} />
            </Paper>
          </Grid.Col>
        </Grid>

        <ModelSection
          rgb={rgb}
          cmyk={cmyk}
          hls={hls}
          hex={hex}
          onRgbChange={setRgbChannel}
          onCmykChange={setCmykChannel}
          onHlsChange={setHlsChannel}
          onSetFullRgb={setFullRgb}
          onSetFullCmyk={setFullCmyk}
          onSetFullHls={setFullHls}
          onSetHex={setHex}
        />
      </Stack>
    </Container>
  );
};

interface BoxPresetProps {
  item: PresetItem;
  isActive: boolean;
  onSelect: (item: PresetItem) => void;
}

const BoxPreset: React.FC<BoxPresetProps> = React.memo(({ item, isActive, onSelect }) => {
  const handleClick = useCallback(() => {
    onSelect(item);
  }, [onSelect, item]);

  const btn = (
    <button
      type="button"
      onClick={handleClick}
      style={{
        position: 'relative',
        width: 24,
        height: 24,
        flexShrink: 0,
        borderRadius: 5,
        backgroundColor: item.color,
        border: isActive
          ? '2px solid #ffffff'
          : item.isWideGamut
          ? '1px dashed rgba(234, 179, 8, 0.7)'
          : '1px solid rgba(255, 255, 255, 0.15)',
        boxShadow: isActive ? '0 0 8px rgba(255, 255, 255, 0.4)' : 'none',
        cursor: 'pointer',
        padding: 0,
        outline: 'none',
        transition: 'transform 100ms ease, box-shadow 100ms ease',
      }}
      aria-label={item.tooltip || `Preset ${item.color}`}
    >
      {item.isWideGamut && (
        <span
          style={{
            position: 'absolute',
            bottom: 2,
            right: 2,
            width: 4,
            height: 4,
            borderRadius: '50%',
            backgroundColor: '#eab308',
          }}
        />
      )}
    </button>
  );

  if (item.tooltip) {
    return (
      <Tooltip label={item.tooltip} withArrow position="top">
        {btn}
      </Tooltip>
    );
  }

  return btn;
});

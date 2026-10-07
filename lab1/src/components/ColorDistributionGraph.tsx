import React from 'react';
import { Box } from '@mantine/core';
import { RGB, CMYK, HLS } from '../utils/color';

interface ColorDistributionGraphProps {
  rgb: RGB;
  cmyk: CMYK;
  hls: HLS;
}

interface BarData {
  label: string;
  valuePercent: number;
  displayValue: string;
  color: string;
  group: 'RGB' | 'CMYK' | 'HLS';
}

export const ColorDistributionGraph: React.FC<ColorDistributionGraphProps> = React.memo(({ rgb, cmyk, hls }) => {
  const bars: BarData[] = [
    {
      label: 'C',
      valuePercent: cmyk.c,
      displayValue: `${cmyk.c}%`,
      color: '#06b6d4',
      group: 'CMYK',
    },
    {
      label: 'M',
      valuePercent: cmyk.m,
      displayValue: `${cmyk.m}%`,
      color: '#ec4899',
      group: 'CMYK',
    },
    {
      label: 'Y',
      valuePercent: cmyk.y,
      displayValue: `${cmyk.y}%`,
      color: '#eab308',
      group: 'CMYK',
    },
    {
      label: 'K',
      valuePercent: cmyk.k,
      displayValue: `${cmyk.k}%`,
      color: '#64748b',
      group: 'CMYK',
    },

    {
      label: 'R',
      valuePercent: (rgb.r / 255) * 100,
      displayValue: `${rgb.r}`,
      color: '#ef4444',
      group: 'RGB',
    },
    {
      label: 'G',
      valuePercent: (rgb.g / 255) * 100,
      displayValue: `${rgb.g}`,
      color: '#22c55e',
      group: 'RGB',
    },
    {
      label: 'B',
      valuePercent: (rgb.b / 255) * 100,
      displayValue: `${rgb.b}`,
      color: '#3b82f6',
      group: 'RGB',
    },

    {
      label: 'H',
      valuePercent: (hls.h / 360) * 100,
      displayValue: `${hls.h}°`,
      color: `hsl(${hls.h}, 90%, 55%)`,
      group: 'HLS',
    },
    {
      label: 'L',
      valuePercent: hls.l,
      displayValue: `${hls.l}%`,
      color: '#f8fafc',
      group: 'HLS',
    },
    {
      label: 'S',
      valuePercent: hls.s,
      displayValue: `${hls.s}%`,
      color: '#a855f7',
      group: 'HLS',
    },
  ];

  return (
    <Box style={{ width: '100%', padding: '4px 8px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: 6,
          height: 160,
        }}
      >
        {bars.map((bar, idx) => {
          const isGroupStart = idx === 4 || idx === 7;

          return (
            <React.Fragment key={bar.label + bar.group}>
              {isGroupStart && (
                <div
                  style={{
                    width: 1.5,
                    height: 115,
                    backgroundColor: 'var(--mantine-color-dark-4)',
                    margin: '0 6px',
                    borderRadius: 1,
                    flexShrink: 0,
                  }}
                />
              )}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  alignItems: 'center',
                  flex: 1,
                  height: '100%',
                  justifyContent: 'flex-end',
                }}
              >
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--mantine-color-dimmed)',
                    fontFamily: 'var(--mantine-font-family-monospace)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {bar.displayValue}
                </span>

                <div
                  style={{
                    width: '100%',
                    maxWidth: 36,
                    height: 100,
                    backgroundColor: 'var(--mantine-color-dark-6)',
                    borderRadius: 4,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.05)',
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      height: `${Math.max(bar.valuePercent, 2)}%`,
                      backgroundColor: bar.color,
                      borderRadius: 4,
                    }}
                  />
                </div>

                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--mantine-color-gray-2)',
                    fontFamily: 'var(--mantine-font-family-monospace)',
                  }}
                >
                  {bar.label}
                </span>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </Box>
  );
});

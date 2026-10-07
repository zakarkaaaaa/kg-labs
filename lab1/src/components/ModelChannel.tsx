import React, { useRef, useCallback, useEffect } from 'react';
import { Group, Text, NumberInput, Slider, Box } from '@mantine/core';

interface ModelChannelProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  trackGradient?: string;
  thumbColor?: string;
  onChange: (value: number) => void;
}

export const ModelChannel: React.FC<ModelChannelProps> = React.memo(({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = '',
  trackGradient,
  thumbColor,
  onChange,
}) => {
  const rafRef = useRef<number | null>(null);
  const latestValRef = useRef<number>(value);
  const lastEmittedRef = useRef<number>(value);
  lastEmittedRef.current = value;

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const handleSliderChange = useCallback((val: number) => {
    latestValRef.current = val;
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        if (latestValRef.current !== lastEmittedRef.current) {
          lastEmittedRef.current = latestValRef.current;
          onChange(latestValRef.current);
        }
      });
    }
  }, [onChange]);

  const handleSliderChangeEnd = useCallback((val: number) => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (val !== lastEmittedRef.current) {
      lastEmittedRef.current = val;
      onChange(val);
    }
  }, [onChange]);

  const handleInputChange = useCallback((val: string | number) => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const num = typeof val === 'number' ? val : parseFloat(val) || 0;
    if (num !== lastEmittedRef.current) {
      lastEmittedRef.current = num;
      onChange(num);
    }
  }, [onChange]);

  return (
    <Box mb="xs">
      <Group justify="space-between" mb={4}>
        <Text
          size="sm"
          fw={700}
          c="gray.3"
          style={{
            fontFamily: 'var(--mantine-font-family-monospace)',
            width: 20,
          }}
        >
          {label}
        </Text>

        <NumberInput
          value={value}
          onChange={handleInputChange}
          min={min}
          max={max}
          step={step}
          clampBehavior="strict"
          suffix={suffix}
          size="xs"
          styles={{
            input: {
              width: 82,
              textAlign: 'right',
              fontFamily: 'var(--mantine-font-family-monospace)',
              fontWeight: 600,
              fontSize: 12,
              paddingRight: 24,
              paddingLeft: 6,
            },
          }}
        />
      </Group>

      <Slider
        className="custom-color-slider"
        style={{ '--custom-track-gradient': trackGradient } as React.CSSProperties}
        value={value}
        onChange={handleSliderChange}
        onChangeEnd={handleSliderChangeEnd}
        min={min}
        max={max}
        step={step}
        label={null}
        size="sm"
        thumbSize={14}
        styles={{
          thumb: {
            backgroundColor: thumbColor || 'var(--mantine-color-blue-6)',
            borderColor: '#ffffff',
            borderWidth: 2,
            boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
          },
        }}
      />
    </Box>
  );
});

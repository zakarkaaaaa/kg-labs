import { useEffect, useState, type ReactNode } from 'react';

interface IconProps {
  size?: number;
  strokeWidth?: number;
}

const Svg = ({ children, size = 16, strokeWidth = 1.8 }: IconProps & { children: ReactNode }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

export const PlayIcon = ({ size = 18 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M8 5.5v13a1 1 0 0 0 1.53.85l10-6.5a1 1 0 0 0 0-1.7l-10-6.5A1 1 0 0 0 8 5.5Z" />
  </svg>
);

export const PauseIcon = ({ size = 18 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <rect x="6" y="5" width="4" height="14" rx="1.2" />
    <rect x="14" y="5" width="4" height="14" rx="1.2" />
  </svg>
);

export const StepBackIcon = ({ size = 15 }: IconProps) => (
  <Svg size={size}>
    <path d="M18 6 10 12l8 6V6Z" fill="currentColor" stroke="none" />
    <path d="M6 5v14" />
  </Svg>
);

export const StepForwardIcon = ({ size = 15 }: IconProps) => (
  <Svg size={size}>
    <path d="m6 6 8 6-8 6V6Z" fill="currentColor" stroke="none" />
    <path d="M18 5v14" />
  </Svg>
);

export const ResetIcon = ({ size = 15 }: IconProps) => (
  <Svg size={size}>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5" />
  </Svg>
);

export const ZoomInIcon = ({ size = 15 }: IconProps) => (
  <Svg size={size}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5M8 11h6M11 8v6" />
  </Svg>
);

export const ZoomOutIcon = ({ size = 15 }: IconProps) => (
  <Svg size={size}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5M8 11h6" />
  </Svg>
);

export const FitIcon = ({ size = 15 }: IconProps) => (
  <Svg size={size}>
    <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
  </Svg>
);

export const GridIcon = ({ size = 15 }: IconProps) => (
  <Svg size={size}>
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <path d="M4 10h16M4 15h16M10 4v16M15 4v16" />
  </Svg>
);

export const DiceIcon = ({ size = 15 }: IconProps) => (
  <Svg size={size}>
    <rect x="4" y="4" width="16" height="16" rx="3" />
    <circle cx="9" cy="9" r="1" fill="currentColor" />
    <circle cx="15" cy="15" r="1" fill="currentColor" />
    <circle cx="15" cy="9" r="1" fill="currentColor" />
    <circle cx="9" cy="15" r="1" fill="currentColor" />
  </Svg>
);

export const DownloadIcon = ({ size = 15 }: IconProps) => (
  <Svg size={size}>
    <path d="M12 4v11M7.5 11.5 12 16l4.5-4.5M5 19h14" />
  </Svg>
);

export const InfoIcon = ({ size = 15 }: IconProps) => (
  <Svg size={size}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </Svg>
);

export const BookIcon = ({ size = 15 }: IconProps) => (
  <Svg size={size}>
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5V5.5Z" />
    <path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20" />
  </Svg>
);

export const ChartIcon = ({ size = 15 }: IconProps) => (
  <Svg size={size}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </Svg>
);

export const CursorIcon = ({ size = 15 }: IconProps) => (
  <Svg size={size}>
    <path d="m5 3 6.5 17 2.4-6.6L20.5 11 5 3Z" />
  </Svg>
);

export const SparkIcon = ({ size = 15 }: IconProps) => (
  <Svg size={size}>
    <path d="m12 3 1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4L12 3Z" />
    <path d="M18.5 15.5 19.4 18l2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9.9-2.5Z" />
  </Svg>
);

export const CheckIcon = ({ size = 14 }: IconProps) => (
  <Svg size={size}>
    <path d="m5 12 4.5 4.5L19 7" />
  </Svg>
);

interface SwitchProps {
  on: boolean;
  onChange: (value: boolean) => void;
  label?: string;
}

export const Switch = ({ on, onChange, label }: SwitchProps) => (
  <button
    type="button"
    className="switch"
    data-on={on}
    role="switch"
    aria-checked={on}
    aria-label={label}
    onClick={() => onChange(!on)}
  />
);

interface NumberFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

export const NumberField = ({ label, value, min, max, onChange }: NumberFieldProps) => {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  return (
    <label className="field-label">
      {label}
      <input
        className="field"
        type="text"
        inputMode="numeric"
        value={text}
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          if (next.trim() === '' || next === '-') return;
          const parsed = Number(next);
          if (Number.isFinite(parsed)) {
            onChange(Math.min(max, Math.max(min, Math.round(parsed))));
          }
        }}
        onBlur={() => setText(String(value))}
      />
    </label>
  );
};

interface SegmentedProps<T extends string> {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  className?: string;
}

export function Segmented<T extends string>({ value, options, onChange, className }: SegmentedProps<T>) {
  return (
    <div className={className ?? 'nav'} role="tablist">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={option.value === value}
          className={className === 'nav' ? 'nav-item' : 'dock-tab'}
          data-active={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

import { useState, useCallback, useMemo, useRef } from 'react';
import {
  RGB,
  CMYK,
  HLS,
  HSV,
  NormalizedRGB,
  GamutInfo,
  rgbToNormalized,
  normalizedToRgb,
  cmykToNormalized,
  normalizedToCmyk,
  hlsToNormalized,
  normalizedToHls,
  normalizedToHsv,
  normalizedToHex,
  hexToNormalized,
  mapOklchToSrgb,
  getContrastColor,
  clamp,
} from '../utils/color';

export interface ColorState {
  rgb: RGB;
  cmyk: CMYK;
  hls: HLS;
  hsv: HSV;
  hex: string;
  normalized: NormalizedRGB;
  contrastColor: string;
  gamutInfo: GamutInfo;
  setRgbChannel: (channel: keyof RGB, value: number) => void;
  setCmykChannel: (channel: keyof CMYK, value: number) => void;
  setHlsChannel: (channel: keyof HLS, value: number) => void;
  setHex: (hex: string) => boolean;
  setFullHls: (hls: HLS) => void;
  setFullRgb: (rgb: RGB) => void;
  setFullCmyk: (cmyk: CMYK) => void;
  setOklchColor: (l: number, c: number, h: number, rawColor?: string) => void;
  setNormalizedColor: (norm: NormalizedRGB, isOutside?: boolean) => void;
}

const INITIAL_HEX = '#3B82F6';
const initialNorm = hexToNormalized(INITIAL_HEX)!;
const initialRgb = normalizedToRgb(initialNorm);
const initialCmyk = normalizedToCmyk(initialNorm);
const initialHls = normalizedToHls(initialNorm);
const initialHsv = normalizedToHsv(initialNorm);

export function useColorState(): ColorState {
  const [rgb, setRgb] = useState<RGB>(initialRgb);
  const [cmyk, setCmyk] = useState<CMYK>(initialCmyk);
  const [hls, setHls] = useState<HLS>(initialHls);
  const [hsv, setHsv] = useState<HSV>(initialHsv);
  const [gamutInfo, setGamutInfo] = useState<GamutInfo>({
    isOutside: false,
    fallbackHex: INITIAL_HEX,
  });

  const rgbRef = useRef<RGB>(initialRgb);
  rgbRef.current = rgb;
  const cmykRef = useRef<CMYK>(initialCmyk);
  cmykRef.current = cmyk;
  const hlsRef = useRef<HLS>(initialHls);
  hlsRef.current = hls;
  const gamutInfoRef = useRef<GamutInfo>(gamutInfo);
  gamutInfoRef.current = gamutInfo;

  const resetGamutIfNeeded = useCallback(() => {
    if (gamutInfoRef.current.isOutside || gamutInfoRef.current.fallbackHex !== '') {
      const clean: GamutInfo = { isOutside: false, fallbackHex: '' };
      gamutInfoRef.current = clean;
      setGamutInfo(clean);
    }
  }, []);

  const normalized = useMemo<NormalizedRGB>(() => {
    return rgbToNormalized(rgb);
  }, [rgb]);

  const hex = useMemo(() => {
    return normalizedToHex(normalized);
  }, [normalized]);

  const contrastColor = useMemo(() => {
    return getContrastColor(normalized);
  }, [normalized]);

  const setRgbChannel = useCallback(
    (channel: keyof RGB, val: number) => {
      const sanitized = Math.round(clamp(val, 0, 255));
      if (rgbRef.current[channel] === sanitized) return;
      const nextRgb = { ...rgbRef.current, [channel]: sanitized };
      rgbRef.current = nextRgb;
      const norm = rgbToNormalized(nextRgb);
      const nextCmyk = normalizedToCmyk(norm);
      cmykRef.current = nextCmyk;
      const nextHls = normalizedToHls(norm, hlsRef.current.h);
      hlsRef.current = nextHls;
      const nextHsv = normalizedToHsv(norm, hlsRef.current.h);

      resetGamutIfNeeded();
      setRgb(nextRgb);
      setCmyk(nextCmyk);
      setHls(nextHls);
      setHsv(nextHsv);
    },
    [resetGamutIfNeeded]
  );

  const setFullRgb = useCallback((newRgb: RGB) => {
    const sanitized: RGB = {
      r: Math.round(clamp(newRgb.r, 0, 255)),
      g: Math.round(clamp(newRgb.g, 0, 255)),
      b: Math.round(clamp(newRgb.b, 0, 255)),
    };
    const prev = rgbRef.current;
    if (prev.r === sanitized.r && prev.g === sanitized.g && prev.b === sanitized.b) {
      return;
    }
    rgbRef.current = sanitized;
    const norm = rgbToNormalized(sanitized);
    const nextCmyk = normalizedToCmyk(norm);
    cmykRef.current = nextCmyk;
    const nextHls = normalizedToHls(norm, hlsRef.current.h);
    hlsRef.current = nextHls;
    const nextHsv = normalizedToHsv(norm, hlsRef.current.h);

    resetGamutIfNeeded();
    setRgb(sanitized);
    setCmyk(nextCmyk);
    setHls(nextHls);
    setHsv(nextHsv);
  }, [resetGamutIfNeeded]);

  const setCmykChannel = useCallback(
    (channel: keyof CMYK, val: number) => {
      const sanitized = Math.round(clamp(val, 0, 100));
      if (cmykRef.current[channel] === sanitized) return;
      const nextCmyk = { ...cmykRef.current, [channel]: sanitized };
      cmykRef.current = nextCmyk;
      const norm = cmykToNormalized(nextCmyk);
      const nextRgb = normalizedToRgb(norm);
      rgbRef.current = nextRgb;
      const nextHls = normalizedToHls(norm, hlsRef.current.h);
      hlsRef.current = nextHls;
      const nextHsv = normalizedToHsv(norm, hlsRef.current.h);

      resetGamutIfNeeded();
      setCmyk(nextCmyk);
      setRgb(nextRgb);
      setHls(nextHls);
      setHsv(nextHsv);
    },
    [resetGamutIfNeeded]
  );

  const setFullCmyk = useCallback((newCmyk: CMYK) => {
    const sanitized: CMYK = {
      c: Math.round(clamp(newCmyk.c, 0, 100)),
      m: Math.round(clamp(newCmyk.m, 0, 100)),
      y: Math.round(clamp(newCmyk.y, 0, 100)),
      k: Math.round(clamp(newCmyk.k, 0, 100)),
    };
    const prev = cmykRef.current;
    if (prev.c === sanitized.c && prev.m === sanitized.m && prev.y === sanitized.y && prev.k === sanitized.k) {
      return;
    }
    cmykRef.current = sanitized;
    const norm = cmykToNormalized(sanitized);
    const nextRgb = normalizedToRgb(norm);
    rgbRef.current = nextRgb;
    const nextHls = normalizedToHls(norm, hlsRef.current.h);
    hlsRef.current = nextHls;
    const nextHsv = normalizedToHsv(norm, hlsRef.current.h);

    resetGamutIfNeeded();
    setCmyk(sanitized);
    setRgb(nextRgb);
    setHls(nextHls);
    setHsv(nextHsv);
  }, [resetGamutIfNeeded]);

  const setHlsChannel = useCallback(
    (channel: keyof HLS, val: number) => {
      const maxVal = channel === 'h' ? 360 : 100;
      const sanitized = Math.round(clamp(val, 0, maxVal));
      if (hlsRef.current[channel] === sanitized) return;
      const nextHls = { ...hlsRef.current, [channel]: sanitized };
      hlsRef.current = nextHls;
      const norm = hlsToNormalized(nextHls);
      const nextRgb = normalizedToRgb(norm);
      rgbRef.current = nextRgb;
      const nextCmyk = normalizedToCmyk(norm);
      cmykRef.current = nextCmyk;
      const nextHsv = normalizedToHsv(norm, nextHls.h);

      resetGamutIfNeeded();
      setHls(nextHls);
      setRgb(nextRgb);
      setCmyk(nextCmyk);
      setHsv(nextHsv);
    },
    [resetGamutIfNeeded]
  );

  const setFullHls = useCallback((newHls: HLS) => {
    const sanitized: HLS = {
      h: Math.round(clamp(newHls.h, 0, 360)),
      l: Math.round(clamp(newHls.l, 0, 100)),
      s: Math.round(clamp(newHls.s, 0, 100)),
    };
    const prev = hlsRef.current;
    if (prev.h === sanitized.h && prev.l === sanitized.l && prev.s === sanitized.s) {
      return;
    }
    hlsRef.current = sanitized;
    const norm = hlsToNormalized(sanitized);
    const nextRgb = normalizedToRgb(norm);
    rgbRef.current = nextRgb;
    const nextCmyk = normalizedToCmyk(norm);
    cmykRef.current = nextCmyk;
    const nextHsv = normalizedToHsv(norm, sanitized.h);

    resetGamutIfNeeded();
    setHls(sanitized);
    setRgb(nextRgb);
    setCmyk(nextCmyk);
    setHsv(nextHsv);
  }, [resetGamutIfNeeded]);

  const setHex = useCallback((inputHex: string): boolean => {
    const norm = hexToNormalized(inputHex);
    if (!norm) return false;
    const nextRgb = normalizedToRgb(norm);
    const prevRgb = rgbRef.current;
    if (prevRgb.r === nextRgb.r && prevRgb.g === nextRgb.g && prevRgb.b === nextRgb.b) {
      return true;
    }
    rgbRef.current = nextRgb;
    const nextCmyk = normalizedToCmyk(norm);
    cmykRef.current = nextCmyk;
    const nextHls = normalizedToHls(norm, hlsRef.current.h);
    hlsRef.current = nextHls;
    const nextHsv = normalizedToHsv(norm, hlsRef.current.h);

    resetGamutIfNeeded();
    setRgb(nextRgb);
    setCmyk(nextCmyk);
    setHls(nextHls);
    setHsv(nextHsv);
    return true;
  }, [resetGamutIfNeeded]);

  const setOklchColor = useCallback((l: number, c: number, h: number, rawColor?: string) => {
    const mapped = mapOklchToSrgb(l, c, h);
    const fallbackHex = normalizedToHex(mapped.rgb);

    if (mapped.isOutside) {
      const nextInfo = {
        isOutside: true,
        fallbackHex,
        originalColorStr: rawColor || `oklch(${l}% ${c} ${h})`,
        originalChroma: c,
        reducedChroma: mapped.clampedC,
      };
      gamutInfoRef.current = nextInfo;
      setGamutInfo(nextInfo);
    } else {
      resetGamutIfNeeded();
    }

    const nextRgb = normalizedToRgb(mapped.rgb);
    rgbRef.current = nextRgb;
    const nextCmyk = normalizedToCmyk(mapped.rgb);
    cmykRef.current = nextCmyk;
    const nextHls = normalizedToHls(mapped.rgb, hlsRef.current.h);
    hlsRef.current = nextHls;
    const nextHsv = normalizedToHsv(mapped.rgb, hlsRef.current.h);

    setRgb(nextRgb);
    setCmyk(nextCmyk);
    setHls(nextHls);
    setHsv(nextHsv);
  }, [resetGamutIfNeeded]);

  const setNormalizedColor = useCallback((norm: NormalizedRGB, isOutside = false) => {
    const nextRgb = normalizedToRgb(norm);
    rgbRef.current = nextRgb;
    const nextCmyk = normalizedToCmyk(norm);
    cmykRef.current = nextCmyk;
    const nextHls = normalizedToHls(norm, hlsRef.current.h);
    hlsRef.current = nextHls;
    const nextHsv = normalizedToHsv(norm, hlsRef.current.h);

    if (isOutside) {
      const nextInfo = {
        isOutside: true,
        fallbackHex: normalizedToHex(norm),
        originalColorStr: `cie-xy(${norm.r.toFixed(2)}, ${norm.g.toFixed(2)}, ${norm.b.toFixed(2)})`,
      };
      gamutInfoRef.current = nextInfo;
      setGamutInfo(nextInfo);
    } else {
      resetGamutIfNeeded();
    }
    setRgb(nextRgb);
    setCmyk(nextCmyk);
    setHls(nextHls);
    setHsv(nextHsv);
  }, [resetGamutIfNeeded]);

  return {
    rgb,
    cmyk,
    hls,
    hsv,
    hex,
    normalized,
    contrastColor,
    gamutInfo,
    setRgbChannel,
    setCmykChannel,
    setHlsChannel,
    setHex,
    setFullHls,
    setFullRgb,
    setFullCmyk,
    setOklchColor,
    setNormalizedColor,
  };
}

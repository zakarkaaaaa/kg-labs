export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface CMYK {
  c: number;
  m: number;
  y: number;
  k: number;
}

export interface HSV {
  h: number;
  s: number;
  v: number;
}

export interface HLS {
  h: number;
  l: number;
  s: number;
}

export interface OKLCH {
  l: number;
  c: number;
  h: number;
}

export interface GamutInfo {
  isOutside: boolean;
  fallbackHex: string;
  originalColorStr?: string;
  reducedChroma?: number;
  originalChroma?: number;
}

export interface NormalizedRGB {
  r: number;
  g: number;
  b: number;
}

export function clamp(val: number, min: number, max: number): number {
  if (Number.isNaN(val)) return min;
  if (val > max) return max;
  if (val < min) return min;
  return val;
}

export function rgbToNormalized(rgb: RGB): NormalizedRGB {
  return {
    r: clamp(rgb.r / 255, 0, 1),
    g: clamp(rgb.g / 255, 0, 1),
    b: clamp(rgb.b / 255, 0, 1),
  };
}

export function normalizedToRgb(n: NormalizedRGB): RGB {
  return {
    r: Math.round(clamp(n.r * 255, 0, 255)),
    g: Math.round(clamp(n.g * 255, 0, 255)),
    b: Math.round(clamp(n.b * 255, 0, 255)),
  };
}

export function normalizedToCmyk(n: NormalizedRGB): CMYK {
  const r = clamp(n?.r ?? 0, 0, 1);
  const g = clamp(n?.g ?? 0, 0, 1);
  const b = clamp(n?.b ?? 0, 0, 1);

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);

  if (max <= 1e-4) {
    return { c: 0, m: 0, y: 0, k: 100 };
  }

  if (min >= 1 - 1e-4) {
    return { c: 0, m: 0, y: 0, k: 0 };
  }

  const k = 1 - max;

  if (max - min <= 1e-4) {
    return {
      c: 0,
      m: 0,
      y: 0,
      k: Math.round(clamp(k * 100, 0, 100)),
    };
  }

  const c = (max - r) / max;
  const m = (max - g) / max;
  const y = (max - b) / max;

  return {
    c: Math.round(clamp(c * 100, 0, 100)),
    m: Math.round(clamp(m * 100, 0, 100)),
    y: Math.round(clamp(y * 100, 0, 100)),
    k: Math.round(clamp(k * 100, 0, 100)),
  };
}

export function cmykToNormalized(cmyk: CMYK): NormalizedRGB {
  const c = clamp((cmyk?.c ?? 0) / 100, 0, 1);
  const m = clamp((cmyk?.m ?? 0) / 100, 0, 1);
  const y = clamp((cmyk?.y ?? 0) / 100, 0, 1);
  const k = clamp((cmyk?.k ?? 0) / 100, 0, 1);

  if (k >= 1) {
    return { r: 0, g: 0, b: 0 };
  }

  const factor = 1 - k;
  const r = (1 - c) * factor;
  const g = (1 - m) * factor;
  const b = (1 - y) * factor;

  return {
    r: clamp(r, 0, 1),
    g: clamp(g, 0, 1),
    b: clamp(b, 0, 1),
  };
}

export function normalizedToHsv(n: NormalizedRGB, fallbackHue = 0): HSV {
  const r = clamp(n.r, 0, 1);
  const g = clamp(n.g, 0, 1);
  const b = clamp(n.b, 0, 1);

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const v = max;

  const safeFallback = Number.isFinite(fallbackHue) ? ((fallbackHue % 360) + 360) % 360 : 0;
  const wants360 = Math.round(fallbackHue) === 360;

  if (max <= 1e-4) {
    return {
      h: wants360 ? 360 : Math.round(safeFallback),
      s: 0,
      v: 0,
    };
  }

  if (delta <= 1e-4) {
    return {
      h: wants360 ? 360 : Math.round(safeFallback),
      s: 0,
      v: Math.round(clamp(v * 100, 0, 100)),
    };
  }

  const s = delta / max;

  let h = safeFallback;
  if (Math.abs(max - r) < 1e-6) {
    h = 60 * (((g - b) / delta) % 6);
  } else if (Math.abs(max - g) < 1e-6) {
    h = 60 * ((b - r) / delta + 2);
  } else {
    h = 60 * ((r - g) / delta + 4);
  }

  if (h < 0) {
    h += 360;
  }

  let finalH = Math.round(clamp(h, 0, 360)) % 360;
  if (finalH === 0 && wants360) {
    finalH = 360;
  }

  return {
    h: finalH,
    s: Math.round(clamp(s * 100, 0, 100)),
    v: Math.round(clamp(v * 100, 0, 100)),
  };
}

export function hsvToNormalized(hsv: HSV): NormalizedRGB {
  const rawH = Number.isFinite(hsv.h) ? hsv.h : 0;
  const h = ((rawH % 360) + 360) % 360;
  const s = clamp(hsv.s / 100, 0, 1);
  const v = clamp(hsv.v / 100, 0, 1);

  if (v <= 0) return { r: 0, g: 0, b: 0 };
  if (s <= 0) return { r: v, g: v, b: v };

  const c = v * s;
  const hPrime = h / 60;
  const x = c * (1 - Math.abs((hPrime % 2) - 1));
  const m = v - c;

  let r1 = 0;
  let g1 = 0;
  let b1 = 0;

  if (hPrime >= 0 && hPrime < 1) {
    r1 = c;
    g1 = x;
    b1 = 0;
  } else if (hPrime >= 1 && hPrime < 2) {
    r1 = x;
    g1 = c;
    b1 = 0;
  } else if (hPrime >= 2 && hPrime < 3) {
    r1 = 0;
    g1 = c;
    b1 = x;
  } else if (hPrime >= 3 && hPrime < 4) {
    r1 = 0;
    g1 = x;
    b1 = c;
  } else if (hPrime >= 4 && hPrime < 5) {
    r1 = x;
    g1 = 0;
    b1 = c;
  } else {
    r1 = c;
    g1 = 0;
    b1 = x;
  }

  return {
    r: clamp(r1 + m, 0, 1),
    g: clamp(g1 + m, 0, 1),
    b: clamp(b1 + m, 0, 1),
  };
}

export function normalizedToHls(n: NormalizedRGB, fallbackHue = 0): HLS {
  const r = clamp(n?.r ?? 0, 0, 1);
  const g = clamp(n?.g ?? 0, 0, 1);
  const b = clamp(n?.b ?? 0, 0, 1);

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  const l = (max + min) / 2;
  const safeFallback = Number.isFinite(fallbackHue) ? ((fallbackHue % 360) + 360) % 360 : 0;
  const wants360 = Math.round(fallbackHue) === 360;

  if (l <= 1e-4) {
    return {
      h: wants360 ? 360 : Math.round(safeFallback),
      l: 0,
      s: 0,
    };
  }

  if (l >= 1 - 1e-4) {
    return {
      h: wants360 ? 360 : Math.round(safeFallback),
      l: 100,
      s: 0,
    };
  }

  if (delta <= 1e-4) {
    return {
      h: wants360 ? 360 : Math.round(safeFallback),
      l: Math.round(clamp(l * 100, 0, 100)),
      s: 0,
    };
  }

  const denom = l > 0.5 ? 2 - 2 * l : 2 * l;
  const s = denom > 1e-6 ? delta / denom : 0;

  let h = safeFallback;
  if (Math.abs(max - r) < 1e-6) {
    h = 60 * (((g - b) / delta) % 6);
  } else if (Math.abs(max - g) < 1e-6) {
    h = 60 * ((b - r) / delta + 2);
  } else {
    h = 60 * ((r - g) / delta + 4);
  }

  if (h < 0) {
    h += 360;
  }

  let finalH = Math.round(clamp(h, 0, 360)) % 360;
  if (finalH === 0 && wants360) {
    finalH = 360;
  }

  return {
    h: finalH,
    l: Math.round(clamp(l * 100, 0, 100)),
    s: Math.round(clamp(s * 100, 0, 100)),
  };
}

export function hlsToNormalized(hls: HLS): NormalizedRGB {
  const rawH = Number.isFinite(hls?.h) ? hls.h : 0;
  const h = ((rawH % 360) + 360) % 360;
  const l = clamp((hls?.l ?? 0) / 100, 0, 1);
  const s = clamp((hls?.s ?? 0) / 100, 0, 1);

  if (l <= 0) return { r: 0, g: 0, b: 0 };
  if (l >= 1) return { r: 1, g: 1, b: 1 };
  if (s <= 0) return { r: l, g: l, b: l };

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hPrime = h / 60;
  const x = c * (1 - Math.abs((hPrime % 2) - 1));
  const m = l - c / 2;

  let r1 = 0;
  let g1 = 0;
  let b1 = 0;

  if (hPrime >= 0 && hPrime < 1) {
    r1 = c; g1 = x; b1 = 0;
  } else if (hPrime >= 1 && hPrime < 2) {
    r1 = x; g1 = c; b1 = 0;
  } else if (hPrime >= 2 && hPrime < 3) {
    r1 = 0; g1 = c; b1 = x;
  } else if (hPrime >= 3 && hPrime < 4) {
    r1 = 0; g1 = x; b1 = c;
  } else if (hPrime >= 4 && hPrime < 5) {
    r1 = x; g1 = 0; b1 = c;
  } else {
    r1 = c; g1 = 0; b1 = x;
  }

  return {
    r: clamp(r1 + m, 0, 1),
    g: clamp(g1 + m, 0, 1),
    b: clamp(b1 + m, 0, 1),
  };
}

export function normalizedToHex(n: NormalizedRGB): string {
  const rgb = normalizedToRgb(n);
  const toHex = (c: number) => c.toString(16).padStart(2, '0').toUpperCase();
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

export function hexToNormalized(hex: string): NormalizedRGB | null {
  if (typeof hex !== 'string') return null;
  const cleaned = hex.trim().replace(/^#/, '').trim();
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(cleaned)) {
    return null;
  }

  let r = 0;
  let g = 0;
  let b = 0;

  if (cleaned.length === 3) {
    r = parseInt(cleaned[0] + cleaned[0], 16);
    g = parseInt(cleaned[1] + cleaned[1], 16);
    b = parseInt(cleaned[2] + cleaned[2], 16);
  } else {
    r = parseInt(cleaned.substring(0, 2), 16);
    g = parseInt(cleaned.substring(2, 4), 16);
    b = parseInt(cleaned.substring(4, 6), 16);
  }

  return rgbToNormalized({ r, g, b });
}

export function getContrastColor(n: NormalizedRGB): string {
  const l = 0.2126 * n.r + 0.7152 * n.g + 0.0722 * n.b;
  return l > 0.45 ? '#0f172a' : '#f8fafc';
}

export function oklchToLinearRgb(l: number, c: number, h: number): [number, number, number] {
  const L = l / 100;
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;

  const rLin = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const gLin = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const bLin = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

  return [rLin, gLin, bLin];
}

function linearToSrgb(val: number): number {
  const abs = Math.abs(val);
  const sign = val < 0 ? -1 : 1;
  if (abs <= 0.0031308) {
    return sign * (12.92 * abs);
  }
  return sign * (1.055 * Math.pow(abs, 1 / 2.4) - 0.055);
}

export function oklchToUnconstrainedRgb(l: number, c: number, h: number): [number, number, number] {
  const [rLin, gLin, bLin] = oklchToLinearRgb(l, c, h);
  return [linearToSrgb(rLin), linearToSrgb(gLin), linearToSrgb(bLin)];
}

export function isRgbInGamut(r: number, g: number, b: number, eps = 1e-4): boolean {
  return (
    r >= -eps && r <= 1 + eps &&
    g >= -eps && g <= 1 + eps &&
    b >= -eps && b <= 1 + eps
  );
}

export function mapOklchToSrgb(l: number, c: number, h: number): {
  isOutside: boolean;
  rgb: NormalizedRGB;
  clampedC: number;
} {
  const safeL = clamp(l, 0, 100);
  const safeC = Math.max(0, Number.isFinite(c) ? c : 0);
  const safeH = Number.isFinite(h) ? ((h % 360) + 360) % 360 : 0;

  const cleanNorm = (v: number) => {
    if (Math.abs(v - 1) < 1e-6) return 1;
    if (Math.abs(v) < 1e-6) return 0;
    return clamp(v, 0, 1);
  };

  const [r, g, b] = oklchToUnconstrainedRgb(safeL, safeC, safeH);
  if (isRgbInGamut(r, g, b)) {
    return {
      isOutside: false,
      rgb: { r: cleanNorm(r), g: cleanNorm(g), b: cleanNorm(b) },
      clampedC: safeC,
    };
  }

  let low = 0;
  let high = safeC;
  const [r0, g0, b0] = oklchToUnconstrainedRgb(safeL, 0, safeH);
  let bestRgb: NormalizedRGB = {
    r: cleanNorm(r0),
    g: cleanNorm(g0),
    b: cleanNorm(b0),
  };

  for (let i = 0; i < 20; i++) {
    const mid = (low + high) / 2;
    const [testR, testG, testB] = oklchToUnconstrainedRgb(safeL, mid, safeH);
    if (isRgbInGamut(testR, testG, testB)) {
      bestRgb = {
        r: cleanNorm(testR),
        g: cleanNorm(testG),
        b: cleanNorm(testB),
      };
      low = mid;
    } else {
      high = mid;
    }
  }

  return {
    isOutside: true,
    rgb: { r: cleanNorm(bestRgb.r), g: cleanNorm(bestRgb.g), b: cleanNorm(bestRgb.b) },
    clampedC: Math.round(low * 1000) / 1000,
  };
}

export function normalizedToOklch(n: NormalizedRGB): OKLCH {
  const srgbToLinear = (v: number) =>
    v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);

  const rLin = srgbToLinear(n.r);
  const gLin = srgbToLinear(n.g);
  const bLin = srgbToLinear(n.b);

  const l_ = Math.cbrt(0.4122214708 * rLin + 0.5363325363 * gLin + 0.0514459929 * bLin);
  const m_ = Math.cbrt(0.2119034982 * rLin + 0.6806995451 * gLin + 0.1073969566 * bLin);
  const s_ = Math.cbrt(0.0883024619 * rLin + 0.2817188376 * gLin + 0.6299787005 * bLin);

  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
  const b = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;

  const c = Math.sqrt(a * a + b * b);
  let h = (Math.atan2(b, a) * 180) / Math.PI;
  if (h < 0) h += 360;

  return {
    l: Math.round(L * 1000) / 10,
    c: Math.round(c * 1000) / 1000,
    h: Math.round(h * 10) / 10,
  };
}

export interface CieXY {
  x: number;
  y: number;
}

export function normalizedToCieXy(n: NormalizedRGB): CieXY {
  const toLin = (c: number) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  const r = toLin(clamp(n.r, 0, 1));
  const g = toLin(clamp(n.g, 0, 1));
  const b = toLin(clamp(n.b, 0, 1));

  const X = 0.4124564 * r + 0.3575761 * g + 0.1804375 * b;
  const Y = 0.2126729 * r + 0.7151522 * g + 0.0721750 * b;
  const Z = 0.0193339 * r + 0.1191920 * g + 0.9503041 * b;

  const sum = X + Y + Z;
  if (sum < 1e-6) {
    return { x: 0.3127, y: 0.3290 };
  }

  return {
    x: Math.round((X / sum) * 10000) / 10000,
    y: Math.round((Y / sum) * 10000) / 10000,
  };
}

export function cieXyToNormalized(x: number, y: number, refY = 0.5): {
  rgb: NormalizedRGB;
  isOutside: boolean;
} {
  const safeY = Math.max(y, 1e-4);
  const Y = Math.max(refY, 0.05);
  const X = (x / safeY) * Y;
  const Z = ((1 - x - safeY) / safeY) * Y;

  const rLin = +3.2404542 * X - 1.5371385 * Y - 0.4985314 * Z;
  const gLin = -0.9692660 * X + 1.8760108 * Y + 0.0415560 * Z;
  const bLin = +0.0556434 * X - 0.2040259 * Y + 1.0572252 * Z;

  const toGamma = (val: number) => {
    const abs = Math.abs(val);
    const sign = val < 0 ? -1 : 1;
    if (abs <= 0.0031308) {
      return sign * (12.92 * abs);
    }
    return sign * (1.055 * Math.pow(abs, 1 / 2.4) - 0.055);
  };

  const r = toGamma(rLin);
  const g = toGamma(gLin);
  const b = toGamma(bLin);

  const isOutside = !isRgbInGamut(r, g, b);

  return {
    rgb: {
      r: clamp(r, 0, 1),
      g: clamp(g, 0, 1),
      b: clamp(b, 0, 1),
    },
    isOutside,
  };
}




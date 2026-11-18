/**
 * Contrast enhancement algorithms:
 * 1. Linear contrast stretching (with clipping)
 * 2. Histogram equalization (RGB independent vs. HSV luminance)
 */

import { rgbToHsv, hsvToRgb } from './colorSpace';
import { computeCdf, computeHistograms, findPercentileRange } from './histogram';

/**
 * Creates a clone of ImageData with a new buffer.
 */
export function cloneImageData(src: ImageData): ImageData {
  const copy = new ImageData(src.width, src.height);
  copy.data.set(src.data);
  return copy;
}

/**
 * Linear Contrast Stretching (Линейное контрастирование)
 * Maps [min, max] range to [0, 255].
 *
 * @param src Source image data
 * @param clipPercent Percentile clipping (e.g. 1% to ignore extreme outlier noise)
 * @param perChannel If true, stretches R, G, B channels independently. If false, uses common luminance min/max.
 */
export function applyLinearContrast(
  src: ImageData,
  clipPercent: number = 0,
  perChannel: boolean = false
): ImageData {
  const result = cloneImageData(src);
  const data = result.data;
  const totalPixels = src.width * src.height;
  const hists = computeHistograms(src);

  if (perChannel) {
    const rangeR = findPercentileRange(hists.r, totalPixels, clipPercent);
    const rangeG = findPercentileRange(hists.g, totalPixels, clipPercent);
    const rangeB = findPercentileRange(hists.b, totalPixels, clipPercent);

    const scaleR = 255 / (rangeR.max - rangeR.min || 1);
    const scaleG = 255 / (rangeG.max - rangeG.min || 1);
    const scaleB = 255 / (rangeB.max - rangeB.min || 1);

    // Precompute lookup tables (LUT) for instant speed
    const lutR = new Uint8ClampedArray(256);
    const lutG = new Uint8ClampedArray(256);
    const lutB = new Uint8ClampedArray(256);

    for (let i = 0; i < 256; i++) {
      lutR[i] = Math.max(0, Math.min(255, Math.round((i - rangeR.min) * scaleR)));
      lutG[i] = Math.max(0, Math.min(255, Math.round((i - rangeG.min) * scaleG)));
      lutB[i] = Math.max(0, Math.min(255, Math.round((i - rangeB.min) * scaleB)));
    }

    for (let i = 0; i < data.length; i += 4) {
      data[i] = lutR[data[i]];
      data[i + 1] = lutG[data[i + 1]];
      data[i + 2] = lutB[data[i + 2]];
    }
  } else {
    // Luminance-based global stretch (maintains natural color balance)
    const range = findPercentileRange(hists.luminance, totalPixels, clipPercent);
    const scale = 255 / (range.max - range.min || 1);

    const lut = new Uint8ClampedArray(256);
    for (let i = 0; i < 256; i++) {
      lut[i] = Math.max(0, Math.min(255, Math.round((i - range.min) * scale)));
    }

    for (let i = 0; i < data.length; i += 4) {
      data[i] = lut[data[i]];
      data[i + 1] = lut[data[i + 1]];
      data[i + 2] = lut[data[i + 2]];
    }
  }

  return result;
}

/**
 * Approach 1: Equalize each R, G, B channel independently.
 * Note: Often creates color distortions and unnatural saturation shifts.
 */
export function applyHistogramEqualizationRGB(src: ImageData): ImageData {
  const result = cloneImageData(src);
  const data = result.data;
  const totalPixels = src.width * src.height;
  const hists = computeHistograms(src);

  const cdfR = computeCdf(hists.r, totalPixels);
  const cdfG = computeCdf(hists.g, totalPixels);
  const cdfB = computeCdf(hists.b, totalPixels);

  // Find min non-zero CDF values for normalized scaling
  let minCdfR = 0;
  for (let i = 0; i < 256; i++) {
    if (cdfR[i] > 0) { minCdfR = cdfR[i]; break; }
  }
  let minCdfG = 0;
  for (let i = 0; i < 256; i++) {
    if (cdfG[i] > 0) { minCdfG = cdfG[i]; break; }
  }
  let minCdfB = 0;
  for (let i = 0; i < 256; i++) {
    if (cdfB[i] > 0) { minCdfB = cdfB[i]; break; }
  }

  const denomR = 1 - minCdfR || 1;
  const denomG = 1 - minCdfG || 1;
  const denomB = 1 - minCdfB || 1;

  const lutR = new Uint8ClampedArray(256);
  const lutG = new Uint8ClampedArray(256);
  const lutB = new Uint8ClampedArray(256);

  for (let i = 0; i < 256; i++) {
    lutR[i] = Math.round(((cdfR[i] - minCdfR) / denomR) * 255);
    lutG[i] = Math.round(((cdfG[i] - minCdfG) / denomG) * 255);
    lutB[i] = Math.round(((cdfB[i] - minCdfB) / denomB) * 255);
  }

  for (let i = 0; i < data.length; i += 4) {
    data[i] = lutR[data[i]];
    data[i + 1] = lutG[data[i + 1]];
    data[i + 2] = lutB[data[i + 2]];
  }

  return result;
}

/**
 * Approach 2: Equalize ONLY the Value (Brightness / Luminance) in HSV color space.
 * Preserves Hue and Saturation, avoiding color shifts.
 */
export function applyHistogramEqualizationHSV(src: ImageData): ImageData {
  const result = cloneImageData(src);
  const data = result.data;
  const totalPixels = src.width * src.height;

  // 1. Convert pixels to HSV and build histogram of V (0..255)
  const vHist = new Uint32Array(256);
  const hsvArray = new Float32Array(totalPixels * 3);

  let p = 0;
  for (let i = 0; i < data.length; i += 4) {
    const { h, s, v } = rgbToHsv(data[i], data[i + 1], data[i + 2]);
    const vInt = Math.max(0, Math.min(255, Math.round(v * 255)));

    hsvArray[p] = h;
    hsvArray[p + 1] = s;
    hsvArray[p + 2] = v;
    p += 3;

    vHist[vInt]++;
  }

  // 2. Compute CDF for V channel
  const cdfV = computeCdf(vHist, totalPixels);
  let minCdfV = 0;
  for (let i = 0; i < 256; i++) {
    if (cdfV[i] > 0) { minCdfV = cdfV[i]; break; }
  }
  const denomV = 1 - minCdfV || 1;

  const lutV = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    lutV[i] = Math.max(0, Math.min(1, (cdfV[i] - minCdfV) / denomV));
  }

  // 3. Map new V back to RGB
  p = 0;
  for (let i = 0; i < data.length; i += 4) {
    const h = hsvArray[p];
    const s = hsvArray[p + 1];
    const oldV = hsvArray[p + 2];
    const oldVInt = Math.max(0, Math.min(255, Math.round(oldV * 255)));
    const newV = lutV[oldVInt];
    p += 3;

    const [r, g, b] = hsvToRgb(h, s, newV);
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }

  return result;
}

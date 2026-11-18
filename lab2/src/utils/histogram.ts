/**
 * Histogram calculation, CDF, and image statistics.
 */

export interface ChannelHistograms {
  r: Uint32Array;
  g: Uint32Array;
  b: Uint32Array;
  luminance: Uint32Array;
  vChannel?: Uint32Array;
}

export interface ImageStats {
  min: number;
  max: number;
  mean: number;
  stdDev: number;
}

export function computeHistograms(imageData: ImageData): ChannelHistograms {
  const r = new Uint32Array(256);
  const g = new Uint32Array(256);
  const b = new Uint32Array(256);
  const luminance = new Uint32Array(256);

  const data = imageData.data;
  const len = data.length;

  for (let i = 0; i < len; i += 4) {
    const red = data[i];
    const green = data[i + 1];
    const blue = data[i + 2];

    r[red]++;
    g[green]++;
    b[blue]++;

    // ITU-R BT.601 luminance
    const lum = Math.round(0.299 * red + 0.587 * green + 0.114 * blue);
    luminance[lum]++;
  }

  return { r, g, b, luminance };
}

export function computeCdf(hist: Uint32Array, totalPixels: number): Float32Array {
  const cdf = new Float32Array(256);
  let cum = 0;
  for (let i = 0; i < 256; i++) {
    cum += hist[i];
    cdf[i] = cum / totalPixels;
  }
  return cdf;
}

export function computeStats(hist: Uint32Array, totalPixels: number): ImageStats {
  let min = -1;
  let max = -1;
  let sum = 0;

  for (let i = 0; i < 256; i++) {
    const count = hist[i];
    if (count > 0) {
      if (min === -1) min = i;
      max = i;
      sum += i * count;
    }
  }

  if (min === -1) min = 0;
  if (max === -1) max = 0;

  const mean = sum / totalPixels;

  let varianceSum = 0;
  for (let i = 0; i < 256; i++) {
    const count = hist[i];
    if (count > 0) {
      varianceSum += count * (i - mean) * (i - mean);
    }
  }

  const stdDev = Math.sqrt(varianceSum / totalPixels);

  return { min, max, mean, stdDev };
}

export function findPercentileRange(
  hist: Uint32Array,
  totalPixels: number,
  clipPercent: number = 0
): { min: number; max: number } {
  if (clipPercent <= 0) {
    let min = 0;
    while (min < 255 && hist[min] === 0) min++;
    let max = 255;
    while (max > 0 && hist[max] === 0) max--;
    return { min, max: Math.max(min + 1, max) };
  }

  const lowThreshold = totalPixels * (clipPercent / 100);
  const highThreshold = totalPixels * (1 - clipPercent / 100);

  let cum = 0;
  let min = 0;
  for (let i = 0; i < 256; i++) {
    cum += hist[i];
    if (cum >= lowThreshold) {
      min = i;
      break;
    }
  }

  cum = 0;
  let max = 255;
  for (let i = 0; i < 256; i++) {
    cum += hist[i];
    if (cum >= highThreshold) {
      max = i;
      break;
    }
  }

  if (max <= min) {
    max = Math.min(255, min + 1);
  }

  return { min, max };
}

/**
 * 2D Convolution and High-Pass / Sharpening Filters.
 */

import { cloneImageData } from './contrast';

export type Kernel3x3 = [
  [number, number, number],
  [number, number, number],
  [number, number, number]
];

/**
 * Predefined 3x3 filter kernels
 */
export const PRESET_KERNELS: Record<string, { name: string; kernel: Kernel3x3; divisor: number; offset: number; description: string }> = {
  sharpenBasic: {
    name: 'Базовое увеличение резкости (4-связный)',
    kernel: [
      [0, -1, 0],
      [-1, 5, -1],
      [0, -1, 0],
    ],
    divisor: 1,
    offset: 0,
    description: 'Усиливает контраст на границах по вертикали и горизонтали.',
  },
  sharpenStrong: {
    name: 'Сильное увеличение резкости (8-связный)',
    kernel: [
      [-1, -1, -1],
      [-1, 9, -1],
      [-1, -1, -1],
    ],
    divisor: 1,
    offset: 0,
    description: 'Усиливает границы во всех направлениях, включая диагонали.',
  },
  laplacianEdges: {
    name: 'Выделение контуров (Лапласиан)',
    kernel: [
      [-1, -1, -1],
      [-1, 8, -1],
      [-1, -1, -1],
    ],
    divisor: 1,
    offset: 0,
    description: 'Чистый высокочастотный фильтр. Показывает только перепады яркости (фон темный).',
  },
  laplacianOffset: {
    name: 'Лапласиан со смещением (+128)',
    kernel: [
      [-1, -1, -1],
      [-1, 8, -1],
      [-1, -1, -1],
    ],
    divisor: 1,
    offset: 128,
    description: 'Высокочастотные составляющие на сером фоне для визуализации частот.',
  },
  highBoost: {
    name: 'High-boost фильтр (A = 1.2)',
    kernel: [
      [-1, -1, -1],
      [-1, 9.6, -1],
      [-1, -1, -1],
    ],
    divisor: 1.6,
    offset: 0,
    description: 'Усиление высоких частот с мягким сохранением низкочастотной составляющей.',
  },
  gaussianBlur: {
    name: 'Сглаживание Гаусса 3x3 (для сравнения/маски)',
    kernel: [
      [1, 2, 1],
      [2, 4, 2],
      [1, 2, 1],
    ],
    divisor: 16,
    offset: 0,
    description: 'Низкочастотный фильтр (размытие). Используется при нерезком маскировании.',
  },
};

/**
 * 2D Convolution on RGB channels.
 * Uses Clamp-to-Edge boundary conditions (replicates border pixels).
 */
export function applyConvolution(
  src: ImageData,
  kernel: Kernel3x3,
  divisor: number = 1,
  offset: number = 0
): ImageData {
  const result = cloneImageData(src);
  const srcData = src.data;
  const dstData = result.data;
  const w = src.width;
  const h = src.height;

  const div = divisor !== 0 ? divisor : 1;

  const k00 = kernel[0][0], k01 = kernel[0][1], k02 = kernel[0][2];
  const k10 = kernel[1][0], k11 = kernel[1][1], k12 = kernel[1][2];
  const k20 = kernel[2][0], k21 = kernel[2][1], k22 = kernel[2][2];

  for (let y = 0; y < h; y++) {
    const yPrev = (y > 0 ? y - 1 : 0) * w;
    const yCurr = y * w;
    const yNext = (y < h - 1 ? y + 1 : h - 1) * w;

    for (let x = 0; x < w; x++) {
      const xPrev = x > 0 ? x - 1 : 0;
      const xNext = x < w - 1 ? x + 1 : w - 1;

      // Pixel index offsets
      const i00 = (yPrev + xPrev) * 4;
      const i01 = (yPrev + x) * 4;
      const i02 = (yPrev + xNext) * 4;

      const i10 = (yCurr + xPrev) * 4;
      const i11 = (yCurr + x) * 4;
      const i12 = (yCurr + xNext) * 4;

      const i20 = (yNext + xPrev) * 4;
      const i21 = (yNext + x) * 4;
      const i22 = (yNext + xNext) * 4;

      const dstIdx = i11;

      // Process R, G, B channels
      for (let c = 0; c < 3; c++) {
        const val =
          k00 * srcData[i00 + c] + k01 * srcData[i01 + c] + k02 * srcData[i02 + c] +
          k10 * srcData[i10 + c] + k11 * srcData[i11 + c] + k12 * srcData[i12 + c] +
          k20 * srcData[i20 + c] + k21 * srcData[i21 + c] + k22 * srcData[i22 + c];

        const out = Math.round(val / div + offset);
        dstData[dstIdx + c] = Math.max(0, Math.min(255, out));
      }

      // Alpha remains untouched
      dstData[dstIdx + 3] = srcData[dstIdx + 3];
    }
  }

  return result;
}

function gaussianBlur5x5(src: ImageData): ImageData {
  const kernel = [
    [1, 4, 6, 4, 1],
    [4, 16, 24, 16, 4],
    [6, 24, 36, 24, 6],
    [4, 16, 24, 16, 4],
    [1, 4, 6, 4, 1],
  ];
  const divisor = 256;
  const { width, height, data: srcData } = src;
  const result = cloneImageData(src);
  const dstData = result.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sumR = 0;
      let sumG = 0;
      let sumB = 0;

      for (let ky = -2; ky <= 2; ky++) {
        const sy = Math.max(0, Math.min(height - 1, y + ky));
        const row = kernel[ky + 2];
        for (let kx = -2; kx <= 2; kx++) {
          const sx = Math.max(0, Math.min(width - 1, x + kx));
          const idx = (sy * width + sx) * 4;
          const w = row[kx + 2];
          sumR += srcData[idx] * w;
          sumG += srcData[idx + 1] * w;
          sumB += srcData[idx + 2] * w;
        }
      }

      const dstIdx = (y * width + x) * 4;
      dstData[dstIdx] = Math.round(sumR / divisor);
      dstData[dstIdx + 1] = Math.round(sumG / divisor);
      dstData[dstIdx + 2] = Math.round(sumB / divisor);
      dstData[dstIdx + 3] = srcData[dstIdx + 3];
    }
  }

  return result;
}

/**
 * Unsharp Masking (Нерезкое маскирование)
 * 1. Blur the original image (5x5 Gaussian)
 * 2. High-pass mask = Original - Blurred
 * 3. Result = Original + amount * mask (with optional threshold)
 */
export function applyUnsharpMask(
  src: ImageData,
  amount: number = 1.5,
  threshold: number = 0
): ImageData {
  const blurred = gaussianBlur5x5(src);

  const result = cloneImageData(src);
  const srcData = src.data;
  const blurData = blurred.data;
  const dstData = result.data;
  const len = srcData.length;

  for (let i = 0; i < len; i += 4) {
    for (let c = 0; c < 3; c++) {
      const orig = srcData[i + c];
      const blur = blurData[i + c];
      const diff = orig - blur;

      if (Math.abs(diff) >= threshold) {
        const val = Math.round(orig + amount * diff);
        dstData[i + c] = Math.max(0, Math.min(255, val));
      } else {
        dstData[i + c] = orig;
      }
    }
    dstData[i + 3] = srcData[i + 3];
  }

  return result;
}

/**
 * Tunable High-Pass Sharpening filter:
 * Kernel:
 * [-w,     -w,     -w]
 * [-w,  1+8*w,     -w]
 * [-w,     -w,     -w]
 * where w is sharpening strength (0.0 to 3.0)
 */
export function applyTunableSharpen(src: ImageData, strength: number): ImageData {
  const w = strength;
  const center = 1 + 8 * w;
  const kernel: Kernel3x3 = [
    [-w, -w, -w],
    [-w, center, -w],
    [-w, -w, -w],
  ];

  return applyConvolution(src, kernel, 1, 0);
}

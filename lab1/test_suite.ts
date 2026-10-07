import assert from 'node:assert';
import {
  clamp,
  rgbToNormalized,
  normalizedToRgb,
  normalizedToCmyk,
  cmykToNormalized,
  normalizedToHls,
  hlsToNormalized,
  normalizedToHsv,
  hsvToNormalized,
  normalizedToHex,
  hexToNormalized,
  mapOklchToSrgb,
} from './src/utils/color.ts';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`✓ PASS: ${name}`);
  } catch (err: any) {
    failed++;
    console.error(`✗ FAIL: ${name}`);
    console.error(err);
  }
}

console.log('=== RUNNING COLOR SUITE ===\n');

// 1. Clamp tests
test('clamp handles normal numbers, NaN, and infinities', () => {
  assert.strictEqual(clamp(50, 0, 100), 50);
  assert.strictEqual(clamp(-10, 0, 100), 0);
  assert.strictEqual(clamp(150, 0, 100), 100);
  assert.strictEqual(clamp(NaN, 0, 100), 0);
  assert.strictEqual(clamp(Infinity, 0, 100), 100);
  assert.strictEqual(clamp(-Infinity, 0, 100), 0);
});

// 2. RGB <-> Normalized
test('RGB <-> NormalizedRGB boundaries', () => {
  assert.deepStrictEqual(rgbToNormalized({ r: 0, g: 0, b: 0 }), { r: 0, g: 0, b: 0 });
  assert.deepStrictEqual(rgbToNormalized({ r: 255, g: 255, b: 255 }), { r: 1, g: 1, b: 1 });
  assert.deepStrictEqual(normalizedToRgb({ r: 0, g: 0, b: 0 }), { r: 0, g: 0, b: 0 });
  assert.deepStrictEqual(normalizedToRgb({ r: 1, g: 1, b: 1 }), { r: 255, g: 255, b: 255 });
});

// 3. CMYK boundaries
test('CMYK pure black, pure white, gray, primaries', () => {
  // Black
  const blackCmyk = normalizedToCmyk({ r: 0, g: 0, b: 0 });
  assert.deepStrictEqual(blackCmyk, { c: 0, m: 0, y: 0, k: 100 });
  assert.deepStrictEqual(cmykToNormalized(blackCmyk), { r: 0, g: 0, b: 0 });

  // Near black
  const nearBlackCmyk = normalizedToCmyk({ r: 1e-5, g: 1e-5, b: 1e-5 });
  assert.deepStrictEqual(nearBlackCmyk, { c: 0, m: 0, y: 0, k: 100 });

  // White
  const whiteCmyk = normalizedToCmyk({ r: 1, g: 1, b: 1 });
  assert.deepStrictEqual(whiteCmyk, { c: 0, m: 0, y: 0, k: 0 });
  assert.deepStrictEqual(cmykToNormalized(whiteCmyk), { r: 1, g: 1, b: 1 });

  // Gray
  const grayCmyk = normalizedToCmyk({ r: 0.5, g: 0.5, b: 0.5 });
  assert.deepStrictEqual(grayCmyk, { c: 0, m: 0, y: 0, k: 50 });

  // Red
  const redCmyk = normalizedToCmyk({ r: 1, g: 0, b: 0 });
  assert.deepStrictEqual(redCmyk, { c: 0, m: 100, y: 100, k: 0 });
  assert.deepStrictEqual(cmykToNormalized(redCmyk), { r: 1, g: 0, b: 0 });

  // Green
  const greenCmyk = normalizedToCmyk({ r: 0, g: 1, b: 0 });
  assert.deepStrictEqual(greenCmyk, { c: 100, m: 0, y: 100, k: 0 });
  assert.deepStrictEqual(cmykToNormalized(greenCmyk), { r: 0, g: 1, b: 0 });

  // Blue
  const blueCmyk = normalizedToCmyk({ r: 0, g: 0, b: 1 });
  assert.deepStrictEqual(blueCmyk, { c: 100, m: 100, y: 0, k: 0 });
  assert.deepStrictEqual(cmykToNormalized(blueCmyk), { r: 0, g: 0, b: 1 });

  // K=100 with any CMY
  assert.deepStrictEqual(cmykToNormalized({ c: 50, m: 70, y: 90, k: 100 }), { r: 0, g: 0, b: 0 });
});

// 4. HLS boundaries & fallbackHue
test('HLS boundaries, fallbackHue, and 360 degree handling', () => {
  // Black preserves fallbackHue
  const blackHls = normalizedToHls({ r: 0, g: 0, b: 0 }, 210);
  assert.deepStrictEqual(blackHls, { h: 210, l: 0, s: 0 });
  assert.deepStrictEqual(hlsToNormalized(blackHls), { r: 0, g: 0, b: 0 });

  // White preserves fallbackHue
  const whiteHls = normalizedToHls({ r: 1, g: 1, b: 1 }, 150);
  assert.deepStrictEqual(whiteHls, { h: 150, l: 100, s: 0 });
  assert.deepStrictEqual(hlsToNormalized(whiteHls), { r: 1, g: 1, b: 1 });

  // Gray preserves fallbackHue
  const grayHls = normalizedToHls({ r: 0.5, g: 0.5, b: 0.5 }, 90);
  assert.deepStrictEqual(grayHls, { h: 90, l: 50, s: 0 });
  assert.deepStrictEqual(hlsToNormalized(grayHls), { r: 0.5, g: 0.5, b: 0.5 });

  // FallbackHue 360 preserved on black, gray, white
  assert.strictEqual(normalizedToHls({ r: 0, g: 0, b: 0 }, 360).h, 360);
  assert.strictEqual(normalizedToHls({ r: 0.5, g: 0.5, b: 0.5 }, 360).h, 360);
  assert.strictEqual(normalizedToHls({ r: 1, g: 1, b: 1 }, 360).h, 360);

  // Red with fallbackHue 360 keeps 360
  assert.deepStrictEqual(normalizedToHls({ r: 1, g: 0, b: 0 }, 360), { h: 360, l: 50, s: 100 });
  // Red with fallbackHue 0 keeps 0
  assert.deepStrictEqual(normalizedToHls({ r: 1, g: 0, b: 0 }, 0), { h: 0, l: 50, s: 100 });

  // HLS to normalized with H=360 and H=0 both produce pure red
  assert.deepStrictEqual(hlsToNormalized({ h: 360, l: 50, s: 100 }), { r: 1, g: 0, b: 0 });
  assert.deepStrictEqual(hlsToNormalized({ h: 0, l: 50, s: 100 }), { r: 1, g: 0, b: 0 });

  // Primaries and secondaries in HLS
  assert.deepStrictEqual(normalizedToHls({ r: 0, g: 1, b: 0 }), { h: 120, l: 50, s: 100 });
  assert.deepStrictEqual(normalizedToHls({ r: 0, g: 0, b: 1 }), { h: 240, l: 50, s: 100 });
  assert.deepStrictEqual(normalizedToHls({ r: 0, g: 1, b: 1 }), { h: 180, l: 50, s: 100 });
  assert.deepStrictEqual(normalizedToHls({ r: 1, g: 0, b: 1 }), { h: 300, l: 50, s: 100 });
  assert.deepStrictEqual(normalizedToHls({ r: 1, g: 1, b: 0 }), { h: 60, l: 50, s: 100 });
});

// 5. HSV boundaries & fallbackHue
test('HSV boundaries and fallbackHue', () => {
  assert.deepStrictEqual(normalizedToHsv({ r: 0, g: 0, b: 0 }, 210), { h: 210, s: 0, v: 0 });
  assert.deepStrictEqual(normalizedToHsv({ r: 1, g: 1, b: 1 }, 150), { h: 150, s: 0, v: 100 });
  assert.deepStrictEqual(normalizedToHsv({ r: 0.5, g: 0.5, b: 0.5 }, 90), { h: 90, s: 0, v: 50 });
  assert.strictEqual(normalizedToHsv({ r: 0, g: 0, b: 0 }, 360).h, 360);
  assert.strictEqual(normalizedToHsv({ r: 1, g: 0, b: 0 }, 360).h, 360);
  assert.strictEqual(normalizedToHsv({ r: 1, g: 0, b: 0 }, 0).h, 0);

  assert.deepStrictEqual(hsvToNormalized({ h: 360, s: 100, v: 100 }), { r: 1, g: 0, b: 0 });
  assert.deepStrictEqual(hsvToNormalized({ h: 0, s: 100, v: 100 }), { r: 1, g: 0, b: 0 });
});

// 6. Hex parsing & generation
test('Hex conversions', () => {
  assert.strictEqual(normalizedToHex({ r: 1, g: 0, b: 0 }), '#FF0000');
  assert.strictEqual(normalizedToHex({ r: 0, g: 1, b: 0 }), '#00FF00');
  assert.strictEqual(normalizedToHex({ r: 0, g: 0, b: 1 }), '#0000FF');
  assert.deepStrictEqual(hexToNormalized('#ff0000'), { r: 1, g: 0, b: 0 });
  assert.deepStrictEqual(hexToNormalized('  #ff0000  '), { r: 1, g: 0, b: 0 });
  assert.deepStrictEqual(hexToNormalized(' #00FF00 '), { r: 0, g: 1, b: 0 });
  assert.deepStrictEqual(hexToNormalized('00FF00'), { r: 0, g: 1, b: 0 });
  assert.deepStrictEqual(hexToNormalized('#fff'), { r: 1, g: 1, b: 1 });
  assert.deepStrictEqual(hexToNormalized(' #fff '), { r: 1, g: 1, b: 1 });
  assert.strictEqual(hexToNormalized('invalid'), null);
  assert.strictEqual(hexToNormalized(''), null);
  assert.strictEqual(hexToNormalized(null as any), null);
  assert.strictEqual(hexToNormalized(undefined as any), null);
});

// 7. No cyclic drift across repeated conversions
test('Iterative conversion convergence (no infinite drift / cycle)', () => {
  let rgb = { r: 120, g: 200, b: 80 };
  let norm = rgbToNormalized(rgb);

  // 10 round trips through HLS
  for (let i = 0; i < 10; i++) {
    const hls = normalizedToHls(norm);
    norm = hlsToNormalized(hls);
  }
  const finalRgb = normalizedToRgb(norm);
  // Difference between starting RGB and after 10 round-trips must be <= 1 LSB
  assert(Math.abs(finalRgb.r - rgb.r) <= 1, `R drifted: ${finalRgb.r} vs ${rgb.r}`);
  assert(Math.abs(finalRgb.g - rgb.g) <= 1, `G drifted: ${finalRgb.g} vs ${rgb.g}`);
  assert(Math.abs(finalRgb.b - rgb.b) <= 1, `B drifted: ${finalRgb.b} vs ${rgb.b}`);
});

// 8. OKLCH boundary gamut mapping
test('OKLCH boundary gamut mapping', () => {
  // Pure black (L=0)
  const blackMap = mapOklchToSrgb(0, 0, 0);
  assert.strictEqual(blackMap.isOutside, false);
  assert.deepStrictEqual(blackMap.rgb, { r: 0, g: 0, b: 0 });

  // Pure white (L=100)
  const whiteMap = mapOklchToSrgb(100, 0, 0);
  assert.strictEqual(whiteMap.isOutside, false);
  assert.deepStrictEqual(whiteMap.rgb, { r: 1, g: 1, b: 1 });

  // Wide-gamut color mapping reduces chroma without producing black
  const wideMap = mapOklchToSrgb(85, 0.30, 145);
  assert.strictEqual(wideMap.isOutside, true);
  assert(wideMap.rgb.g > 0.5, 'Mapped green must have significant green component');
  assert(wideMap.clampedC <= 0.30);
  assert(wideMap.clampedC > 0);
});

// 9. Null/undefined/empty input tolerance
test('Safe fallback on undefined or partial input objects', () => {
  assert.doesNotThrow(() => {
    normalizedToCmyk({} as any);
    cmykToNormalized({} as any);
    normalizedToHls({} as any);
    hlsToNormalized({} as any);
    normalizedToHsv({} as any);
    hsvToNormalized({} as any);
  });
});

// 10. CMYK roundtrip stability on primaries and gray
test('CMYK round-trip stability on boundaries', () => {
  const testColors = [
    { r: 0, g: 0, b: 0 },
    { r: 255, g: 255, b: 255 },
    { r: 128, g: 128, b: 128 },
    { r: 255, g: 0, b: 0 },
    { r: 0, g: 255, b: 0 },
    { r: 0, g: 0, b: 255 },
    { r: 0, g: 255, b: 255 },
    { r: 255, g: 0, b: 255 },
    { r: 255, g: 255, b: 0 },
  ];

  for (const c of testColors) {
    const norm = rgbToNormalized(c);
    const cmyk = normalizedToCmyk(norm);
    const backNorm = cmykToNormalized(cmyk);
    const backRgb = normalizedToRgb(backNorm);

    assert(Math.abs(backRgb.r - c.r) <= 1, `CMYK roundtrip R failed for ${JSON.stringify(c)}: got ${backRgb.r}`);
    assert(Math.abs(backRgb.g - c.g) <= 1, `CMYK roundtrip G failed for ${JSON.stringify(c)}: got ${backRgb.g}`);
    assert(Math.abs(backRgb.b - c.b) <= 1, `CMYK roundtrip B failed for ${JSON.stringify(c)}: got ${backRgb.b}`);
  }
});

console.log(`\nTests completed: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);

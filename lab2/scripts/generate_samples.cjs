const fs = require('fs');
const path = require('path');

function createBmp(width, height, pixelFn) {
  const rowSize = Math.floor((24 * width + 31) / 32) * 4;
  const pixelArraySize = rowSize * height;
  const fileSize = 54 + pixelArraySize;

  const buf = Buffer.alloc(fileSize);

  // File Header
  buf.write('BM', 0);
  buf.writeUInt32LE(fileSize, 2);
  buf.writeUInt32LE(0, 6);
  buf.writeUInt32LE(54, 10);

  // DIB Header
  buf.writeUInt32LE(40, 14);
  buf.writeInt32LE(width, 18);
  buf.writeInt32LE(height, 22); // bottom-up
  buf.writeUInt16LE(1, 26);
  buf.writeUInt16LE(24, 28);
  buf.writeUInt32LE(0, 30);
  buf.writeUInt32LE(pixelArraySize, 34);
  buf.writeInt32LE(2835, 38);
  buf.writeInt32LE(2835, 42);
  buf.writeUInt32LE(0, 46);
  buf.writeUInt32LE(0, 50);

  // Pixel data (bottom-up: y from 0 to height-1, where y=0 is bottom row)
  for (let y = 0; y < height; y++) {
    const rowOffset = 54 + y * rowSize;
    // Map bottom-up coordinate to visual top-down coordinate
    const visualY = height - 1 - y;
    for (let x = 0; x < width; x++) {
      const [r, g, b] = pixelFn(x, visualY, width, height);
      const pxOffset = rowOffset + x * 3;
      buf[pxOffset] = b;
      buf[pxOffset + 1] = g;
      buf[pxOffset + 2] = r;
    }
  }

  return buf;
}

const outDir = path.join(__dirname, '../public/samples');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const W = 512;
const H = 384;

// 1. Low Contrast (Туманный пейзаж / узкий динамический диапазон 90..150)
const lowContrast = createBmp(W, H, (x, y) => {
  const nx = x / W;
  const ny = y / H;
  const sky = 135 + 15 * Math.sin(nx * 3);
  const mountain = Math.sin(nx * 6) * 40 + Math.cos(nx * 15) * 15 + H * 0.55;
  const treeLine = Math.sin(nx * 12) * 20 + H * 0.75;

  let base = 130;
  if (y > treeLine) {
    base = 100 + Math.sin(x * 0.5) * 8 + Math.cos(y * 0.5) * 8;
  } else if (y > mountain) {
    base = 115 + (y - mountain) * 0.2;
  } else {
    base = sky - ny * 15;
  }
  // keep strictly low contrast in [95, 145]
  const val = Math.max(95, Math.min(145, Math.round(base)));
  return [val, val + 2, val - 3];
});
fs.writeFileSync(path.join(outDir, 'low_contrast.bmp'), lowContrast);

// 2. Dark / Underexposed (Ночной пейзаж / сжато влево 5..75)
const darkUnderexposed = createBmp(W, H, (x, y) => {
  const nx = x / W;
  const ny = y / H;
  const moonDist = Math.hypot(x - 400, y - 90);
  let base = 12 + ny * 25;
  if (moonDist < 30) {
    base = 70 - moonDist;
  }
  const building = Math.floor(nx * 12) % 2 === 0 && y > H * 0.6;
  if (building) {
    base = 25;
    const windowX = (x % 42);
    const windowY = (y % 30);
    if (windowX > 10 && windowX < 25 && windowY > 8 && windowY < 22 && (Math.sin(x * y) > 0.2)) {
      return [75, 65, 30]; // dim warm light
    }
  }
  const val = Math.max(5, Math.min(75, Math.round(base)));
  return [Math.round(val * 0.8), val, Math.round(val * 1.2)];
});
fs.writeFileSync(path.join(outDir, 'dark_night.bmp'), darkUnderexposed);

// 3. Colorful (Яркие цветы / насыщенные цвета для RGB vs HSV эквализации)
const colorful = createBmp(W, H, (x, y) => {
  const cx = W / 2;
  const cy = H / 2;
  const dist = Math.hypot(x - cx, y - cy);
  const angle = Math.atan2(y - cy, x - cx);

  // Petals
  const petals = 6;
  const r = 120 + 40 * Math.sin(petals * angle);
  if (dist < 40) {
    return [240, 210, 30]; // bright yellow core
  } else if (dist < r) {
    const red = Math.round(200 + 55 * Math.sin(angle * 3));
    const green = Math.round(30 + 40 * Math.cos(angle * 2));
    const blue = Math.round(180 + 70 * Math.sin(dist * 0.1));
    return [red, green, blue];
  } else {
    // Green leaves background with slight gradient
    const leaf = Math.sin(x * 0.05) * Math.cos(y * 0.05);
    const g = 110 + Math.round(40 * leaf);
    const rVal = 30 + Math.round(20 * leaf);
    const bVal = 40;
    return [rVal, g, bVal];
  }
});
fs.writeFileSync(path.join(outDir, 'colorful.bmp'), colorful);

// 4. Blurry text & details (Для фильтров резкости и нерезкого маскирования)
const blurry = createBmp(W, H, (x, y) => {
  // Checkerboard / text pattern softly blurred
  let v = 128;
  const gridX = Math.floor(x / 32);
  const gridY = Math.floor(y / 32);
  const isBox = (gridX + gridY) % 2 === 0;

  // Concentric rings
  const ringDist = Math.hypot(x - 256, y - 192);
  const ring = Math.sin(ringDist * 0.15);

  // Soft edges (simulating out-of-focus blur)
  const blurVal = (Math.sin(x * 0.1) * Math.cos(y * 0.1) + ring * 0.7) * 45;
  const base = isBox ? 160 : 90;
  v = Math.round(base + blurVal);
  v = Math.max(30, Math.min(225, v));

  // Add subtle color tint
  return [v, Math.round(v * 0.95), Math.round(v * 1.05)];
});
fs.writeFileSync(path.join(outDir, 'blurry_details.bmp'), blurry);

console.log('Sample images generated successfully!');

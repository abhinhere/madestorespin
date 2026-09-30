const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 implementation
function makeCrcTable() {
  const table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c;
  }
  return table;
}
const crcTable = makeCrcTable();

function crc32(buf) {
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

function createChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(8 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  if (len > 0) data.copy(buf, 8);
  const crc = crc32(buf.subarray(4, 8 + len));
  buf.writeUInt32BE(crc, 8 + len);
  return buf;
}

function encodePNG(width, height, rgbaBuffer) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bits per channel
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // Deflate compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  // Create scanlines with filter type 0 (None)
  const scanlines = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const srcStart = y * width * 4;
    const destStart = y * (1 + width * 4);
    scanlines[destStart] = 0; // Filter 0
    rgbaBuffer.copy(scanlines, destStart + 1, srcStart, srcStart + width * 4);
  }

  const idatData = zlib.deflateSync(scanlines, { level: 9 });

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    createChunk('IHDR', ihdr),
    createChunk('IDAT', idatData),
    createChunk('IEND', Buffer.alloc(0))
  ]);
}

// Distance to rounded rectangle
function roundedRectDist(x, y, w, h, r) {
  const qx = Math.abs(x - w / 2) - (w / 2 - r);
  const qy = Math.abs(y - h / 2) - (h / 2 - r);
  const ox = Math.max(qx, 0);
  const oy = Math.max(qy, 0);
  const inside = Math.min(Math.max(qx, qy), 0);
  return Math.sqrt(ox * ox + oy * oy) + inside - r;
}

// Draw the Made Store Spin Icon
function generateIcon(size, isMaskable = false) {
  const buf = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const scale = isMaskable ? 0.78 : 0.94;
  const R = (size / 2) * scale;
  const cornerRadius = size * 0.22;

  function blendPixel(x, y, r, g, b, a) {
    if (x < 0 || x >= size || y < 0 || y >= size || a <= 0) return;
    const idx = (y * size + x) * 4;
    const srcA = a / 255;
    const dstA = buf[idx + 3] / 255;
    const outA = srcA + dstA * (1 - srcA);
    if (outA <= 0) return;

    buf[idx + 0] = Math.round((r * srcA + buf[idx + 0] * dstA * (1 - srcA)) / outA);
    buf[idx + 1] = Math.round((g * srcA + buf[idx + 1] * dstA * (1 - srcA)) / outA);
    buf[idx + 2] = Math.round((b * srcA + buf[idx + 2] * dstA * (1 - srcA)) / outA);
    buf[idx + 3] = Math.round(outA * 255);
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Masking / boundaries
      let baseAlpha = 255;
      if (!isMaskable) {
        const dCorner = roundedRectDist(x, y, size, size, cornerRadius);
        if (dCorner > 0) {
          continue; // Outside rounded icon
        } else if (dCorner > -1.5) {
          baseAlpha = Math.round(255 * (1 - (dCorner + 1.5) / 1.5));
        }
      }

      // Base Background: Rich Olive Gold Gradient
      const distFromCenter = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / (size * 0.707);
      const bgR = Math.round(128 - distFromCenter * 50);
      const bgG = Math.round(128 - distFromCenter * 55);
      const bgB = Math.round(68 - distFromCenter * 35);
      blendPixel(x, y, bgR, bgG, bgB, baseAlpha);

      // Radial coordinates for the wheel
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = (Math.atan2(dy, dx) + 2 * Math.PI) % (2 * Math.PI);

      // 1. Wheel Outer Bezel (Watch Rim)
      if (dist <= R && dist > R * 0.90) {
        // Gold Metallic Bezel
        const t = (dist - R * 0.90) / (R * 0.10);
        const shine = Math.sin(angle * 2) * 0.2 + 0.8;
        const goldR = Math.min(255, Math.round(229 * shine));
        const goldG = Math.min(255, Math.round(217 * shine));
        const goldB = Math.min(255, Math.round(180 * shine));
        blendPixel(x, y, goldR, goldG, goldB, baseAlpha);
      }

      // 2. Bezel notches / tick marks
      if (dist <= R * 0.90 && dist >= R * 0.86) {
        const tickAngle = Math.PI / 6; // 12 ticks
        const inTick = Math.abs((angle % tickAngle) - tickAngle / 2) < 0.05;
        if (inTick) {
          blendPixel(x, y, 255, 245, 214, baseAlpha);
        } else {
          blendPixel(x, y, 40, 42, 32, baseAlpha);
        }
      }

      // 3. Wheel Segments (8 slices)
      if (dist < R * 0.86 && dist >= R * 0.44) {
        const sliceIndex = Math.floor(angle / (Math.PI / 4));
        const sliceAngle = angle % (Math.PI / 4);
        const isDivider = sliceAngle < 0.04 || sliceAngle > (Math.PI / 4 - 0.04);

        if (isDivider) {
          blendPixel(x, y, 229, 217, 180, Math.round(baseAlpha * 0.9));
        } else if (sliceIndex % 2 === 0) {
          // Olive sector
          blendPixel(x, y, 107, 108, 56, baseAlpha);
        } else {
          // Charcoal sector
          blendPixel(x, y, 37, 39, 31, baseAlpha);
        }
      }

      // 4. Center Hub Gold Border
      if (dist < R * 0.44 && dist >= R * 0.38) {
        blendPixel(x, y, 229, 217, 180, baseAlpha);
      }

      // 5. Center Hub Inset Charcoal Core
      if (dist < R * 0.38) {
        const hubDist = dist / (R * 0.38);
        const hubR = Math.round(30 - hubDist * 12);
        const hubG = Math.round(32 - hubDist * 14);
        const hubB = Math.round(24 - hubDist * 10);
        blendPixel(x, y, hubR, hubG, hubB, baseAlpha);
      }

      // 6. Top pointer indicator triangle
      if (dy < -R * 0.80 && dy > -R * 1.02 && Math.abs(dx) < (dy + R * 1.02) * 0.7) {
        blendPixel(x, y, 255, 242, 204, baseAlpha);
      }
    }
  }

  // Draw Monogram "M" in center of hub
  const mSize = R * 0.42;
  const mTop = cy - mSize * 0.52;
  const mBottom = cy + mSize * 0.42;
  const mLeft = cx - mSize * 0.52;
  const mRight = cx + mSize * 0.52;
  const strokeW = Math.max(2, Math.round(size * 0.022));

  function drawThickLine(x1, y1, x2, y2, stroke, r, g, b) {
    const steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1) * 2);
    for (let s = 0; s <= steps; s++) {
      const px = x1 + (x2 - x1) * (s / steps);
      const py = y1 + (y2 - y1) * (s / steps);
      for (let oy = -stroke / 2; oy <= stroke / 2; oy++) {
        for (let ox = -stroke / 2; ox <= stroke / 2; ox++) {
          if (ox * ox + oy * oy <= (stroke / 2) * (stroke / 2)) {
            blendPixel(Math.round(px + ox), Math.round(py + oy), r, g, b, 255);
          }
        }
      }
    }
  }

  // Draw luxury bold geometric 'M'
  drawThickLine(mLeft, mBottom, mLeft, mTop, strokeW, 255, 245, 214);
  drawThickLine(mLeft, mTop, cx, cy + mSize * 0.1, strokeW * 0.9, 255, 245, 214);
  drawThickLine(cx, cy + mSize * 0.1, mRight, mTop, strokeW * 0.9, 255, 245, 214);
  drawThickLine(mRight, mTop, mRight, mBottom, strokeW, 255, 245, 214);

  // Tiny spark ✦ accent above M
  const sparkY = mTop - mSize * 0.28;
  const sparkRadius = Math.max(2, Math.round(size * 0.015));
  for (let oy = -sparkRadius; oy <= sparkRadius; oy++) {
    for (let ox = -sparkRadius; ox <= sparkRadius; ox++) {
      if (Math.abs(ox) + Math.abs(oy) <= sparkRadius) {
        blendPixel(Math.round(cx + ox), Math.round(sparkY + oy), 255, 245, 214, 255);
      }
    }
  }

  return encodePNG(size, height = size, buf);
}

// Generate all icon targets
const targetDir = path.resolve(__dirname, '..', 'public', 'icons');
fs.mkdirSync(targetDir, { recursive: true });

console.log('Generating PWA icons in:', targetDir);

// 1. icon-192.png
fs.writeFileSync(path.join(targetDir, 'icon-192.png'), generateIcon(192, false));
console.log('✔ icon-192.png generated');

// 2. icon-512.png
fs.writeFileSync(path.join(targetDir, 'icon-512.png'), generateIcon(512, false));
console.log('✔ icon-512.png generated');

// 3. icon-maskable-192.png
fs.writeFileSync(path.join(targetDir, 'icon-maskable-192.png'), generateIcon(192, true));
console.log('✔ icon-maskable-192.png generated');

// 4. icon-maskable-512.png
fs.writeFileSync(path.join(targetDir, 'icon-maskable-512.png'), generateIcon(512, true));
console.log('✔ icon-maskable-512.png generated');

// 5. apple-touch-icon.png (180x180)
fs.writeFileSync(path.join(targetDir, 'apple-touch-icon.png'), generateIcon(180, false));
console.log('✔ apple-touch-icon.png generated');

// 6. favicon.png (64x64)
fs.writeFileSync(path.join(targetDir, 'favicon.png'), generateIcon(64, false));
fs.writeFileSync(path.resolve(__dirname, '..', 'public', 'favicon.png'), generateIcon(64, false));
console.log('✔ favicon.png generated');

console.log('All PWA icons generated successfully!');

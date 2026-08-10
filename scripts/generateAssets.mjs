#!/usr/bin/env node
/**
 * Asset Generator for Math Hero RPG
 * Generates valid PNG files for all game entities.
 * Uses raw PNG encoding (zlib + CRC32) — no native dependencies required.
 */
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { deflateSync } from 'zlib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ASSETS_DIR = join(__dirname, '..', 'public', 'assets');

if (!existsSync(ASSETS_DIR)) mkdirSync(ASSETS_DIR, { recursive: true });

// ── CRC32 ──
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  crcTable[n] = c;
}
function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// ── PNG writer ──
function makePNG(width, height, pixels) {
  // pixels: Uint8Array of RGBA data (width * height * 4)
  // Build raw scanlines with filter byte 0 (None)
  const rawData = [];
  for (let y = 0; y < height; y++) {
    rawData.push(0); // filter byte
    const offset = y * width * 4;
    for (let x = 0; x < width * 4; x++) {
      rawData.push(pixels[offset + x]);
    }
  }
  const compressed = deflateSync(Buffer.from(rawData));

  function chunk(type, data) {
    const typeBytes = Buffer.from(type, 'ascii');
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const combined = Buffer.concat([typeBytes, data]);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(combined));
    return Buffer.concat([len, combined, crcBuf]);
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

// ── Color helpers ──
function hexToRGBA(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16), 255];
}

function blendColor(c1, c2, t) {
  return [
    Math.round(c1[0] + (c2[0] - c1[0]) * t),
    Math.round(c1[1] + (c2[1] - c1[1]) * t),
    Math.round(c1[2] + (c2[2] - c1[2]) * t),
    255
  ];
}

// ── Shape drawing on pixel buffer ──
function createBuffer(w, h) {
  return { w, h, data: new Uint8Array(w * h * 4) };
}

function setPixel(buf, x, y, rgba) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || x >= buf.w || y < 0 || y >= buf.h) return;
  const i = (y * buf.w + x) * 4;
  const srcA = rgba[3] / 255;
  const dstA = buf.data[i + 3] / 255;
  const outA = srcA + dstA * (1 - srcA);
  if (outA === 0) return;
  buf.data[i]     = Math.round((rgba[0] * srcA + buf.data[i] * dstA * (1 - srcA)) / outA);
  buf.data[i + 1] = Math.round((rgba[1] * srcA + buf.data[i + 1] * dstA * (1 - srcA)) / outA);
  buf.data[i + 2] = Math.round((rgba[2] * srcA + buf.data[i + 2] * dstA * (1 - srcA)) / outA);
  buf.data[i + 3] = Math.round(outA * 255);
}

function fillRect(buf, x, y, w, h, rgba) {
  for (let dy = 0; dy < h; dy++)
    for (let dx = 0; dx < w; dx++)
      setPixel(buf, x + dx, y + dy, rgba);
}

function fillCircle(buf, cx, cy, r, rgba) {
  for (let dy = -r; dy <= r; dy++)
    for (let dx = -r; dx <= r; dx++)
      if (dx * dx + dy * dy <= r * r) setPixel(buf, cx + dx, cy + dy, rgba);
}

function fillEllipse(buf, cx, cy, rx, ry, rgba) {
  for (let dy = -ry; dy <= ry; dy++)
    for (let dx = -rx; dx <= rx; dx++)
      if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1) setPixel(buf, cx + dx, cy + dy, rgba);
}

function fillTriangle(buf, x1, y1, x2, y2, x3, y3, rgba) {
  const minX = Math.min(x1, x2, x3);
  const maxX = Math.max(x1, x2, x3);
  const minY = Math.min(y1, y2, y3);
  const maxY = Math.max(y1, y2, y3);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const d1 = (x - x2) * (y1 - y2) - (x1 - x2) * (y - y2);
      const d2 = (x - x3) * (y2 - y3) - (x2 - x3) * (y - y3);
      const d3 = (x - x1) * (y3 - y1) - (x3 - x1) * (y - y1);
      const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
      const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
      if (!(hasNeg && hasPos)) setPixel(buf, x, y, rgba);
    }
  }
}

function gradient(buf, x, y, w, h, c1, c2, vertical = true) {
  for (let dy = 0; dy < h; dy++)
    for (let dx = 0; dx < w; dx++) {
      const t = vertical ? dy / h : dx / w;
      setPixel(buf, x + dx, y + dy, blendColor(c1, c2, t));
    }
}

// ── Asset Generators ──
const SIZE = 256;

function generateHero(name, mainColor, accentColor, weaponType) {
  const buf = createBuffer(SIZE, SIZE);
  const mc = hexToRGBA(mainColor);
  const ac = hexToRGBA(accentColor);
  const skin = [245, 198, 165, 255];
  const dark = [30, 30, 50, 255];

  // Body
  fillRect(buf, 100, 100, 56, 80, mc);
  // Armor lines
  fillRect(buf, 100, 120, 56, 4, ac);
  fillRect(buf, 100, 140, 56, 4, ac);
  // Head
  fillCircle(buf, 128, 80, 28, skin);
  // Hair
  fillCircle(buf, 128, 65, 24, dark);
  // Eyes
  fillCircle(buf, 118, 78, 4, [255, 255, 255, 255]);
  fillCircle(buf, 138, 78, 4, [255, 255, 255, 255]);
  fillCircle(buf, 119, 79, 2, dark);
  fillCircle(buf, 139, 79, 2, dark);
  // Legs
  fillRect(buf, 108, 180, 16, 40, dark);
  fillRect(buf, 132, 180, 16, 40, dark);
  // Boots
  fillRect(buf, 106, 210, 20, 14, mc);
  fillRect(buf, 130, 210, 20, 14, mc);
  // Arms
  fillRect(buf, 82, 110, 18, 50, mc);
  fillRect(buf, 156, 110, 18, 50, mc);
  // Hands
  fillCircle(buf, 91, 162, 8, skin);
  fillCircle(buf, 165, 162, 8, skin);

  // Weapon
  if (weaponType === 'sword') {
    fillRect(buf, 163, 100, 6, 70, [192, 192, 210, 255]);
    fillRect(buf, 155, 98, 22, 6, [160, 130, 70, 255]);
  } else if (weaponType === 'staff') {
    fillRect(buf, 165, 70, 5, 100, [120, 80, 40, 255]);
    fillCircle(buf, 167, 68, 12, ac);
  } else if (weaponType === 'saber') {
    fillRect(buf, 163, 90, 5, 80, [220, 220, 230, 255]);
    fillRect(buf, 158, 168, 15, 5, [160, 130, 70, 255]);
  } else if (weaponType === 'bow') {
    // Bow curve approximation
    for (let i = 0; i < 60; i++) {
      const angle = (i / 60) * Math.PI - Math.PI / 2;
      setPixel(buf, 170 + Math.cos(angle) * 20, 110 + i, [139, 90, 43, 255]);
    }
    fillRect(buf, 170, 110, 1, 60, [200, 200, 200, 200]);
  }

  // Cape
  gradient(buf, 96, 130, 10, 60, mc, [mc[0] * 0.5, mc[1] * 0.5, mc[2] * 0.5, 200], true);

  return makePNG(SIZE, SIZE, buf.data);
}

function generateEnemy(name, mainColor, shape, sizeScale = 1.0, isFlying = false) {
  const buf = createBuffer(SIZE, SIZE);
  const mc = hexToRGBA(mainColor);
  const dark = [mc[0] * 0.5 | 0, mc[1] * 0.5 | 0, mc[2] * 0.5 | 0, 255];
  const eye = [255, 255, 255, 255];
  const pupil = [20, 20, 30, 255];
  const s = sizeScale;

  const cy = isFlying ? 100 : 140;

  if (shape === 'slime') {
    fillEllipse(buf, 128, cy + 20, Math.round(40 * s), Math.round(30 * s), mc);
    fillEllipse(buf, 128, cy + 30, Math.round(45 * s), Math.round(15 * s), dark);
    fillCircle(buf, 115, cy + 10, 7, eye);
    fillCircle(buf, 141, cy + 10, 7, eye);
    fillCircle(buf, 117, cy + 12, 3, pupil);
    fillCircle(buf, 143, cy + 12, 3, pupil);
  } else if (shape === 'goblin') {
    fillRect(buf, 108, cy - 10, Math.round(40 * s), Math.round(50 * s), mc);
    fillCircle(buf, 128, cy - 20, Math.round(18 * s), mc);
    fillTriangle(buf, 105, cy - 28, 100, cy - 10, 110, cy - 15, mc);
    fillTriangle(buf, 151, cy - 28, 156, cy - 10, 146, cy - 15, mc);
    fillCircle(buf, 120, cy - 22, 4, eye);
    fillCircle(buf, 136, cy - 22, 4, eye);
    fillCircle(buf, 121, cy - 21, 2, pupil);
    fillCircle(buf, 137, cy - 21, 2, pupil);
    fillRect(buf, 112, cy + 40, 14, 30, dark);
    fillRect(buf, 130, cy + 40, 14, 30, dark);
  } else if (shape === 'beast') {
    fillEllipse(buf, 128, cy, Math.round(45 * s), Math.round(30 * s), mc);
    fillCircle(buf, 128, cy - 25, Math.round(22 * s), mc);
    fillTriangle(buf, 110, cy - 45, 106, cy - 25, 118, cy - 28, dark);
    fillTriangle(buf, 146, cy - 45, 150, cy - 25, 138, cy - 28, dark);
    fillCircle(buf, 120, cy - 28, 5, eye);
    fillCircle(buf, 136, cy - 28, 5, eye);
    fillCircle(buf, 121, cy - 27, 2, [220, 50, 50, 255]);
    fillCircle(buf, 137, cy - 27, 2, [220, 50, 50, 255]);
    fillRect(buf, 108, cy + 20, 12, 30, dark);
    fillRect(buf, 136, cy + 20, 12, 30, dark);
  } else if (shape === 'golem') {
    fillRect(buf, 100, cy - 20, Math.round(56 * s), Math.round(70 * s), mc);
    fillRect(buf, 106, cy - 30, Math.round(44 * s), Math.round(20 * s), mc);
    fillCircle(buf, 118, cy - 24, 5, [200, 150, 50, 255]);
    fillCircle(buf, 138, cy - 24, 5, [200, 150, 50, 255]);
    fillRect(buf, 82, cy - 10, 18, 50, mc);
    fillRect(buf, 156, cy - 10, 18, 50, mc);
    fillRect(buf, 105, cy + 50, 20, 30, mc);
    fillRect(buf, 131, cy + 50, 20, 30, mc);
  } else if (shape === 'flying') {
    fillEllipse(buf, 128, cy, Math.round(30 * s), Math.round(20 * s), mc);
    // Wings
    fillTriangle(buf, 85, cy - 20, 100, cy - 5, 100, cy + 10, [...mc.slice(0, 3), 180]);
    fillTriangle(buf, 171, cy - 20, 156, cy - 5, 156, cy + 10, [...mc.slice(0, 3), 180]);
    fillCircle(buf, 120, cy - 5, 4, eye);
    fillCircle(buf, 136, cy - 5, 4, eye);
    fillCircle(buf, 121, cy - 4, 2, pupil);
    fillCircle(buf, 137, cy - 4, 2, pupil);
  } else if (shape === 'mage') {
    fillRect(buf, 110, cy - 10, 36, 55, mc);
    fillCircle(buf, 128, cy - 20, 16, mc);
    // Hat
    fillTriangle(buf, 108, cy - 20, 128, cy - 55, 148, cy - 20, dark);
    fillCircle(buf, 120, cy - 22, 3, [100, 200, 255, 255]);
    fillCircle(buf, 136, cy - 22, 3, [100, 200, 255, 255]);
    // Staff
    fillRect(buf, 150, cy - 40, 4, 80, [100, 60, 30, 255]);
    fillCircle(buf, 152, cy - 42, 8, [150, 100, 255, 200]);
  } else {
    // Generic circle
    fillCircle(buf, 128, cy, Math.round(35 * s), mc);
    fillCircle(buf, 118, cy - 8, 5, eye);
    fillCircle(buf, 138, cy - 8, 5, eye);
    fillCircle(buf, 119, cy - 7, 2, pupil);
    fillCircle(buf, 139, cy - 7, 2, pupil);
  }

  return makePNG(SIZE, SIZE, buf.data);
}

function generateBoss(name, mainColor, extraFeatures) {
  const buf = createBuffer(SIZE, SIZE);
  const mc = hexToRGBA(mainColor);
  const glow = [...mc.slice(0, 3), 100];
  const eye = [255, 200, 50, 255];
  const dark = [20, 15, 30, 255];

  // Glow aura
  fillCircle(buf, 128, 128, 110, [...mc.slice(0, 3), 30]);
  fillCircle(buf, 128, 128, 90, [...mc.slice(0, 3), 50]);

  if (extraFeatures === 'slime') {
    fillEllipse(buf, 128, 140, 70, 50, mc);
    fillEllipse(buf, 128, 160, 80, 25, [mc[0] * 0.7 | 0, mc[1] * 0.7 | 0, mc[2] * 0.7 | 0, 255]);
    fillCircle(buf, 108, 120, 12, [255, 255, 255, 255]);
    fillCircle(buf, 148, 120, 12, [255, 255, 255, 255]);
    fillCircle(buf, 110, 122, 6, dark);
    fillCircle(buf, 150, 122, 6, dark);
    // Crown
    fillTriangle(buf, 95, 95, 108, 70, 120, 95, [241, 196, 15, 255]);
    fillTriangle(buf, 115, 95, 128, 65, 140, 95, [241, 196, 15, 255]);
    fillTriangle(buf, 135, 95, 148, 70, 160, 95, [241, 196, 15, 255]);
  } else if (extraFeatures === 'mushroom') {
    // Cap
    fillEllipse(buf, 128, 95, 65, 40, mc);
    // Dots on cap
    fillCircle(buf, 100, 85, 8, [255, 255, 255, 200]);
    fillCircle(buf, 140, 80, 10, [255, 255, 255, 200]);
    fillCircle(buf, 160, 95, 6, [255, 255, 255, 200]);
    // Stem
    fillRect(buf, 108, 120, 40, 60, [240, 230, 210, 255]);
    fillCircle(buf, 118, 135, 5, dark);
    fillCircle(buf, 138, 135, 5, dark);
    fillRect(buf, 118, 150, 20, 4, [200, 80, 80, 255]);
  } else if (extraFeatures === 'bee_queen') {
    fillEllipse(buf, 128, 130, 50, 40, mc);
    // Stripes
    for (let i = 0; i < 4; i++) {
      fillRect(buf, 88, 115 + i * 12, 80, 5, dark);
    }
    // Wings
    fillEllipse(buf, 80, 100, 30, 20, [255, 255, 255, 140]);
    fillEllipse(buf, 176, 100, 30, 20, [255, 255, 255, 140]);
    // Crown
    fillTriangle(buf, 108, 90, 118, 65, 128, 90, [241, 196, 15, 255]);
    fillTriangle(buf, 128, 90, 138, 65, 148, 90, [241, 196, 15, 255]);
    fillCircle(buf, 115, 120, 6, [255, 255, 255, 255]);
    fillCircle(buf, 141, 120, 6, [255, 255, 255, 255]);
    fillCircle(buf, 116, 121, 3, dark);
    fillCircle(buf, 142, 121, 3, dark);
  } else if (extraFeatures === 'pharaoh') {
    fillRect(buf, 104, 100, 48, 70, mc);
    fillCircle(buf, 128, 85, 25, [210, 180, 140, 255]);
    // Headdress
    fillRect(buf, 95, 60, 66, 30, [0, 100, 200, 255]);
    fillTriangle(buf, 128, 45, 118, 60, 138, 60, [241, 196, 15, 255]);
    fillCircle(buf, 118, 82, 4, dark);
    fillCircle(buf, 138, 82, 4, dark);
    fillRect(buf, 108, 170, 16, 35, mc);
    fillRect(buf, 132, 170, 16, 35, mc);
  } else if (extraFeatures === 'dragon') {
    fillEllipse(buf, 128, 140, 55, 45, mc);
    fillCircle(buf, 128, 90, 30, mc);
    // Horns
    fillTriangle(buf, 100, 70, 95, 40, 115, 75, dark);
    fillTriangle(buf, 156, 70, 161, 40, 141, 75, dark);
    // Wings
    fillTriangle(buf, 50, 80, 80, 100, 80, 160, [...mc.slice(0, 3), 150]);
    fillTriangle(buf, 206, 80, 176, 100, 176, 160, [...mc.slice(0, 3), 150]);
    fillCircle(buf, 116, 85, 7, [255, 200, 0, 255]);
    fillCircle(buf, 140, 85, 7, [255, 200, 0, 255]);
    fillCircle(buf, 117, 86, 3, [200, 50, 0, 255]);
    fillCircle(buf, 141, 86, 3, [200, 50, 0, 255]);
    // Fire breath
    fillTriangle(buf, 118, 108, 128, 130, 138, 108, [255, 100, 0, 180]);
  } else if (extraFeatures === 'ice_demon') {
    fillRect(buf, 100, 90, 56, 80, mc);
    fillCircle(buf, 128, 75, 25, mc);
    // Horns
    fillTriangle(buf, 105, 60, 100, 35, 115, 65, [150, 200, 255, 255]);
    fillTriangle(buf, 151, 60, 156, 35, 141, 65, [150, 200, 255, 255]);
    fillCircle(buf, 118, 72, 5, [200, 230, 255, 255]);
    fillCircle(buf, 138, 72, 5, [200, 230, 255, 255]);
    fillCircle(buf, 119, 73, 2, [0, 100, 200, 255]);
    fillCircle(buf, 139, 73, 2, [0, 100, 200, 255]);
    // Ice crystals
    fillTriangle(buf, 75, 120, 85, 80, 95, 120, [180, 220, 255, 180]);
    fillTriangle(buf, 161, 120, 171, 80, 181, 120, [180, 220, 255, 180]);
  } else if (extraFeatures === 'storm_lord') {
    fillRect(buf, 96, 85, 64, 90, mc);
    fillCircle(buf, 128, 70, 28, mc);
    // 8 arms (simplified as rectangles)
    for (let i = 0; i < 4; i++) {
      fillRect(buf, 70, 95 + i * 18, 26, 8, mc);
      fillRect(buf, 160, 95 + i * 18, 26, 8, mc);
    }
    fillCircle(buf, 118, 65, 5, [255, 255, 100, 255]);
    fillCircle(buf, 138, 65, 5, [255, 255, 100, 255]);
    // Lightning
    for (let i = 0; i < 30; i++) {
      setPixel(buf, 128 + (Math.sin(i * 0.5) * 10 | 0), 180 + i * 2, [255, 255, 100, 220]);
    }
  } else if (extraFeatures === 'ghost_king') {
    fillEllipse(buf, 128, 130, 50, 60, [...mc.slice(0, 3), 200]);
    fillCircle(buf, 128, 90, 30, [...mc.slice(0, 3), 220]);
    // Crown
    fillTriangle(buf, 100, 70, 110, 40, 120, 70, [241, 196, 15, 200]);
    fillTriangle(buf, 120, 70, 128, 35, 136, 70, [241, 196, 15, 200]);
    fillTriangle(buf, 136, 70, 146, 40, 156, 70, [241, 196, 15, 200]);
    // Ghost eyes
    fillCircle(buf, 115, 88, 8, [255, 255, 255, 230]);
    fillCircle(buf, 141, 88, 8, [255, 255, 255, 230]);
    fillCircle(buf, 116, 89, 4, [100, 0, 200, 255]);
    fillCircle(buf, 142, 89, 4, [100, 0, 200, 255]);
    // Wavy bottom
    for (let x = 80; x < 176; x++) {
      const wavY = 175 + Math.sin(x * 0.15) * 10;
      fillRect(buf, x, Math.round(wavY), 1, 8, [...mc.slice(0, 3), 120]);
    }
  } else if (extraFeatures === 'secret') {
    // Pan Pomylkus - error boss
    fillCircle(buf, 128, 120, 50, mc);
    // Question marks
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const qx = 128 + Math.cos(angle) * 65 | 0;
      const qy = 120 + Math.sin(angle) * 65 | 0;
      fillCircle(buf, qx, qy, 10, [255, 100, 100, 180]);
    }
    fillCircle(buf, 115, 110, 8, [255, 255, 255, 255]);
    fillCircle(buf, 141, 110, 8, [255, 255, 255, 255]);
    fillCircle(buf, 116, 111, 4, [200, 0, 0, 255]);
    fillCircle(buf, 142, 111, 4, [200, 0, 0, 255]);
    // Angry brows
    fillRect(buf, 108, 100, 16, 3, dark);
    fillRect(buf, 132, 100, 16, 3, dark);
  }

  return makePNG(SIZE, SIZE, buf.data);
}

function generateBackground(name, skyTop, skyBottom, groundColor, features) {
  const W = 512, H = 256;
  const buf = createBuffer(W, H);
  const top = hexToRGBA(skyTop);
  const bot = hexToRGBA(skyBottom);
  const ground = hexToRGBA(groundColor);

  // Sky gradient
  gradient(buf, 0, 0, W, H * 0.75 | 0, top, bot, true);

  // Mountains / hills
  const hillColor = blendColor(bot, [60, 60, 80, 255], 0.4);
  for (let peak = 0; peak < 5; peak++) {
    const px = peak * 120 + 30;
    const ph = 40 + (peak % 3) * 25;
    const pw = 80 + (peak % 2) * 40;
    fillTriangle(buf, px - pw / 2, H * 0.75 | 0, px, (H * 0.75 | 0) - ph, px + pw / 2, H * 0.75 | 0, hillColor);
  }

  // Ground
  fillRect(buf, 0, H * 0.75 | 0, W, H * 0.25 | 0, ground);

  // Grass line
  const grassColor = blendColor(ground, [50, 200, 80, 255], 0.5);
  fillRect(buf, 0, H * 0.75 | 0, W, 4, grassColor);

  // Features
  if (features === 'trees') {
    for (let t = 0; t < 4; t++) {
      const tx = 60 + t * 130;
      fillRect(buf, tx - 4, H * 0.6 | 0, 8, H * 0.15 | 0, [100, 70, 40, 255]);
      fillCircle(buf, tx, H * 0.55 | 0, 20, [40, 140, 50, 220]);
    }
  } else if (features === 'mushrooms') {
    for (let t = 0; t < 5; t++) {
      const tx = 40 + t * 110;
      fillRect(buf, tx - 3, H * 0.68 | 0, 6, H * 0.07 | 0, [200, 190, 170, 255]);
      fillEllipse(buf, tx, H * 0.66 | 0, 18, 12, [180, 80, 180, 220]);
      fillCircle(buf, tx - 5, H * 0.64 | 0, 4, [255, 255, 255, 180]);
      fillCircle(buf, tx + 8, H * 0.65 | 0, 3, [255, 255, 255, 180]);
    }
  } else if (features === 'crystals') {
    for (let t = 0; t < 4; t++) {
      const tx = 70 + t * 120;
      const ch = 20 + (t % 3) * 10;
      fillTriangle(buf, tx - 10, H * 0.75 | 0, tx, (H * 0.75 | 0) - ch, tx + 10, H * 0.75 | 0, [200, 170, 50, 200]);
    }
  } else if (features === 'pyramids') {
    fillTriangle(buf, 150, H * 0.75 | 0, 200, H * 0.45 | 0, 250, H * 0.75 | 0, [220, 190, 130, 220]);
    fillTriangle(buf, 320, H * 0.75 | 0, 360, H * 0.5 | 0, 400, H * 0.75 | 0, [200, 170, 110, 220]);
  } else if (features === 'lava') {
    for (let i = 0; i < 8; i++) {
      const lx = i * 70 + 10;
      fillEllipse(buf, lx, H * 0.8 | 0, 25, 8, [255, 100, 0, 200]);
    }
  } else if (features === 'ice') {
    for (let t = 0; t < 6; t++) {
      const tx = 30 + t * 90;
      fillTriangle(buf, tx - 8, H * 0.75 | 0, tx, (H * 0.75 | 0) - 30, tx + 8, H * 0.75 | 0, [180, 220, 255, 200]);
    }
  } else if (features === 'lightning') {
    for (let i = 0; i < 3; i++) {
      const lx = 100 + i * 150;
      for (let j = 0; j < 50; j++) {
        setPixel(buf, lx + (Math.sin(j * 0.7) * 8 | 0), 10 + j * 2, [255, 255, 150, 220]);
      }
    }
  } else if (features === 'ghosts') {
    for (let g = 0; g < 3; g++) {
      const gx = 80 + g * 160;
      fillCircle(buf, gx, H * 0.5 | 0, 15, [150, 100, 200, 80]);
      fillCircle(buf, gx - 4, H * 0.48 | 0, 3, [255, 255, 255, 120]);
      fillCircle(buf, gx + 4, H * 0.48 | 0, 3, [255, 255, 255, 120]);
    }
  }

  // Stars for dark themes
  if (top[0] + top[1] + top[2] < 200) {
    for (let i = 0; i < 30; i++) {
      const sx = (i * 17 + 5) % W;
      const sy = (i * 13 + 3) % (H * 0.4 | 0);
      setPixel(buf, sx, sy, [255, 255, 255, 180]);
    }
  }

  return makePNG(W, H, buf.data);
}

// ── Generate All Assets ──
console.log('Generating Math Hero RPG assets...');

// Heroes
const heroes = [
  { name: 'hero_knight', color: '#3b82f6', accent: '#60a5fa', weapon: 'sword' },
  { name: 'hero_sorceress', color: '#8b5cf6', accent: '#a78bfa', weapon: 'staff' },
  { name: 'hero_cossack', color: '#ef4444', accent: '#f87171', weapon: 'saber' },
  { name: 'hero_archer', color: '#10b981', accent: '#34d399', weapon: 'bow' },
];

heroes.forEach(h => {
  const png = generateHero(h.name, h.color, h.accent, h.weapon);
  const path = join(ASSETS_DIR, `${h.name}.png`);
  writeFileSync(path, png);
  console.log(`  ✓ ${h.name}.png (${png.length} bytes)`);
});

// Enemies - individual sprites for each of the 32 enemies
const enemies = [
  // Region 1
  { name: 'enemy_slime_green', color: '#2ecc71', shape: 'slime' },
  { name: 'enemy_slime_blue', color: '#3498db', shape: 'slime', size: 0.9 },
  { name: 'enemy_mushroom_prankster', color: '#e67e22', shape: 'goblin' },
  { name: 'enemy_jelly_bee', color: '#f1c40f', shape: 'flying', flying: true },
  { name: 'enemy_elite_1', color: '#27ae60', shape: 'golem', size: 1.2 },
  // Region 2
  { name: 'enemy_shroom_goblin', color: '#9b59b6', shape: 'goblin' },
  { name: 'enemy_spiky_bug', color: '#d35400', shape: 'beast', size: 0.9 },
  { name: 'enemy_forest_troll', color: '#16a085', shape: 'golem', size: 1.1 },
  { name: 'enemy_bat_eye', color: '#8e44ad', shape: 'flying', flying: true },
  { name: 'enemy_elite_2', color: '#8e44ad', shape: 'goblin', size: 1.2 },
  // Region 3
  { name: 'enemy_armored_bee', color: '#f39c12', shape: 'flying', flying: true },
  { name: 'enemy_honey_slime', color: '#f1c40f', shape: 'slime' },
  { name: 'enemy_spear_wasp', color: '#e67e22', shape: 'flying', flying: true },
  { name: 'enemy_bear_sweet', color: '#d35400', shape: 'beast', size: 1.2 },
  { name: 'enemy_elite_3', color: '#f1c40f', shape: 'flying', flying: true, size: 1.3 },
  // Region 4
  { name: 'enemy_sand_beetle', color: '#e67e22', shape: 'beast' },
  { name: 'enemy_mummy_student', color: '#bdc3c7', shape: 'golem' },
  { name: 'enemy_stone_mask', color: '#7f8c8d', shape: 'flying', flying: true },
  { name: 'enemy_desert_goblin', color: '#d35400', shape: 'goblin' },
  { name: 'enemy_elite_4', color: '#7f8c8d', shape: 'golem', size: 1.3 },
  // Region 5
  { name: 'enemy_fire_slime', color: '#e74c3c', shape: 'slime' },
  { name: 'enemy_lava_crab', color: '#c0392b', shape: 'beast' },
  { name: 'enemy_smith_goblin', color: '#d35400', shape: 'goblin' },
  { name: 'enemy_magma_golem', color: '#900c3f', shape: 'golem', size: 1.3 },
  { name: 'enemy_elite_5', color: '#c0392b', shape: 'beast', size: 1.4 },
  // Region 6
  { name: 'enemy_ice_slime', color: '#3498db', shape: 'slime' },
  { name: 'enemy_snow_wolf', color: '#ecf0f1', shape: 'beast' },
  { name: 'enemy_frost_goblin', color: '#2980b9', shape: 'goblin' },
  { name: 'enemy_frost_golem', color: '#1f618d', shape: 'golem', size: 1.3 },
  { name: 'enemy_elite_6', color: '#3498db', shape: 'flying', flying: true, size: 1.3 },
  // Region 7
  { name: 'enemy_electric_slime', color: '#f1c40f', shape: 'slime' },
  { name: 'enemy_storm_harpy', color: '#9b59b6', shape: 'flying', flying: true },
  { name: 'enemy_dark_knight', color: '#34495e', shape: 'golem', size: 1.1 },
  { name: 'enemy_thunder_mage', color: '#8e44ad', shape: 'mage' },
  { name: 'enemy_elite_7', color: '#8e44ad', shape: 'beast', size: 1.3 },
  // Region 8
  { name: 'enemy_phantom_scribe', color: '#9b59b6', shape: 'mage' },
  { name: 'enemy_enchanted_book', color: '#16a085', shape: 'flying', flying: true },
  { name: 'enemy_shadow_knight', color: '#2c3e50', shape: 'golem', size: 1.1 },
  { name: 'enemy_mirror_hero', color: '#ecf0f1', shape: 'goblin', size: 1.1 },
  { name: 'enemy_elite_8', color: '#8e44ad', shape: 'golem', size: 1.4 },
];

enemies.forEach(e => {
  const png = generateEnemy(e.name, e.color, e.shape, e.size || 1.0, e.flying || false);
  const path = join(ASSETS_DIR, `${e.name}.png`);
  writeFileSync(path, png);
  console.log(`  ✓ ${e.name}.png (${png.length} bytes)`);
});

// Bosses
const bosses = [
  { name: 'boss_slime_bagel', color: '#2ecc71', features: 'slime' },
  { name: 'boss_mushroom_lord', color: '#8e44ad', features: 'mushroom' },
  { name: 'boss_bee_queen', color: '#f1c40f', features: 'bee_queen' },
  { name: 'boss_pharaoh', color: '#e67e22', features: 'pharaoh' },
  { name: 'boss_dragon', color: '#e74c3c', features: 'dragon' },
  { name: 'boss_ice_demon', color: '#2980b9', features: 'ice_demon' },
  { name: 'boss_storm_lord', color: '#8e44ad', features: 'storm_lord' },
  { name: 'boss_ghost_king', color: '#9b59b6', features: 'ghost_king' },
  { name: 'boss_secret', color: '#e74c3c', features: 'secret' },
];

bosses.forEach(b => {
  const png = generateBoss(b.name, b.color, b.features);
  const path = join(ASSETS_DIR, `${b.name}.png`);
  writeFileSync(path, png);
  console.log(`  ✓ ${b.name}.png (${png.length} bytes)`);
});

// Backgrounds - one per region
const backgrounds = [
  { name: 'bg_meadows', skyTop: '#87ceeb', skyBottom: '#bae6fd', ground: '#4a7c59', features: 'trees' },
  { name: 'bg_forest', skyTop: '#2c3e50', skyBottom: '#1a3c34', ground: '#2d4a3e', features: 'mushrooms' },
  { name: 'bg_honey_cliffs', skyTop: '#f39c12', skyBottom: '#f7dc6f', ground: '#8b7d3c', features: 'crystals' },
  { name: 'bg_desert', skyTop: '#edc9af', skyBottom: '#d4a574', ground: '#c4a35a', features: 'pyramids' },
  { name: 'bg_volcano', skyTop: '#4a0e17', skyBottom: '#8b1a1a', ground: '#3d2b1f', features: 'lava' },
  { name: 'bg_ice', skyTop: '#1b2a47', skyBottom: '#3b5998', ground: '#a8c8e8', features: 'ice' },
  { name: 'bg_storm', skyTop: '#1a102f', skyBottom: '#2d1f4e', ground: '#2a1f3d', features: 'lightning' },
  { name: 'bg_ghost', skyTop: '#0a0a1a', skyBottom: '#1a1030', ground: '#1e1530', features: 'ghosts' },
];

backgrounds.forEach(bg => {
  const png = generateBackground(bg.name, bg.skyTop, bg.skyBottom, bg.ground, bg.features);
  const path = join(ASSETS_DIR, `${bg.name}.png`);
  writeFileSync(path, png);
  console.log(`  ✓ ${bg.name}.png (${png.length} bytes)`);
});

console.log(`\nDone! Generated ${heroes.length + enemies.length + bosses.length + backgrounds.length} assets.`);

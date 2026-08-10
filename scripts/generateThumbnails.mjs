#!/usr/bin/env node
/**
 * Builds small preview versions of the region backgrounds.
 *
 * The full-size artwork is several thousand pixels wide and 14–17 MB per file,
 * which is wasteful for the ~200 px region cards on the campaign map. This
 * script decodes each background, box-filters it down and re-encodes it.
 *
 * Pure Node — PNG decoding/encoding is done here with zlib and a CRC table,
 * matching the dependency-free rule of the rest of the toolchain.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { inflateSync, deflateSync } from 'node:zlib';

const root = resolve(import.meta.dirname, '..');
const assetsDir = resolve(root, 'public', 'assets');

const THUMB_WIDTH = 560;
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const SOURCES = [
  'bg_meadows', 'bg_forest', 'bg_honey_cliffs', 'bg_desert',
  'bg_volcano', 'bg_ice', 'bg_storm', 'bg_ghost',
];

// ── CRC32 ──
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c >>> 0;
}
function crc32(buffer) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buffer.length; i++) crc = crcTable[(crc ^ buffer[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

/** Reads IHDR plus the concatenated IDAT payload. */
function readChunks(data) {
  if (!data.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error('not a PNG');
  const header = {
    width: data.readUInt32BE(16),
    height: data.readUInt32BE(20),
    bitDepth: data[24],
    colorType: data[25],
    interlace: data[28],
  };
  const idat = [];
  let offset = 8;
  while (offset < data.length) {
    const length = data.readUInt32BE(offset);
    const type = data.toString('ascii', offset + 4, offset + 8);
    if (type === 'IDAT') idat.push(data.subarray(offset + 8, offset + 8 + length));
    offset += 12 + length;
    if (type === 'IEND') break;
  }
  return { header, idat: Buffer.concat(idat) };
}

const paeth = (a, b, c) => {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
};

/** Reverses the per-scanline PNG filters, returning raw samples. */
function unfilter(raw, width, height, channels) {
  const stride = width * channels;
  const out = Buffer.allocUnsafe(stride * height);
  let pos = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[pos++];
    const line = raw.subarray(pos, pos + stride);
    pos += stride;
    const rowStart = y * stride;
    const prevStart = rowStart - stride;
    for (let x = 0; x < stride; x++) {
      const value = line[x];
      const left = x >= channels ? out[rowStart + x - channels] : 0;
      const up = y > 0 ? out[prevStart + x] : 0;
      const upLeft = y > 0 && x >= channels ? out[prevStart + x - channels] : 0;
      let restored;
      switch (filter) {
        case 0: restored = value; break;
        case 1: restored = value + left; break;
        case 2: restored = value + up; break;
        case 3: restored = value + ((left + up) >> 1); break;
        case 4: restored = value + paeth(left, up, upLeft); break;
        default: throw new Error(`unsupported filter ${filter} on row ${y}`);
      }
      out[rowStart + x] = restored & 0xFF;
    }
  }
  return out;
}

/** Box-filter downscale — averages every source pixel that maps to a target pixel. */
function downscale(pixels, srcW, srcH, channels, dstW, dstH) {
  const out = Buffer.allocUnsafe(dstW * dstH * 3);
  const xRatio = srcW / dstW;
  const yRatio = srcH / dstH;

  for (let y = 0; y < dstH; y++) {
    const y0 = Math.floor(y * yRatio);
    const y1 = Math.min(srcH, Math.max(y0 + 1, Math.floor((y + 1) * yRatio)));
    for (let x = 0; x < dstW; x++) {
      const x0 = Math.floor(x * xRatio);
      const x1 = Math.min(srcW, Math.max(x0 + 1, Math.floor((x + 1) * xRatio)));
      let r = 0, g = 0, b = 0, samples = 0;
      for (let sy = y0; sy < y1; sy++) {
        let index = (sy * srcW + x0) * channels;
        for (let sx = x0; sx < x1; sx++) {
          r += pixels[index];
          g += pixels[index + 1];
          b += pixels[index + 2];
          index += channels;
          samples++;
        }
      }
      const target = (y * dstW + x) * 3;
      out[target] = Math.round(r / samples);
      out[target + 1] = Math.round(g / samples);
      out[target + 2] = Math.round(b / samples);
    }
  }
  return out;
}

/** Encodes RGB samples as a truecolour PNG. */
function encodePng(width, height, rgb) {
  const stride = width * 3;
  const raw = Buffer.allocUnsafe((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgb.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const chunk = (type, payload) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(payload.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), payload]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([length, body, crc]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // colour type: truecolour
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  return Buffer.concat([
    PNG_SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

let totalBefore = 0;
let totalAfter = 0;
const failures = [];

for (const name of SOURCES) {
  const sourcePath = resolve(assetsDir, `${name}.png`);
  if (!existsSync(sourcePath)) {
    failures.push(`${name}.png не знайдено`);
    continue;
  }
  try {
    const data = readFileSync(sourcePath);
    const { header, idat } = readChunks(data);
    if (header.bitDepth !== 8 || header.interlace !== 0 || (header.colorType !== 2 && header.colorType !== 6)) {
      failures.push(`${name}.png: непідтримуваний формат (depth=${header.bitDepth}, colorType=${header.colorType}, interlace=${header.interlace})`);
      continue;
    }

    const channels = header.colorType === 6 ? 4 : 3;
    const raw = inflateSync(idat);
    const pixels = unfilter(raw, header.width, header.height, channels);

    const dstW = Math.min(THUMB_WIDTH, header.width);
    const dstH = Math.max(1, Math.round(dstW * header.height / header.width));
    const scaled = downscale(pixels, header.width, header.height, channels, dstW, dstH);
    const png = encodePng(dstW, dstH, scaled);

    writeFileSync(resolve(assetsDir, `${name}_thumb.png`), png);
    totalBefore += data.length;
    totalAfter += png.length;
    console.log(`  ✓ ${name}_thumb.png  ${dstW}×${dstH}  ${(data.length / 1048576).toFixed(1)}MB → ${(png.length / 1024).toFixed(0)}KB`);
  } catch (error) {
    failures.push(`${name}.png: ${error.message}`);
  }
}

if (failures.length) {
  console.error(`\nThumbnail generation failed: ${failures.length} problem(s)`);
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}

console.log(`\n✓ ${SOURCES.length} мініатюр створено: ${(totalBefore / 1048576).toFixed(0)}MB → ${(totalAfter / 1024).toFixed(0)}KB`);

#!/usr/bin/env node
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { ASSET_MANIFEST } from '../src/assets/assetManager.js';

const root = resolve(import.meta.dirname, '..');
const errors = [];
const seenPaths = new Set();

function inspectPng(filePath) {
  const data = readFileSync(filePath);
  const pngSignature = Buffer.from([137,80,78,71,13,10,26,10]);
  if (data.length < 24 || !data.subarray(0, 8).equals(pngSignature)) {
    return { valid: false, reason: 'файл не має сигнатури PNG' };
  }
  const width = data.readUInt32BE(16);
  const height = data.readUInt32BE(20);
  if (width < 16 || height < 16) return { valid: false, reason: `занадто малий розмір ${width}×${height}` };
  if (!data.includes(Buffer.from('IEND'))) return { valid: false, reason: 'відсутній IEND chunk' };
  return { valid: true, width, height, bytes: data.length };
}

for (const [key, url] of Object.entries(ASSET_MANIFEST)) {
  const relative = url.replace(/^\.\//, '');
  const filePath = resolve(root, 'public', relative);
  if (seenPaths.has(filePath)) errors.push(`${key}: шлях дублюється у маніфесті (${relative})`);
  seenPaths.add(filePath);
  if (!existsSync(filePath)) {
    errors.push(`${key}: файл не існує (${relative})`);
    continue;
  }
  if (!statSync(filePath).isFile()) {
    errors.push(`${key}: шлях не є файлом (${relative})`);
    continue;
  }
  const result = inspectPng(filePath);
  if (!result.valid) errors.push(`${key}: ${result.reason} (${relative})`);
}

if (errors.length) {
  console.error(`\nAsset validation failed: ${errors.length} problem(s)`);
  for (const error of errors) console.error(`  ✗ ${error}`);
  process.exit(1);
}
console.log(`✓ Asset validation passed: ${Object.keys(ASSET_MANIFEST).length} PNG resources are present and decodable.`);

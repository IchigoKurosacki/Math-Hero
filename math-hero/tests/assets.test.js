import test from 'node:test';
import assert from 'node:assert/strict';
import { stat, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { ASSET_MANIFEST } from '../src/assets/assetManager.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function flatten(value, prefix = '', output = []) {
  if (typeof value === 'string') output.push([prefix, value]);
  else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) flatten(child, prefix ? `${prefix}.${key}` : key, output);
  }
  return output;
}

test('every manifest image exists and is a real PNG', async () => {
  const entries = flatten(ASSET_MANIFEST);
  assert.ok(entries.length >= 50);
  const seen = new Set();
  for (const [key, url] of entries) {
    assert.ok(!seen.has(key), `duplicate manifest key ${key}`);
    seen.add(key);
    const filePath = path.join(root, 'public', url.replace(/^assets\//, 'assets/'));
    const info = await stat(filePath);
    assert.ok(info.size > 100, `${key} is suspiciously small`);
    const data = await readFile(filePath);
    assert.deepEqual([...data.subarray(0, 8)], [137,80,78,71,13,10,26,10], `${key} is not PNG`);
    assert.equal(data.subarray(-8, -4).toString('ascii'), 'IEND', `${key} has no IEND chunk`);
  }
});

#!/usr/bin/env node
import { readdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const targets = ['src', 'scripts', 'tests'];
const files = [];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = resolve(directory, entry.name);
    if (entry.isDirectory()) await walk(fullPath);
    else if (['.js', '.mjs'].includes(extname(entry.name))) files.push(fullPath);
  }
}

for (const target of targets) await walk(resolve(root, target));
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(`✓ Syntax validation passed: ${files.length} JavaScript files.`);

#!/usr/bin/env node
import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'dist');
const validation = spawnSync(process.execPath, [resolve(root, 'scripts/validateAssets.mjs')], { stdio: 'inherit' });
if (validation.status !== 0) process.exit(validation.status || 1);
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(resolve(root, 'index.html'), resolve(dist, 'index.html'));
await cp(resolve(root, 'src'), resolve(dist, 'src'), { recursive: true });
await cp(resolve(root, 'public/assets'), resolve(dist, 'assets'), { recursive: true });
await writeFile(resolve(dist, 'BUILD_INFO.json'), JSON.stringify({ builtAt: new Date().toISOString(), type: 'dependency-free-static-build' }, null, 2));
console.log(`✓ Production build created: ${dist}`);

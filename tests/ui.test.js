import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

test('game UI shell exposes the required HUD and overlay surfaces', async () => {
  const html = await readFile(resolve(root, 'index.html'), 'utf8');
  for (const id of ['gameCanvas', 'topBar', 'heroPortraitImg', 'levelBadge', 'xpFill', 'heartsContainer', 'regionTitle', 'coinsBadge', 'btnPause', 'mathCombatZone', 'modalContainer']) {
    assert.match(html, new RegExp(`id=["']${id}["']`), `missing #${id}`);
  }
});

test('fantasy interface themes all major game screens and ships UI artwork', async () => {
  const menus = await readFile(resolve(root, 'src/ui/menus.js'), 'utf8');
  const css = await readFile(resolve(root, 'src/style.css'), 'utf8');
  for (const cls of ['main-menu-screen', 'campaign-screen', 'stage-screen', 'pause-screen', 'victory-screen', 'settings-screen', 'wardrobe-screen']) {
    assert.ok(menus.includes(cls), `missing menu theme ${cls}`);
    assert.ok(css.includes(`.${cls}`), `missing CSS for ${cls}`);
  }
  for (const file of ['math-hero-logo.png', 'rune-pattern.png']) {
    const info = await stat(resolve(root, 'public/assets/ui', file));
    assert.ok(info.size > 1000, `${file} is unexpectedly small`);
  }
});

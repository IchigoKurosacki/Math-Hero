#!/usr/bin/env node
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { spawn } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const portArg = process.argv.find(arg => arg.startsWith('--port='));
const requestedPort = Number(portArg?.split('=')[1] || process.env.PORT || 4173);
const shouldOpen = process.argv.includes('--open');
const mime = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg',
};

const server = http.createServer(async (req, res) => {
  try {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const normalizedPath = urlPath === '/' ? '/index.html' : urlPath;
    const servingPublicAsset = normalizedPath.startsWith('/assets/');
    const baseDirectory = servingPublicAsset ? resolve(root, 'public') : root;
    let filePath = resolve(baseDirectory, `.${normalizedPath}`);
    if (!(filePath === baseDirectory || filePath.startsWith(baseDirectory + sep))) throw new Error('forbidden');
    const info = await stat(filePath);
    if (info.isDirectory()) filePath = resolve(filePath, 'index.html');
    const data = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': mime[extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
});

function openBrowser(url) {
  const command = process.platform === 'win32' ? 'cmd' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  try { spawn(command, args, { detached: true, stdio: 'ignore' }).unref(); } catch { /* URL remains printed */ }
}

function listen(port, remainingAttempts = 10) {
  const onError = error => {
    server.off('listening', onListening);
    if (error.code === 'EADDRINUSE' && remainingAttempts > 0 && !portArg) {
      console.warn(`Порт ${port} зайнятий, пробую ${port + 1}...`);
      setTimeout(() => listen(port + 1, remainingAttempts - 1), 50);
      return;
    }
    console.error(`[ПОМИЛКА] Не вдалося запустити сервер: ${error.message}`);
    process.exitCode = 1;
  };
  const onListening = () => {
    server.off('error', onError);
    const url = `http://127.0.0.1:${port}`;
    console.log(`Math Hero запущено: ${url}`);
    console.log('Для завершення натисніть Ctrl+C у цьому вікні.');
    if (shouldOpen) openBrowser(url);
  };
  server.once('error', onError);
  server.once('listening', onListening);
  server.listen(port, '127.0.0.1');
}

listen(requestedPort);

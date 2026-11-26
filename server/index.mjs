// Production server: serves the built app from ./dist and the JSON API.
import http from 'node:http';
import { createReadStream, promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { timingSafeEqual } from 'node:crypto';
import os from 'node:os';
import { createApi } from './api.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const BASIC_AUTH = process.env.BASIC_AUTH || ''; // optional "user:password"
const api = createApi({ dataDir: process.env.DATA_DIR || 'data' });

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

function authorized(req) {
  if (!BASIC_AUTH) return true;
  const header = req.headers.authorization || '';
  if (!header.startsWith('Basic ')) return false;
  const given = Buffer.from(Buffer.from(header.slice(6), 'base64').toString('utf8'));
  const expected = Buffer.from(BASIC_AUTH);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

async function serveStatic(req, res) {
  const { pathname } = new URL(req.url, 'http://localhost');
  let file = path.join(root, path.normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, ''));
  if (!file.startsWith(root)) file = path.join(root, 'index.html');
  let stat = await fs.stat(file).catch(() => null);
  if (!stat || stat.isDirectory()) {
    file = path.join(root, 'index.html'); // SPA fallback
    stat = await fs.stat(file).catch(() => null);
  }
  if (!stat) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('Build not found. Run `npm run build` first.');
  }
  const ext = path.extname(file);
  res.writeHead(200, {
    'Content-Type': TYPES[ext] || 'application/octet-stream',
    'Content-Length': stat.size,
    'Cache-Control': file.includes(`${path.sep}assets${path.sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache',
  });
  createReadStream(file).pipe(res);
}

http
  .createServer((req, res) => {
    if (!authorized(req)) {
      res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Joker Board"' });
      return res.end('Authentication required');
    }
    api(req, res, () => serveStatic(req, res));
  })
  .listen(PORT, HOST, () => {
    const lan = Object.values(os.networkInterfaces())
      .flat()
      .filter((a) => a && a.family === 'IPv4' && !a.internal)
      .map((a) => a.address);
    console.log('🃏 Joker Board is running:');
    console.log(`   Local:   http://localhost:${PORT}`);
    if (HOST === '0.0.0.0' || HOST === '::') {
      for (const ip of lan) console.log(`   Network: http://${ip}:${PORT}`);
    } else if (HOST !== 'localhost' && HOST !== '127.0.0.1') {
      console.log(`   Network: http://${HOST}:${PORT}`);
    }
  });

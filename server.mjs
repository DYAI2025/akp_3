import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)));
const port = Number.parseInt(process.env.PORT ?? '3000', 10);
const host = process.env.HOST ?? '0.0.0.0';

const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml; charset=utf-8'],
  ['.webp', 'image/webp'],
  ['.ico', 'image/x-icon']
]);

function send(res, statusCode, body, headers = {}) {
  res.writeHead(statusCode, headers);
  res.end(body);
}

function safePath(pathname) {
  let decoded;

  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  const segments = decoded.split('/').filter(Boolean);

  if (segments.some((segment) => segment === '..' || segment.includes('\\'))) {
    return null;
  }

  const cleanPath = normalize(decoded);
  const relativePath = cleanPath === '/' ? 'index.html' : cleanPath.replace(/^\/+/, '');
  const allowed = relativePath === 'index.html' || relativePath.startsWith('assets/') || relativePath.startsWith('uploads/');

  if (!allowed) {
    return null;
  }

  const fullPath = join(root, relativePath);
  const rel = relative(root, fullPath);

  if (rel.startsWith('..') || rel === '') {
    return null;
  }

  return fullPath;
}

const server = createServer(async (req, res) => {
  if (!req.url || !req.method || !['GET', 'HEAD'].includes(req.method)) {
    send(res, 405, 'Method Not Allowed', { Allow: 'GET, HEAD' });
    return;
  }

  let url;

  try {
    url = new URL(req.url, 'http://localhost');
  } catch {
    send(res, 400, 'Bad Request', { 'Content-Type': 'text/plain; charset=utf-8' });
    return;
  }

  if (url.pathname === '/healthz') {
    send(res, 200, req.method === 'HEAD' ? '' : 'ok', {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store'
    });
    return;
  }

  const fullPath = safePath(url.pathname);
  if (!fullPath) {
    send(res, 400, 'Bad Request', { 'Content-Type': 'text/plain; charset=utf-8' });
    return;
  }

  try {
    const fileStat = await stat(fullPath);
    if (!fileStat.isFile()) throw new Error('Not a file');

    const headers = {
      'Content-Type': contentTypes.get(extname(fullPath).toLowerCase()) ?? 'application/octet-stream',
      'Content-Length': fileStat.size,
      'Cache-Control': fullPath.endsWith('index.html') ? 'no-cache' : 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff'
    };

    res.writeHead(200, headers);
    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    createReadStream(fullPath).pipe(res);
  } catch {
    send(res, 404, 'Not Found', { 'Content-Type': 'text/plain; charset=utf-8' });
  }
});

server.listen(port, host, () => {
  console.log(`AKP Architekten site listening on http://${host}:${port}`);
});

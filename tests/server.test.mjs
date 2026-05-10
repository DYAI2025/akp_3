import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

const port = 4173;
const server = spawn(process.execPath, ['server.mjs'], {
  env: { ...process.env, PORT: String(port), HOST: '127.0.0.1' },
  stdio: ['ignore', 'pipe', 'pipe']
});

let output = '';
server.stdout.on('data', (chunk) => { output += chunk; });
server.stderr.on('data', (chunk) => { output += chunk; });

async function waitForServer() {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/healthz`);
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error(`server did not start in time: ${output}`);
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

try {
  await waitForServer();

  await test('health check supports Railway readiness checks', async () => {
    const response = await fetch(`http://127.0.0.1:${port}/healthz`);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), 'ok');
    assert.equal(response.headers.get('cache-control'), 'no-store');
  });

  await test('root serves the frontend as no-cache HTML', async () => {
    const response = await fetch(`http://127.0.0.1:${port}/`);
    const body = await response.text();
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') ?? '', /text\/html/);
    assert.equal(response.headers.get('cache-control'), 'no-cache');
    assert.match(body, /AKP Architekten Kauschke \+ Partner/);
    assert.match(body, /id="kontakt"/);
  });

  await test('assets are served with immutable cache headers', async () => {
    const response = await fetch(`http://127.0.0.1:${port}/assets/hero-pestalozzi.jpg`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'image/jpeg');
    assert.equal(response.headers.get('cache-control'), 'public, max-age=31536000, immutable');
    assert.ok(Number(response.headers.get('content-length')) > 10_000);
  });

  await test('unknown paths and traversal attempts do not leak files', async () => {
    assert.notEqual((await fetch(`http://127.0.0.1:${port}/does-not-exist`)).status, 200);
    assert.notEqual((await fetch(`http://127.0.0.1:${port}/README.md`)).status, 200);
    assert.notEqual((await fetch(`http://127.0.0.1:${port}/%2e%2e/README.md`)).status, 200);
    assert.notEqual((await fetch(`http://127.0.0.1:${port}/%E0%A4%A`)).status, 200);
  });
} finally {
  server.kill('SIGTERM');
}

import { access, readFile, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { extname } from 'node:path';
import assert from 'node:assert/strict';

const html = await readFile('index.html', 'utf8');

async function test(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

await test('Railway entrypoints are present', async () => {
  const pkg = JSON.parse(await readFile('package.json', 'utf8'));
  assert.equal(pkg.scripts.start, 'node server.mjs');
  await access('server.mjs', constants.R_OK);
  assert.match(await readFile('server.mjs', 'utf8'), /process\.env\.PORT/);
  assert.match(await readFile('server.mjs', 'utf8'), /\/healthz/);
});

await test('document has production-ready metadata and landmarks', () => {
  assert.match(html, /^<!doctype html>/i);
  assert.match(html, /<html lang="de">/);
  assert.match(html, /<meta name="viewport" content="width=device-width,initial-scale=1" \/>/);
  assert.match(html, /<meta name="description" content="[^"]{80,}" \/>/);
  assert.match(html, /<main>/);
  assert.match(html, /<footer>/);
  assert.doesNotMatch(html, /TODO|Platzhalter/);
});

await test('all same-page navigation anchors resolve to existing ids', () => {
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]));
  const anchors = [...html.matchAll(/href="#([^"]+)"/g)].map((match) => match[1]);
  assert.ok(anchors.length >= 6, 'expected multiple same-page anchors');
  for (const anchor of anchors) {
    assert.ok(ids.has(anchor), `missing id for #${anchor}`);
  }
});

await test('local image assets referenced by the frontend exist', async () => {
  const sources = [...html.matchAll(/<img[^>]+src="([^"]+)"/g)].map((match) => match[1]);
  assert.ok(sources.length >= 5, 'expected project and hero images');
  for (const source of sources) {
    assert.equal(extname(source).toLowerCase(), '.jpg', `${source} should be a jpg asset`);
    const file = await stat(source);
    assert.ok(file.isFile(), `${source} should exist`);
    assert.ok(file.size > 10_000, `${source} should not be empty`);
  }
});

await test('contact form keeps critical browser validation and mailto fallback', () => {
  assert.match(html, /<form data-cta="anfrage">/);
  assert.match(html, /id="f-name" name="name" type="text" required/);
  assert.match(html, /id="f-mail" name="mail" type="email" required/);
  assert.match(html, /name="privacy" required/);
  assert.match(html, /form\.reportValidity\(\)/);
  assert.match(html, /mailto:info@architekten-kauschke\.de/);
});


await test('inline frontend script is syntactically valid', () => {
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
  assert.ok(scripts.length >= 1, 'expected an inline frontend script');
  for (const script of scripts) {
    new Function(script);
  }
});

await test('project filtering script updates accessibility state without layout gaps', () => {
  assert.match(html, /role="tablist"/);
  assert.match(html, /setAttribute\('role', 'tab'\)/);
  assert.match(html, /aria-selected/);
  assert.match(html, /card\.hidden = !show/);
});

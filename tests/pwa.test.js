'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const manifest = JSON.parse(read('manifest.json'));

// Files the service worker stores for offline use
const swAssets = [...read('sw.js').match(/const ASSETS = \[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
const assetFiles = swAssets.map((a) => (a === './' ? 'index.html' : a));

function pngSize(file) {
  const buf = fs.readFileSync(path.join(root, file));
  assert.equal(buf.toString('ascii', 1, 4), 'PNG', `${file} is not a PNG`);
  return `${buf.readUInt32BE(16)}x${buf.readUInt32BE(20)}`;
}

test('manifest has what browsers need to install the app', () => {
  for (const key of ['name', 'short_name', 'start_url', 'scope', 'display', 'background_color', 'theme_color']) {
    assert.ok(manifest[key], `missing ${key}`);
  }
  assert.equal(manifest.display, 'standalone');
  // Relative URLs keep it working both at the domain root and in a subfolder
  assert.equal(manifest.start_url, './');
  const sizes = (purpose) => manifest.icons.filter((i) => (i.purpose || 'any').split(' ').includes(purpose)).map((i) => i.sizes);
  assert.ok(sizes('any').includes('192x192'));
  assert.ok(sizes('any').includes('512x512'));
  assert.ok(sizes('maskable').length > 0);
});

test('icon files exist and match their declared size', () => {
  for (const icon of manifest.icons) assert.equal(pngSize(icon.src), icon.sizes, icon.src);
  assert.equal(pngSize('icons/apple-touch-icon.png'), '180x180');
});

test('everything the page loads is stored for offline use', () => {
  const html = read('index.html');
  const refs = [
    ...[...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]),
    ...[...html.matchAll(/<link[^>]+href="([^"]+)"/g)].map((m) => m[1]).filter((h) => !h.startsWith('data:')),
    ...manifest.icons.map((i) => i.src),
  ];
  assert.ok(refs.includes('sw.js') === false, 'sw.js is registered, not loaded');
  for (const ref of refs) assert.ok(swAssets.includes(ref), `${ref} is not in the service worker list`);
  assert.ok(swAssets.includes('./'));
});

test('every file in the service worker list exists', () => {
  for (const file of assetFiles) assert.ok(fs.existsSync(path.join(root, file)), file);
});

test('the Docker image contains every file the app needs offline', () => {
  const copies = [...read('Dockerfile').matchAll(/^COPY (.+) \/usr\/share\/nginx\/html\S*$/gm)].flatMap((m) => m[1].split(/\s+/));
  for (const file of [...assetFiles, 'sw.js']) {
    const copied = copies.some((c) => c === file || file.startsWith(`${c}/`));
    assert.ok(copied, `${file} is not copied in the Dockerfile`);
  }
});

test('the Docker build can version scripts and styles', () => {
  const sw = read('sw.js');
  assert.equal((sw.match(/const VERSION = 'dev';/g) || []).length, 1, 'version placeholder in sw.js');
  const html = read('index.html');
  const dockerfile = read('Dockerfile');
  for (const file of ['style.css', 'blend.js', 'thermo.js', 'app.js']) {
    const attr = file.endsWith('.css') ? 'href' : 'src';
    assert.equal(html.split(`${attr}="${file}"`).length - 1, 1, `index.html references ${attr}="${file}" once`);
    assert.ok(dockerfile.includes(file.replace('.', '\\.')), `${file} is versioned in the Dockerfile`);
  }
  assert.ok(dockerfile.includes('nginx.conf'), 'the nginx cache rules are copied');
});

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

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

test('the Docker build versions every script and stylesheet the page loads', () => {
  const sw = read('sw.js');
  assert.equal((sw.match(/const VERSION = 'dev';/g) || []).length, 1, 'version placeholder in sw.js');
  const html = read('index.html');
  const dockerfile = read('Dockerfile');
  const loaded = [
    ...[...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]),
    ...[...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)].map((m) => m[1]),
  ];
  // The sed in the Dockerfile must stamp exactly these files, each referenced once
  const stamped = dockerfile.match(/\(src\|href\)=\\"\(([^)]+)\)\\"/)[1].split('|').map((f) => f.replace(/\\\./g, '.'));
  assert.deepStrictEqual([...stamped].sort(), [...loaded].sort());
  for (const file of loaded) {
    const attr = file.endsWith('.css') ? 'href' : 'src';
    assert.equal(html.split(`${attr}="${file}"`).length - 1, 1, `index.html references ${attr}="${file}" once`);
  }
  // The build check counts matches (not lines) and expects one per file
  const count = dockerfile.match(/grep -o "\?v=\$v" index\.html \| wc -l\) -eq (\d+)/);
  assert.ok(count, 'the build counts the stamped URLs with grep -o');
  assert.equal(Number(count[1]), loaded.length);
  assert.match(dockerfile, /cat [^|]*icons\/\*[^|]*\| md5sum/, 'icons are part of the hash');
  // nginx marks only the stamped version as immutable
  assert.ok(dockerfile.includes('nginx.conf'), 'the nginx cache rules are copied');
  assert.ok(read('nginx.conf').includes('if ($arg_v = "__ASSET_VERSION__")'));
  assert.ok(dockerfile.includes('s#__ASSET_VERSION__#$v#'), 'the build stamps the version into nginx.conf');
});

test('Rocket Loader leaves the scripts alone (data-cfasync="false" before src)', () => {
  const tags = [...read('index.html').matchAll(/<script[^>]*>/g)].map((m) => m[0]);
  assert.ok(tags.length >= 3);
  for (const tag of tags) assert.match(tag, /^<script data-cfasync="false" src="[^"]+">$/, tag);
});

// ---------- Service worker in a sandbox with fake caches and network ----------

const ORIGIN = 'https://mix.test';
const response = (status, body) => ({ status, ok: status >= 200 && status < 300, body, clone() { return this; } });

function loadServiceWorker(version = 'dev') {
  const handlers = {};
  const stores = new Map();
  const installed = [];
  const keyOf = (req) => new URL(typeof req === 'string' ? req : req.url, `${ORIGIN}/`).href;
  const withoutSearch = (url) => url.split('?')[0];
  const open = async (name) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const store = stores.get(name);
    return {
      async addAll(requests) {
        for (const req of requests) {
          installed.push(req);
          store.set(keyOf(req), response(200, keyOf(req)));
        }
      },
      async put(req, res) { store.set(keyOf(req), res); },
      async match(req, opts = {}) {
        const key = keyOf(req);
        if (store.has(key)) return store.get(key);
        if (opts.ignoreSearch) for (const [k, v] of store) if (withoutSearch(k) === withoutSearch(key)) return v;
        return undefined;
      },
    };
  };
  const sandbox = {
    self: { location: { origin: ORIGIN }, addEventListener: (type, fn) => (handlers[type] = fn), skipWaiting: async () => {}, clients: { claim: async () => {} } },
    caches: { open, keys: async () => [...stores.keys()], delete: async (name) => stores.delete(name) },
    fetch: async () => { throw new TypeError('offline'); },
    setTimeout: (fn) => setTimeout(fn, 0), // the 3 s network timeout, without waiting
    URL,
    Request: class {
      constructor(url, init = {}) {
        this.url = new URL(url, `${ORIGIN}/`).href;
        this.cache = init.cache;
      }
    },
  };
  vm.runInNewContext(read('sw.js').replace("const VERSION = 'dev';", `const VERSION = '${version}';`), sandbox);
  return {
    sandbox,
    installed,
    cache: () => open(`nitrox-app-${version}`),
    async request(url, { mode = 'cors' } = {}) {
      const pending = [];
      let answer;
      handlers.fetch({
        request: { url: new URL(url, `${ORIGIN}/`).href, method: 'GET', mode },
        respondWith: (p) => (answer = p),
        waitUntil: (p) => pending.push(p),
      });
      const res = await answer;
      await Promise.all(pending);
      return res;
    },
    async activate() {
      let done;
      handlers.activate({ waitUntil: (p) => (done = p) });
      await done;
    },
    async install() {
      let done;
      handlers.install({ waitUntil: (p) => (done = p) });
      await done;
    },
  };
}

test('service worker: a server error falls back to the cached copy, other answers pass through', async () => {
  const sw = loadServiceWorker();
  await (await sw.cache()).put('./', response(200, 'cached page'));
  sw.sandbox.fetch = async () => response(521, 'origin down');
  assert.equal((await sw.request('./', { mode: 'navigate' })).body, 'cached page');
  // Nothing cached: the error is passed on
  assert.equal((await sw.request('manifest.json')).status, 521);
  // A 404 is a real answer and is not replaced by the app page
  sw.sandbox.fetch = async () => response(404, 'not found');
  assert.equal((await sw.request('foo/bar', { mode: 'navigate' })).status, 404);
});

test('service worker: versioned files come from the cache and never under another version', async () => {
  const sw = loadServiceWorker();
  const cache = await sw.cache();
  await cache.put('app.js?v=H1', response(200, 'app H1'));
  // The network would deliver the newer file for any ?v= (nginx ignores the value)
  let fetched = 0;
  sw.sandbox.fetch = async () => { fetched++; return response(200, 'app H2'); };
  assert.equal((await sw.request('app.js?v=H1')).body, 'app H1');
  assert.equal(fetched, 0);
  assert.equal((await cache.match('app.js?v=H1')).body, 'app H1');
  // A version that is not cached yet: offline the older one beats a page without
  // scripts, and nothing is stored under the new URL
  sw.sandbox.fetch = async () => { throw new TypeError('offline'); };
  assert.equal((await sw.request('app.js?v=H2')).body, 'app H1');
  assert.equal(await cache.match('app.js?v=H2'), undefined);
  // Nothing cached at all: the network error stays
  await assert.rejects(sw.request('blend.js?v=H2'));
  // Online it is fetched and stored under its own URL; H1 stays as it was
  sw.sandbox.fetch = async () => response(200, 'app H2');
  assert.equal((await sw.request('app.js?v=H2')).body, 'app H2');
  assert.equal((await cache.match('app.js?v=H2')).body, 'app H2');
  assert.equal((await cache.match('app.js?v=H1')).body, 'app H1');
});

test('service worker: a page address with ?v= is a navigation, not a versioned file', async () => {
  const sw = loadServiceWorker();
  await (await sw.cache()).put('./', response(200, 'cached page'));
  assert.equal((await sw.request('./?v=2', { mode: 'navigate' })).body, 'cached page');
});

test('service worker: a versioned build keeps the page that came with its files', async () => {
  // A newer page in the old cache would ask for scripts that cache does not have
  const sw = loadServiceWorker('H1');
  const cache = await sw.cache();
  await cache.put('./', response(200, 'page H1'));
  await cache.put('manifest.json', response(200, 'manifest old'));
  sw.sandbox.fetch = async (req) => response(200, req.url.endsWith('manifest.json') ? 'manifest new' : 'page H2');
  assert.equal((await sw.request('./', { mode: 'navigate' })).body, 'page H2');
  assert.equal((await cache.match('./')).body, 'page H1');
  // Other unversioned files are still refreshed
  await sw.request('manifest.json');
  assert.equal((await cache.match('manifest.json')).body, 'manifest new');
});

test('service worker: installing stores every file past the browser cache', async () => {
  const sw = loadServiceWorker('H1');
  await sw.install();
  assert.equal(sw.installed.length, swAssets.length);
  for (const req of sw.installed) assert.equal(req.cache, 'reload', req.url);
  assert.ok((await (await sw.cache()).match('app.js?v=H1')), 'versioned file stored under its version');
});

test('service worker: offline navigations get the cached page, good answers refresh it', async () => {
  const sw = loadServiceWorker();
  const cache = await sw.cache();
  await cache.put('./', response(200, 'old page'));
  // Offline, with a query string such as a shared link
  assert.equal((await sw.request('./?utm_source=x', { mode: 'navigate' })).body, 'old page');
  // Online: the new page is served and stored
  sw.sandbox.fetch = async () => response(200, 'new page');
  assert.equal((await sw.request('./', { mode: 'navigate' })).body, 'new page');
  assert.equal((await cache.match('./')).body, 'new page');
});

test('service worker: activating removes only its own older caches', async () => {
  const sw = loadServiceWorker();
  for (const name of ['nitrox-app-old', 'other-app-v3', 'nitrox-app-dev']) await sw.sandbox.caches.open(name);
  await sw.activate();
  assert.deepStrictEqual((await sw.sandbox.caches.keys()).sort(), ['nitrox-app-dev', 'other-app-v3']);
});

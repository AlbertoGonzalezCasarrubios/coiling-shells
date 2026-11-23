// Builds the user manual: screenshots of the app, then a PDF of the manual
// page (en.html) printed by headless Chrome.
//
//   npm run manual                      screenshots and PDF
//   npm run manual -- --pdf             PDF only, with the screenshots already taken
//   npm run manual -- --only=cover,...  retake only these screenshots, then the PDF
//
// The screenshots go to docs/manual/images/<lang>/ (not versioned: they are
// rebuilt from the app); the PDF to docs/manual/. Needs Chrome or Chromium
// (CHROME=/path/to/chrome) and Node.js ≥ 22, like the browser test. The fonts and
// the libraries the app loads come from the network.
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const HERE = fileURLToPath(new URL('.', import.meta.url));
// The manual is written in English; the app itself is also in Spanish
const LANGS = ['en'];
const PDF_ONLY = process.argv.includes('--pdf');
const CHROME = [
  process.env.CHROME,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
]
  .filter(Boolean)
  .find((p) => existsSync(p));
if (!CHROME) throw new Error('Chrome not found: set CHROME=/path/to/chrome');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.json': 'application/json',
};

function serve() {
  const server = createServer(async (req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
    try {
      const file = join(ROOT, path.endsWith('/') ? `${path}index.html` : path);
      const body = await readFile(file);
      res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

/** Minimal Chrome DevTools Protocol client. */
async function launch() {
  const profile = mkdtempSync(join(tmpdir(), 'manual-'));
  const port = 9800 + Math.floor(Math.random() * 100);
  const proc = spawn(
    CHROME,
    [
      '--headless=new',
      '--no-first-run',
      '--no-default-browser-check',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--hide-scrollbars',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profile}`,
      ...(process.env.CI ? ['--no-sandbox'] : []),
      'about:blank',
    ],
    { stdio: 'ignore' },
  );
  let page;
  for (let i = 0; i < 100 && !page; i++) {
    try {
      page = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page');
    } catch {
      /* not ready */
    }
    if (!page) await sleep(150);
  }
  if (!page) throw new Error('Chrome did not start');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r, j) => {
    ws.addEventListener('open', r);
    ws.addEventListener('error', j);
  });
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)(m);
      pending.delete(m.id);
    }
    if (m.method === 'Runtime.exceptionThrown') console.warn('page error:', m.params.exceptionDetails.exception?.description);
  });
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const i = ++id;
      const timer = setTimeout(() => reject(new Error(`${method}: no answer`)), 180_000);
      pending.set(i, (m) => {
        clearTimeout(timer);
        if (m.error) reject(new Error(`${method}: ${m.error.message}`));
        else resolve(m.result);
      });
      ws.send(JSON.stringify({ id: i, method, params }));
    });
  await send('Page.enable');
  await send('Runtime.enable');
  // The light theme, whatever the system uses: the manual is printed on white
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
  const close = () => {
    ws.close();
    proc.kill();
    setTimeout(() => rmSync(profile, { recursive: true, force: true }), 500);
  };
  return { send, close };
}

// ---------------------------------------------------------------------------
// Screenshots
// ---------------------------------------------------------------------------

// Run in the page before each shot: helpers to act on the interface
const HELPERS = String.raw`
window.__m = {
  $: (s) => document.querySelector(s),
  click: (s) => document.querySelector(s).click(),
  select: (s, v) => { const el = document.querySelector(s); el.value = v; el.dispatchEvent(new Event('change', { bubbles: true })); },
  idle: () => document.getElementById('patternStatus')?.hidden !== false,
  // Numbered markers over parts of the interface
  mark: (items) => {
    // where: right of the element, below it, above it, or at an offset from its corner
    for (const [sel, n, where, dx = 0, dy = 0] of items) {
      const r = document.querySelector(sel).getBoundingClientRect();
      const at = { right: [r.right + 18, r.top + r.height / 2], below: [r.left + r.width / 2, r.bottom + 20], above: [r.left + r.width / 2, r.top - 20], left: [r.left - 18, r.top + r.height / 2] }[where] ?? [r.left + dx, r.top + dy];
      const b = document.createElement('div');
      b.textContent = n;
      b.style.cssText = 'position:fixed;z-index:99999;width:30px;height:30px;border-radius:50%;background:#c2410c;color:#fff;font:600 16px Inter,sans-serif;display:grid;place-items:center;box-shadow:0 0 0 3px #fff,0 2px 6px rgba(0,0,0,.35)';
      b.style.left = at[0] - 15 + 'px';
      b.style.top = at[1] - 15 + 'px';
      document.body.append(b);
    }
  },
};
1`;

const NAUTILUS = 'W=3.2&D=0.02&T=0&S=0.85&N=4&h=1&v=0&m=solid';

/**
 * Each shot: the address to open (query and hash), what to do, and either the
 * whole window or the box of an element (clip). height sets the window height.
 */
const SHOTS = [
  { name: 'welcome', url: '?guide', keepWelcome: true },
  {
    name: 'overview',
    url: '',
    js: `__m.mark([['.brand-mark', 1, 'below'], ['#openWizard', 2, 'right'], ['#openChallenge', 3, 'right'], ['.tabs', 4, 'right'], ['#mode', 5, 'left'], ['#lookMenu', 6, 'below'], ['.views', 7, 'above'], ['#viewport', 8, null, 560, 330]])`,
  },
  {
    name: 'shape',
    url: '',
    height: 1500,
    js: `__m.select('#preset', 'turritella')`,
    clip: '#tab-shape > section:nth-of-type(2)',
  },
  {
    name: 'morphospace',
    url: '',
    height: 1500,
    js: `const d = __m.$('#morphoDrawer'); d.open = true; d.scrollIntoView()`,
    clip: '#morpho',
  },
  {
    name: 'canal',
    url: '#m=solid&pg=1&pp=nautilus',
    height: 1800,
    wait: 8000,
    js: `__m.select('#preset', 'fusinus'); const d = __m.$('#canalDrawer'); d.open = true; d.scrollIntoView()`,
  },
  {
    name: 'ornament',
    url: '#m=solid',
    js: `__m.click('[data-tab=ornament]'); __m.select('#ornPreset', 'astraea')`,
  },
  {
    name: 'mechanics',
    url: '#m=solid',
    height: 1700,
    js: `__m.click('[data-tab=ornament]'); __m.select('#ornPreset', 'turritella'); __m.click('[data-omode=advanced]'); const d = __m.$('#mechDrawer'); d.open = true; d.scrollIntoView()`,
    clip: ['#mech-params', '#mechApply'],
  },
  {
    name: 'pigment',
    url: '#m=solid&pg=1&pp=oliva',
    wait: 12000,
    js: `__m.click('[data-tab=pigment]')`,
  },
  {
    name: 'pigment-advanced',
    url: `#${NAUTILUS}&pg=1&pp=nautilus`,
    height: 2200,
    wait: 8000,
    js: `__m.click('[data-tab=pigment]'); __m.click('[data-pmode=advanced]'); __m.$('#tab-pigment .panel.adv-only').scrollIntoView()`,
    clip: '#tab-pigment .panel.adv-only',
  },
  {
    name: 'graphs',
    url: `#${NAUTILUS}&pg=1&pp=nautilus`,
    wait: 8000,
    js: `__m.click('[data-tab=pigment]'); __m.click('#ovMorphoToggle'); __m.click('#ovProfileToggle')`,
  },
  {
    name: 'views',
    url: `#${NAUTILUS}&pg=1&pp=nautilus`,
    wait: 8000,
    js: `__m.click('[data-view=apical]')`,
  },
  { name: 'equation', url: '', js: `__m.click('#toggleFormula')`, wait: 6000 },
  { name: 'appearance', url: '#m=both', js: `__m.$('#lookMenu').open = true`, clip: '#lookMenu .look-menu' },
  { name: 'wizard', url: '', js: `__m.click('#openWizard'); __m.click('#wzNext'); __m.click('#wzNext')`, wait: 9000 },
  { name: 'challenge', url: '', js: `__m.click('#openChallenge')`, wait: 7000 },
  { name: 'export', url: `#${NAUTILUS}&pg=1&pp=nautilus`, js: `__m.click('#openExport')`, wait: 9000 },
  { name: 'about', url: '', js: `__m.click('#openInfo')`, wait: 5000 },
  // Cover: a Turritella drawn with all its lines, light on black
  {
    name: 'cover',
    url: '#m=lines&lc=efe6d2&bg=000000',
    width: 1100,
    height: 1500,
    scale: 2,
    js: `__m.select('#preset', 'turritella'); const h = __m.$('#hideHidden'); h.checked = false; h.dispatchEvent(new Event('change')); __m.click('#hideInfo'); document.querySelectorAll('.chip').forEach((c) => (c.style.visibility = 'hidden'))`,
    clipRect: { x: 250, y: 280, width: 600, height: 940 },
    wait: 6000,
  },
];

async function shoot(cdp, base, lang, only) {
  const dir = join(HERE, 'images', lang);
  await mkdir(dir, { recursive: true });
  let n = 0;
  for (const shot of SHOTS) {
    if (only && !only.includes(shot.name)) continue;
    const height = shot.height ?? 900;
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: shot.width ?? 1440,
      height,
      deviceScaleFactor: shot.scale ?? 1.5,
      mobile: false,
    });
    // A new query each time, so the page reloads with the shell of its address
    const [query, hash = ''] = shot.url.split('#');
    const q = new URLSearchParams(query.replace(/^\?/, ''));
    q.set('shot', `${lang}-${++n}-${Date.now()}`);
    await cdp.send('Page.navigate', { url: `${base}/?${q.toString().replace(/=(&|$)/g, '$1')}${hash ? `#${hash}` : ''}` });
    await sleep(4500);
    await cdp.send('Runtime.evaluate', { expression: HELPERS });
    // The language is chosen with its button, and remembered by the page
    await cdp.send('Runtime.evaluate', { expression: `document.querySelector('.sidebar [data-lang=${lang}]').click(); 1` });
    if (!shot.keepWelcome)
      await cdp.send('Runtime.evaluate', {
        expression: "document.getElementById('welcome')?.open && document.getElementById('welcome').close(); 1",
      });
    else await cdp.send('Runtime.evaluate', { expression: `document.querySelector('#welcome [data-lang=${lang}]')?.click(); 1` });
    await sleep(300);
    if (shot.js) {
      const r = await cdp.send('Runtime.evaluate', { expression: `{ ${shot.js}; } 1` });
      if (r.exceptionDetails) throw new Error(`${shot.name}: ${r.exceptionDetails.exception?.description}`);
    }
    // Wait for the pattern (if any) and for the rendering to settle
    for (let i = 0; i < 120; i++) {
      const r = await cdp.send('Runtime.evaluate', { expression: '__m.idle()', returnByValue: true });
      if (r.result.value) break;
      await sleep(500);
    }
    await sleep(shot.wait ?? 5000);
    const params = { format: 'jpeg', quality: 88 };
    if (shot.clipRect) params.clip = { ...shot.clipRect, scale: 1 };
    if (shot.clip) {
      const r = await cdp.send('Runtime.evaluate', {
        // One element, or the box from the top of the first to the bottom of the second
        expression: `(() => { const [s1, s2 = s1] = ${JSON.stringify([shot.clip].flat())}; const a = document.querySelector(s1).getBoundingClientRect(), b = document.querySelector(s2).getBoundingClientRect(); return { x: Math.min(a.left, b.left) - 6, y: a.top - 6, width: Math.max(a.right, b.right) - Math.min(a.left, b.left) + 12, height: b.bottom - a.top + 12 }; })()`,
        returnByValue: true,
      });
      params.clip = { ...r.result.value, scale: 1 };
      params.captureBeyondViewport = true;
    }
    const { data } = await cdp.send('Page.captureScreenshot', params);
    await writeFile(join(dir, `${shot.name}.jpg`), Buffer.from(data, 'base64'));
    console.log(`${lang}/${shot.name}.jpg`);
  }
}

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------

const FILES = { en: 'coiling-shells-manual.pdf' };

async function print(cdp, base, lang) {
  if (!existsSync(join(HERE, `${lang}.html`))) return;
  await cdp.send('Emulation.clearDeviceMetricsOverride');
  await cdp.send('Page.navigate', { url: `${base}/docs/manual/${lang}.html` });
  await sleep(3000);
  await cdp.send('Runtime.evaluate', { expression: 'document.fonts.ready.then(() => 1)', awaitPromise: true });
  // Margins and page numbers come from manual.css (@page), so the cover has none
  const { data } = await cdp.send('Page.printToPDF', { printBackground: true, preferCSSPageSize: true });
  await writeFile(join(HERE, FILES[lang]), Buffer.from(data, 'base64'));
  console.log(FILES[lang]);
}

const server = await serve();
const base = `http://127.0.0.1:${server.address().port}`;
const cdp = await launch();
try {
  const only = process.argv
    .find((a) => a.startsWith('--only='))
    ?.slice(7)
    .split(',');
  for (const lang of LANGS) {
    if (!PDF_ONLY) await shoot(cdp, base, lang, only);
    await print(cdp, base, lang);
  }
} finally {
  cdp.close();
  server.close();
}

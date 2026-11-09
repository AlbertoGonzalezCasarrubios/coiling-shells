// End-to-end test of the interface in a real browser (headless Chrome).
//
// It serves the app, opens it, and walks through every part of the interface:
// guide, tabs, render modes, orientations, equations, the pattern following a
// dragged slider, appearance in the address, undo, the shell creator,
// the About pages and the exports (image, plate, PDF, STL). It fails if the page
// throws any error or if an export does not produce a file.
//
// It needs Chrome or Chromium and Node.js with a global WebSocket (Node ≥ 22).
// Without them it is skipped, and SKIP_BROWSER=1 skips it on purpose (npm run
// test:fast). CHROME=/path/to/chrome chooses the browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CANDIDATES = [
  process.env.CHROME,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
].filter(Boolean);
const CHROME = CANDIDATES.find((p) => existsSync(p));
const skip = process.env.SKIP_BROWSER ? 'SKIP_BROWSER is set'
  : !CHROME ? 'Chrome not found' : typeof WebSocket === 'undefined' ? 'needs Node.js ≥ 22' : false;

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };

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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Minimal Chrome DevTools Protocol client. */
async function launch() {
  const profile = mkdtempSync(join(tmpdir(), 'shells-'));
  const port = 9300 + Math.floor(Math.random() * 500);
  const proc = spawn(CHROME, [
    '--headless=new', '--no-first-run', '--no-default-browser-check', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--window-size=1400,900',
    ...(process.env.CI ? ['--no-sandbox'] : []), 'about:blank',
  ], { stdio: 'ignore' });
  let page;
  for (let i = 0; i < 100 && !page; i++) {
    try {
      page = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page');
    } catch { /* not ready */ }
    if (!page) await sleep(150);
  }
  if (!page) throw new Error('Chrome did not start');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.addEventListener('open', r); ws.addEventListener('error', j); });
  let id = 0;
  const pending = new Map();
  const errors = [];
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map((a) => a.value ?? a.description).join(' '));
  });
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable');
  await send('Page.enable');
  // A page that stops answering (a crashed renderer) fails the test instead of hanging it
  const evaluate = async (expression, ms = 300_000) => {
    const r = await Promise.race([
      send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }),
      sleep(ms).then(() => { throw new Error(`the page did not answer within ${ms / 1000} s`); }),
    ]);
    if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description ?? 'evaluation failed');
    return r.result?.result?.value;
  };
  const close = async () => {
    ws.close();
    const exited = new Promise((r) => proc.once('exit', r));
    proc.kill();
    await Promise.race([exited, sleep(5000)]);
    if (proc.exitCode === null && proc.signalCode === null) proc.kill('SIGKILL');
    try { rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* temporary folder */ }
  };
  return { send, evaluate, errors, close };
}

// The tour runs inside the page. Downloads are captured instead of saved.
const TOUR = String.raw`(async () => {
  const $ = (id) => document.getElementById(id);
  const sl = (ms) => new Promise((r) => setTimeout(r, ms));
  // Waits until a condition holds (slow CI machines), at most ms
  const until = async (cond, ms = 20000) => { for (const t0 = Date.now(); !cond() && Date.now() - t0 < ms;) await sl(100); return cond(); };
  const files = [];
  URL.revokeObjectURL = () => {};
  const capture = function () { files.push({ name: this.download, href: this.href }); };
  HTMLAnchorElement.prototype.click = capture;
  const dispatch = HTMLAnchorElement.prototype.dispatchEvent;
  HTMLAnchorElement.prototype.dispatchEvent = function (e) { if (this.download) { capture.call(this); return true; } return dispatch.call(this, e); };
  const log = {};
  log.guideOpen = $('welcome').open;
  $('welcomeStart').click();
  for (const t of ['ornament', 'pigment', 'shape']) { $('tabbtn-' + t).click(); await sl(300); }
  $('ornPreset').value = 'spinyAmmonite'; $('ornPreset').dispatchEvent(new Event('change')); await sl(1200);
  log.ornHash = /sn=12/.test(location.hash);
  for (const m of ['lines', 'both', 'solid']) { document.querySelector('#mode [data-mode=' + m + ']').click(); await sl(300); }
  for (const o of ['vertical', 'free', 'horizontal']) { document.querySelector('[data-orient=' + o + ']').click(); await sl(300); }
  document.querySelector('[data-view=apical]').click(); await sl(800);
  $('toggleFormula').click(); await sl(2500); $('toggleFormula').click();
  $('tabbtn-pigment').click(); document.querySelectorAll('#patternGallery button')[1].click(); await sl(3000);
  log.patternOn = /pg=1/.test(location.hash);
  // Dragging a pattern slider: the pattern follows it before the drag ends
  // (each result hides the "computing" note, even if the next one shows it again at once)
  let shown = 0;
  const seen = new MutationObserver((rs) => { shown += rs.filter((r) => r.oldValue === null).length; });
  seen.observe($('patternStatus'), { attributes: true, attributeFilter: ['hidden'], attributeOldValue: true });
  const drag = $('p-pnoise');
  for (let i = 0; i < 400 && shown < 3; i++) {
    drag.value = (0.5 * (i % 30)) / 30;
    drag.dispatchEvent(new Event('input'));
    await sl(50);
  }
  log.liveUpdates = shown;
  seen.disconnect();
  await until(() => $('patternStatus').hidden);
  // The pattern button saves in the chosen format, shared with the export window
  $('savePatternFormat').value = 'tiff'; $('savePatternFormat').dispatchEvent(new Event('change'));
  log.formatShared = $('exPatternFormat').value === 'tiff';
  $('savePattern').click();
  log.patternTiff = await until(() => files.some((f) => /^meinhardt_.*\.tif$/.test(f.name)));
  // An appearance is part of the address and the last step of the history
  const bg0 = $('bgColor').value;
  document.querySelector('[data-palette=dark]').click();
  log.lookHash = await until(() => /bg=111821/.test(location.hash));
  await sl(600); $('undo').click();
  log.lookUndone = await until(() => $('bgColor').value === bg0);
  // Then undo goes back through the slider drag to the plain shell
  for (let i = 0; i < 3 && !/pg=0/.test(location.hash); i++) { await sl(600); $('undo').click(); await until(() => !$('patternStatus').hidden || /pg=0/.test(location.hash), 1500); }
  log.undone = await until(() => /pg=0/.test(location.hash), 3000);
  $('openWizard').click(); await sl(500);
  for (let i = 0; i < 4; i++) { $('wzNext').click(); await sl(400); }
  $('wzNext').click(); await sl(300);
  log.wizardClosed = !$('wizard').open && !!document.querySelector('#viewport canvas');
  $('tabbtn-shape').click(); $('raupTheory').click(); await sl(800);
  log.raupTheory = !!document.querySelector('dialog[open] .info-tabs [data-page=raup][aria-selected=true]');
  document.querySelectorAll('dialog[open]').forEach((d) => d.close());
  $('openInfo').click();
  for (const p of ['raup', 'meinhardt', 'ornament', 'controls', 'app']) { document.querySelector('.info-tabs [data-page=' + p + ']').click(); await sl(1200); }
  log.mathErrors = document.querySelectorAll('[data-mjx-error]').length;
  document.querySelector('#info .icon-btn, #closeInfo')?.click();
  $('infoDialog')?.close?.();
  document.querySelectorAll('dialog[open]').forEach((d) => d.close());
  $('openExport').click(); await sl(1200);
  // Spines (the spiny ammonite) printed very small: the warning appears
  await until(() => $('exDims').textContent !== '');
  log.spineOk = $('exSpineWarn').hidden;
  $('exSize').value = 20; $('exSize').dispatchEvent(new Event('input'));
  log.spineWarn = await until(() => !$('exSpineWarn').hidden);
  $('exSize').value = 80; $('exSize').dispatchEvent(new Event('input'));
  await until(() => $('exSpineWarn').hidden);
  $('exFormat').value = 'jpg'; $('exPng').click(); await sl(3000);
  $('exPlateFormat').value = 'tiff'; $('exPlate').click(); await sl(5000);
  $('exStl').click(); await sl(4000);
  $('exEq').checked = false; $('exPdf').click(); await sl(12000);
  log.files = [];
  for (const f of files) {
    const b = await (await fetch(f.href)).blob();
    log.files.push(f.name.split('.').pop() + ':' + b.size);
  }
  document.querySelector('.lang [data-lang=es]').click(); await sl(300);
  log.lang = document.documentElement.lang;
  return log;
})()`;

test('the whole interface works in a real browser', { skip, timeout: 400_000 }, async () => {
  const server = await serve();
  const { port } = server.address();
  const b = await launch();
  let progress = '';
  try {
    await b.send('Page.navigate', { url: `http://127.0.0.1:${port}/?guide` });
    await sleep(5000);
    const log = await b.evaluate(TOUR);
    progress = JSON.stringify(log);
    assert.equal(log.guideOpen, true, 'the guide opens');
    assert.equal(log.ornHash, true, 'an ornament preset reaches the URL');
    assert.equal(log.patternOn, true, 'a pattern can be applied');
    assert.ok(log.liveUpdates >= 2, `the pattern follows a dragged slider (${log.liveUpdates} updates)`);
    assert.equal(log.formatShared, true, 'the pattern format is shared with the export window');
    assert.equal(log.patternTiff, true, 'the pattern button saves a TIFF');
    assert.equal(log.lookHash, true, 'the colours reach the address');
    assert.equal(log.lookUndone, true, 'undo restores the previous colours');
    assert.equal(log.undone, true, 'undo removes it again');
    assert.equal(log.spineOk, true, 'no spine warning at 80 mm');
    assert.equal(log.spineWarn, true, 'spine warning at 20 mm');
    assert.equal(log.wizardClosed, true, 'the shell creator gives the canvas back');
    assert.equal(log.raupTheory, true, 'the Theory link of the shape tab opens Raup\'s page');
    assert.equal(log.mathErrors, 0, 'every About page typesets');
    const kinds = log.files.map((f) => f.split(':')[0]);
    for (const k of ['jpg', 'tif', 'stl', 'pdf']) assert.ok(kinds.includes(k), `export ${k} (${log.files})`);
    for (const f of log.files) assert.ok(+f.split(':')[1] > 1000, `non-empty file ${f}`);
    assert.equal(log.lang, 'es');
    assert.deepEqual(b.errors, [], 'no errors in the page');
  } catch (err) {
    // On GitHub Actions the reason shows as an annotation of the run, without opening the log
    if (process.env.CI) console.log(`::error title=Browser test::${String(err.message).replace(/\n/g, ' ')} | log ${progress} | page errors ${JSON.stringify(b.errors)}`);
    throw err;
  } finally {
    await b.close();
    server.closeAllConnections();
    server.close();
  }
});

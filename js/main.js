import * as THREE from 'three';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { buildShell } from './model/raup.js';
import { $, f, fixSeamNormals } from './ui/util.js';
import {
  LANG_KEY, QUALITY, SHAPE_KEYS, SHELL_SIZE, WELCOME_KEY, fromHash, hasHashShape, pickShape, setHashHooks, state, storage, writeHash,
} from './ui/state.js';
import {
  viewport, setViewport, PALETTES, axis, axisMat, camera, controls, gizmo, gizmoAxes, ground, inner, lineMat, lines, occluder, renderer, scene, setPaletteInputs, shellGroup, solid,
} from './ui/scene.js';
import { initGuide, openWelcome, updateWelcomeText, welcomeDlg } from './ui/guide.js';
import {
  capturePointer, controlsByKey, createParam, markCustom, onShapeChange, setFill, initControls,
} from './ui/controls.js';
import {
  VIEWS, orientTween, setOrient, stepOrient, stepTween, tween, updateGround, initViews,
} from './ui/views.js';
import {
  PATTERN_CELLS, PATTERN_ROWS, PIG_SIMPLE, applyShellMaterial, buildGallery, computePattern, computeThumbs, drawProfile, drawProfileOn, drawSpacetime, ensureSurfaceMode, markPatternCustom, onGeometryForPattern, paintPattern, pattern, patternCanvas, patternHash, patternValues, pickPattern, pigControls, profileRow, schedulePattern, selectPattern, setPatternOn, setSecondLabel, stView, syncPatternControls, updateGalleryLabels, updatePatternMessage, initPigment,
} from './ui/pigment.js';
import {
  busy, chosenSize, defaultShellName, downloadImage, exportPDF, fileStem, openExport, renderViewImage, initExport,
} from './ui/export-dialog.js';
import {
  buildOrnPresetOptions, drawMech, onOrnamentChange, ornPresetKey, ornPresetSel, syncOrnamentControls, initOrnamentTab,
} from './ui/ornament-tab.js';
import { drawMorpho, drawMorphoOn, morphoOv, initMorphospace } from './ui/morphospace-chart.js';
import {
  formulaPanel, infoBody, infoDialog, openInfo, scheduleFormula, setFormulaOpen, setFormulaView, showInfoPage, initFormulas,
} from './ui/formulas.js';
import { noteChange, startUndo, undo, initUndo } from './ui/undo.js';
import { syncWizard, wizardDlg, initWizard } from './ui/wizard.js';
import { ornamentResolution } from './model/ornament.js';
import { PRESETS, DEFAULT_PRESET } from './model/presets.js';
import { setLang, getLang, t, tPreset, applyStatic } from './i18n/i18n.js';

// Language: English by default; the visitor's choice is remembered for later visits
setLang(storage.get(LANG_KEY) ?? 'en');

setHashHooks({ patternHash: (q) => patternHash(q), lookHash: (q) => lookHash(q), noteChange: () => noteChange() });

// ---------------------------------------------------------------------------
// Mesh construction
// ---------------------------------------------------------------------------

let lastBuild = null;
// The mesh is rebuilt on the next frame when something has changed
let dirty = true;
/** Asks for the mesh to be rebuilt on the next frame (for the modules of js/ui/). */
function markDirty() {
  dirty = true;
}

function rebuild() {
  const q = QUALITY[state.quality];
  // With a high W almost the whole shell lies in the last fraction of a whorl
  // (bivalves): θ is refined so the mesh and the growth lines are not sparse.
  const boost = Math.max(1, Math.log10(state.W));
  // Ornament needs about six segments across each rib, cord and spine, within a vertex budget
  const res = ornamentResolution(state);
  const segPhi = Math.min(256, Math.max(q.segPhi, res.phi));
  let segPerTurn = Math.max(Math.round(q.segPerTurn * boost), Math.round(res.perTurn * boost));
  segPerTurn = Math.min(segPerTurn, Math.max(q.segPerTurn, Math.floor(500000 / (segPhi * Math.max(state.turns, 0.25)))));
  const shell = buildShell({
    ...state,
    segPhi,
    segPerTurn,
    ringsPerTurn: Math.round(state.ringsPerTurn * boost),
    size: SHELL_SIZE,
  });
  lastBuild = shell;

  const position = new THREE.BufferAttribute(shell.positions, 3);
  const meshGeo = new THREE.BufferGeometry();
  meshGeo.setAttribute('position', position);
  meshGeo.setAttribute('color', new THREE.BufferAttribute(shell.colors, 3));
  meshGeo.setAttribute('uv', new THREE.BufferAttribute(shell.uvs, 2));
  meshGeo.setIndex(new THREE.BufferAttribute(shell.indices, 1));
  meshGeo.computeVertexNormals();
  fixSeamNormals(meshGeo.attributes.normal.array, shell.grid);
  meshGeo.computeBoundingSphere();

  // LineSegmentsGeometry needs explicit pairs of points
  const li = shell.lineIndices;
  const P = shell.positions;
  const segs = new Float32Array(li.length * 3);
  for (let k = 0; k < li.length; k++) {
    const s = li[k] * 3;
    segs[k * 3] = P[s];
    segs[k * 3 + 1] = P[s + 1];
    segs[k * 3 + 2] = P[s + 2];
  }
  const lineGeo = new LineSegmentsGeometry();
  if (segs.length) lineGeo.setPositions(segs);

  solid.geometry.dispose();
  lines.geometry.dispose();
  solid.geometry = meshGeo;
  occluder.geometry = meshGeo;
  inner.geometry = meshGeo;
  lines.geometry = lineGeo;

  const { x, z, yTop, yBottom } = shell.axis;
  axis.geometry.dispose();
  axis.geometry = new LineGeometry().setPositions([x, yBottom - 0.4, z, x, yTop + 0.4, z]);
  axis.computeLineDistances();

  updateGround();

  writeHash();
  scheduleFormula();
  drawMorpho();
  onGeometryForPattern();
  if (stView === 'shell') drawSpacetime(); // its proportions depend on the shape
}

function applyMode() {
  const m = state.mode;
  solid.visible = m !== 'lines';
  inner.visible = solid.visible;
  lines.visible = m !== 'solid' && lines.geometry.attributes.instanceStart !== undefined;
  occluder.visible = m === 'lines' && $('hideHidden').checked;
  ground.visible = m !== 'lines';
  document.querySelectorAll('#mode button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === m)));
}


// Sidebar controls (ui/controls.js)
initControls({
  markDirty
});

// Ornament tab (ui/ornament-tab.js)
initOrnamentTab({
  applyMode,
  applyShape,
  controlsByKey,
  createParam,
  markDirty
});

// Grouped presets
const presetSel = $('preset');
function buildPresetOptions() {
  const value = presetSel.value;
  presetSel.innerHTML = '';
  const groups = {};
  for (const [key, p] of Object.entries(PRESETS)) {
    if (!groups[p.group]) {
      groups[p.group] = document.createElement('optgroup');
      groups[p.group].label = tPreset(p.group);
      presetSel.append(groups[p.group]);
    }
    groups[p.group].append(new Option(tPreset(key), key));
  }
  presetSel.add(new Option(t('preset.custom'), 'custom'));
  if (value) presetSel.value = value;
}
buildPresetOptions();

const matchingPreset = Object.keys(PRESETS).find((k) =>
  Object.entries(pickShape(PRESETS[k])).every(([key, v]) =>
    typeof v === 'boolean' ? state[key] === v : Math.abs(state[key] - v) < 1e-6
  )
);
presetSel.value = matchingPreset || (hasHashShape ? 'custom' : DEFAULT_PRESET);

function setMirror(on) {
  state.mirror = on;
  $('mirror').setAttribute('aria-pressed', String(on));
}
setMirror(state.mirror);

/** Loads Raup's parameters of a shell (from a shape or an ornament preset). */
function applyShape(shape) {
  for (const k of ['W', 'D', 'T', 'S', 'turns']) controlsByKey[k].set(shape[k], { fitScale: true });
  state.hand = shape.hand;
  $('hand').value = String(shape.hand);
  setMirror(shape.mirror);
  // Planispiral shells are shown with the plane of coiling upright (unless rotating freely)
  if (state.orient !== 'free') setOrient(shape.T === 0 && !shape.mirror ? 'horizontal' : 'vertical');
  const match = Object.keys(PRESETS).find((k) => SHAPE_KEYS.every((key) => pickShape(PRESETS[k])[key] === shape[key]));
  presetSel.value = match ?? 'custom';
  dirty = true;
}

presetSel.addEventListener('change', () => {
  const p = PRESETS[presetSel.value];
  if (!p) return;
  applyShape(pickShape(p));
  ornPresetSel.value = ornPresetKey();
});

$('hand').value = String(state.hand);
$('hand').addEventListener('change', (e) => {
  state.hand = Number(e.target.value);
  markCustom();
  dirty = true;
});

$('mirror').addEventListener('click', () => {
  setMirror(!state.mirror);
  markCustom();
  dirty = true;
});

$('quality').addEventListener('change', (e) => {
  state.quality = e.target.value;
  dirty = true; // the rebuild rewrites the address
});

document.querySelectorAll('#mode button').forEach((btn) =>
  btn.addEventListener('click', () => {
    state.mode = btn.dataset.mode;
    applyMode();
    writeHash();
  })
);

// Appearance: colours, mesh resolution, growth bands and axis. It travels in the
// address and each change is a step of the undo history. The colours enter the
// address once they have been chosen (or came in a link); until then each
// visitor sees the palette of their own light or dark theme.
let lookChosen = ['lc', 'sc', 'bg'].some((k) => fromHash.has(k));
function readLook() {
  return {
    line: $('lineColor').value, shell: $('shellColor').value, bg: $('bgColor').value,
    quality: state.quality, bands: $('bands').checked, axis: $('showAxis').checked,
  };
}
function applyColours({ line, shell, bg }) {
  setPaletteInputs({ line, shell, bg });
  lineMat.color.set(line);
  applyShellMaterial();
  scene.background.set(bg);
}
function setAxisVisible(on) {
  $('showAxis').checked = on;
  axis.visible = on;
  $('axis-params').hidden = !on; // the width control only appears when the axis is visible
}
/** Restores an appearance (undo, links). */
function applyLook(l) {
  const now = readLook();
  if (l.line !== now.line || l.shell !== now.shell || l.bg !== now.bg) {
    lookChosen = true;
    applyColours(l);
  }
  if (l.bands !== now.bands) {
    $('bands').checked = l.bands;
    applyShellMaterial();
  }
  if (l.axis !== now.axis) setAxisVisible(l.axis);
  if (l.quality !== now.quality) {
    state.quality = l.quality;
    $('quality').value = l.quality;
    dirty = true;
  }
}
function lookHash(q) {
  if (lookChosen) for (const [k, id] of [['lc', 'lineColor'], ['sc', 'shellColor'], ['bg', 'bgColor']]) q.set(k, $(id).value.slice(1));
  if (state.quality !== 'medium') q.set('q', state.quality[0]);
  if (!$('bands').checked) q.set('bd', '0');
  if ($('showAxis').checked) q.set('ax', '1');
}
/** The appearance carried by a link, applied on load. */
function lookFromHash() {
  const l = readLook();
  const hex = (k) => (/^[0-9a-f]{6}$/i.test(fromHash.get(k) ?? '') ? `#${fromHash.get(k).toLowerCase()}` : null);
  l.line = hex('lc') ?? l.line;
  l.shell = hex('sc') ?? l.shell;
  l.bg = hex('bg') ?? l.bg;
  l.quality = { l: 'low', m: 'medium', h: 'high' }[fromHash.get('q')] ?? l.quality;
  if (fromHash.has('bd')) l.bands = fromHash.get('bd') !== '0';
  if (fromHash.has('ax')) l.axis = fromHash.get('ax') === '1';
  applyLook(l);
}
const colourChosen = () => {
  lookChosen = true;
  writeHash();
};
$('lineColor').addEventListener('input', (e) => {
  lineMat.color.set(e.target.value);
  colourChosen();
});
$('shellColor').addEventListener('input', () => {
  applyShellMaterial();
  colourChosen();
});
$('bgColor').addEventListener('input', (e) => {
  scene.background.set(e.target.value);
  colourChosen();
});
$('hideHidden').addEventListener('change', applyMode);
document.querySelectorAll('[data-palette]').forEach((b) =>
  b.addEventListener('click', () => {
    applyColours(PALETTES[b.dataset.palette]);
    colourChosen();
  })
);
$('bands').addEventListener('change', () => {
  applyShellMaterial();
  writeHash();
});
$('showAxis').addEventListener('change', (e) => {
  setAxisVisible(e.target.checked);
  writeHash();
});
createParam({ key: 'axisWidth', min: 0.5, max: 6, step: 0.5, digits: 1 }, $('axis-params'), {
  compact: true,
  onChange: () => (axisMat.linewidth = state.axisWidth),
});
$('autoRotate').addEventListener('change', (e) => (controls.autoRotate = e.target.checked));

$('toggleFormula').addEventListener('click', () => setFormulaOpen(formulaPanel.hidden));
document.querySelectorAll('#eqView [data-eq]').forEach((b) => b.addEventListener('click', () => setFormulaView(b.dataset.eq)));
$('closeFormula').addEventListener('click', () => setFormulaOpen(false));
$('openInfo').addEventListener('click', () => openInfo());
document.querySelectorAll('.info-tabs [data-page]').forEach((b) => b.addEventListener('click', () => showInfoPage(b.dataset.page)));
$('closeInfo').addEventListener('click', () => infoDialog.close());
infoDialog.addEventListener('click', (e) => {
  if (e.target === infoDialog) infoDialog.close(); // click on the backdrop
});

// ---------------------------------------------------------------------------
// Fullscreen and "shell only" mode
// ---------------------------------------------------------------------------

const fsSupported = !!(viewport.requestFullscreen || viewport.webkitRequestFullscreen);
const isFullscreen = () => !!(document.fullscreenElement || document.webkitFullscreenElement);

function toggleFullscreen() {
  if (isFullscreen()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  else (viewport.requestFullscreen || viewport.webkitRequestFullscreen).call(viewport);
}

function updateFullscreenButton() {
  const on = isFullscreen();
  $('toggleFullscreen').setAttribute('aria-pressed', String(on));
  $('fsLabel').textContent = t(on ? 'tb.exitFullscreen' : 'tb.fullscreen');
  $('fsIcon').setAttribute('d', on ? 'M7 3v4H3M13 3v4h4M17 13h-4v4M3 13h4v4' : 'M3 7V3h4M13 3h4v4M17 13v4h-4M7 17H3v-4');
}

const isClean = () => document.body.classList.contains('clean');
function setClean(on) {
  document.body.classList.toggle('clean', on);
  if (on) $('showInfo').focus({ preventScroll: true });
}

$('toggleFullscreen').hidden = !fsSupported; // e.g. Safari on iPhone
$('toggleFullscreen').addEventListener('click', toggleFullscreen);
document.addEventListener('fullscreenchange', updateFullscreenButton);
document.addEventListener('webkitfullscreenchange', updateFullscreenButton);
$('hideInfo').addEventListener('click', () => setClean(true));
$('showInfo').addEventListener('click', () => setClean(false));

window.addEventListener('keydown', (e) => {
  if (infoDialog.open || $('welcome').open || $('exportDlg').open) return;
  // Ctrl+Z / ⌘Z undoes the last step (outside text boxes, which have their own undo)
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'z'
      && !(e.target instanceof Element && e.target.closest('input[type=text], input[type=number], textarea'))) {
    e.preventDefault();
    undo();
    if ($('wizard').open) syncWizard();
    return;
  }
  if (e.ctrlKey || e.metaKey || e.altKey || $('wizard').open) return;
  if (e.target instanceof Element && e.target.closest('input, select, textarea')) return;
  const key = e.key.toLowerCase();
  if (key === 'f' && fsSupported) toggleFullscreen();
  else if (key === 'h') setClean(!isClean());
  else if (key === 'escape' && isClean() && !isFullscreen()) setClean(false);
  else return;
  e.preventDefault();
});

$('toggleAxes').addEventListener('click', (e) => {
  gizmo.visible = !gizmo.visible;
  e.currentTarget.setAttribute('aria-pressed', String(gizmo.visible));
});

// ---------------------------------------------------------------------------
// Growth animation: the aperture advances from the apex
// ---------------------------------------------------------------------------

let growAnim = null;

function updateGrowButton() {
  const on = !!growAnim;
  $('grow').setAttribute('aria-pressed', String(on));
  $('growLabel').textContent = t(on ? 'geo.stop' : 'geo.grow');
  $('growIcon').setAttribute('d', on ? 'M5 5h10v10H5z' : 'M6 4l10 6-10 6z');
}

function stopGrow() {
  growAnim = null;
  state.grow = 1;
  dirty = true;
  updateGrowButton();
}

$('grow').addEventListener('click', () => {
  if (growAnim) return stopGrow();
  growAnim = { t0: performance.now(), dur: Math.min(9000, 2500 + 600 * state.turns) };
  updateGrowButton();
});

function stepGrow(now) {
  const u = Math.min(1, (now - growAnim.t0) / growAnim.dur);
  // Blend of linear progress in θ and linear progress in size, so that both the
  // whorls near the apex and the last whorl (or a valve) are seen growing.
  const lnW = Math.log(Math.max(state.W, 1.0001));
  const s0 = Math.exp(-state.turns * lnW);
  const bySize = 1 + Math.log(s0 + (1 - s0) * u) / (state.turns * lnW);
  state.grow = Math.max(0.004, 0.5 * u + 0.5 * bySize);
  dirty = true;
  if (u >= 1) stopGrow();
}

// Views and orientation (ui/views.js)
initViews();

// Pigment tab (ui/pigment.js)
initPigment({
  applyMode,
  capturePointer,
  controlsByKey,
  createParam,
  setFill
});

// The theory of the shape tab: Raup's page of the About window
$('raupTheory').addEventListener('click', () => openInfo('raup'));

// Shape | Ornament | Pigment tabs. Entering Ornament or Pigment switches the shell
// to solid (relief and colour are read on the surface); the pattern is chosen in the gallery.
function showTab(name) {
  document.querySelectorAll('.tabs [data-tab]').forEach((b) => {
    const on = b.dataset.tab === name;
    b.setAttribute('aria-selected', String(on));
    b.tabIndex = on ? 0 : -1;
  });
  $('tab-shape').hidden = name !== 'shape';
  $('tab-pigment').hidden = name !== 'pigment';
  $('tab-ornament').hidden = name !== 'ornament';
  if (name === 'ornament' && state.mode === 'lines') {
    state.mode = 'solid';
    applyMode();
    writeHash();
  }
  if (name === 'pigment') {
    computeThumbs();
    ensureSurfaceMode();
    drawSpacetime();
  }
}
document.querySelectorAll('.tabs [data-tab]').forEach((b) => {
  b.addEventListener('click', () => showTab(b.dataset.tab));
  b.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const order = ['shape', 'ornament', 'pigment'];
    const i = order.indexOf(b.dataset.tab);
    const next = order[(i + (e.key === 'ArrowRight' ? 1 : order.length - 1)) % order.length];
    showTab(next);
    document.querySelector(`.tabs [data-tab="${next}"]`).focus();
  });
});

buildGallery();
syncPatternControls();
if (pattern.on) computePattern();

// ---------------------------------------------------------------------------
// Charts overlaid on the 3D view (off by default)
// ---------------------------------------------------------------------------

const graphsMenu = $('graphsMenu');
$('ovMorphoToggle').addEventListener('change', (e) => {
  $('ovMorpho').hidden = !e.target.checked;
  drawMorpho();
});
$('ovProfileToggle').addEventListener('change', (e) => {
  $('ovProfile').hidden = !e.target.checked;
  drawProfile();
});
// Toolbar menus (graphs, appearance): one open at a time, closed by a click outside or Escape
const toolbarMenus = [graphsMenu, $('lookMenu')];
document.addEventListener('pointerdown', (e) => {
  for (const m of toolbarMenus) if (m.open && !m.contains(e.target)) m.open = false;
});
for (const m of toolbarMenus) {
  m.addEventListener('toggle', () => {
    if (m.open) for (const o of toolbarMenus) if (o !== m) o.open = false;
  });
  m.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      m.open = false;
      m.querySelector('summary').focus();
    }
  });
}
new ResizeObserver(() => {
  if (!$('ovMorpho').hidden) drawMorphoOn(morphoOv);
  if (!$('ovProfile').hidden) drawProfile();
}).observe($('overlays'));

// Equations and About window (ui/formulas.js)
initFormulas({
  PATTERN_CELLS,
  pattern,
  live: { lastBuild: () => lastBuild },
});

// Morphospace chart (ui/morphospace-chart.js)
initMorphospace({
  capturePointer,
  controlsByKey,
  onShapeChange,
  presetSel
});

// Export (ui/export-dialog.js)
initExport({
  PATTERN_CELLS,
  PATTERN_ROWS,
  VIEWS,
  drawProfileOn,
  pattern,
  patternCanvas,
  presetSel,
  resize,
  live: { lastBuild: () => lastBuild, patternValues: () => patternValues, profileRow: () => profileRow },
});

// Welcome guide (js/ui/guide.js)
initGuide({ openInfo, markSeen: () => storage.set(WELCOME_KEY, '1') });

// ---------------------------------------------------------------------------
// Language
// ---------------------------------------------------------------------------

function applyLanguage(lang) {
  setLang(lang);
  applyStatic();
  Object.values(controlsByKey).forEach((c) => c.relabel());
  buildPresetOptions();
  buildOrnPresetOptions();
  updateGrowButton();
  updateFullscreenButton();
  drawMorpho();
  document.querySelectorAll('.lang button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === getLang())));
  // applyStatic replaces the HTML with untypeset TeX
  infoBody.querySelectorAll('.info-page').forEach((el) => delete el.dataset.typeset);
  if (infoDialog.open) openInfo();
  updateGalleryLabels();
  updatePatternMessage();
  setSecondLabel();
  Object.values(pigControls).forEach((c) => c.relabel());
  drawSpacetime();
  if (!formulaPanel.hidden) setFormulaOpen(true);
  updateWelcomeText();
  if ($('mechDrawer').open) drawMech();
}

document.querySelectorAll('.lang button').forEach((b) => b.addEventListener('click', () => {
  applyLanguage(b.dataset.lang);
  storage.set(LANG_KEY, b.dataset.lang);
}));

// Shell creator (ui/wizard.js)
initWizard({
  PIG_SIMPLE,
  applyMode,
  busy,
  chosenSize,
  computePattern,
  controlsByKey,
  createParam,
  defaultShellName,
  downloadImage,
  exportPDF,
  fileStem,
  markPatternCustom,
  onOrnamentChange,
  onShapeChange,
  openExport,
  ornPresetSel,
  paintPattern,
  pattern,
  pickPattern,
  pigControls,
  presetSel,
  renderViewImage,
  resize,
  schedulePattern,
  selectPattern,
  setPatternOn,
  syncPatternControls
});

// Undo (ui/undo.js)
initUndo({
  applyLook,
  applyMode,
  computePattern,
  controlsByKey,
  markDirty,
  pattern,
  presetSel,
  readLook,
  setMirror,
  setPatternOn,
  syncOrnamentControls,
  syncPatternControls
});

// Render loop
// ---------------------------------------------------------------------------

function resize() {
  const { clientWidth: w, clientHeight: h } = viewport;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // On portrait screens the horizontal framing is preserved
  const fov = THREE.MathUtils.degToRad(35);
  camera.fov = camera.aspect >= 1 ? 35 : THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(fov / 2) / camera.aspect));
  camera.updateProjectionMatrix();
  lineMat.resolution.set(w, h);
  axisMat.resolution.set(w, h);
}
new ResizeObserver(resize).observe(viewport);
new ResizeObserver(() => wizardDlg.open && resize()).observe($('wizView'));
resize();

function renderFrame() {
  const { clientWidth: w, clientHeight: h } = viewport;
  renderer.setScissorTest(false);
  renderer.setViewport(0, 0, w, h);
  renderer.clear();
  renderer.render(scene, camera);

  if (gizmo.visible && !isClean()) {
    const s = gizmo.size;
    const x = w - s - 8;
    const y = w < 760 ? 56 : 8; // above the views bar on narrow screens
    gizmo.camera.position.copy(camera.position).sub(controls.target).setLength(4);
    gizmo.camera.quaternion.copy(camera.quaternion);
    gizmoAxes.quaternion.copy(shellGroup.quaternion);
    renderer.setScissorTest(true);
    renderer.setScissor(x, y, s, s);
    renderer.setViewport(x, y, s, s);
    renderer.clearDepth();
    renderer.render(gizmo.scene, gizmo.camera);
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, w, h);
  }
}

applyLanguage(getLang());
lookFromHash();
applyMode();
setOrient(state.orient, { animate: false });
startUndo(); // undo history starts from the state the page opened with

renderer.setAnimationLoop((now) => {
  if (welcomeDlg.open) return; // the guide covers the viewer: no need to draw it
  if (growAnim) stepGrow(now);
  if (dirty) {
    dirty = false;
    rebuild();
    applyMode();
  }
  if (orientTween) stepOrient(now);
  if (tween) stepTween(now);
  else controls.update();
  renderFrame();
});

$('loading').hidden = true;

// First visit: open the guide, unless the page was opened from a shared link.
// Adding ?guide to the address always opens it (useful to show it to someone).
const forceGuide = new URLSearchParams(location.search).has('guide');
if (forceGuide || (!storage.get(WELCOME_KEY) && !hasHashShape && !fromHash.has('pg'))) openWelcome();

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { buildShell } from './model/raup.js';
import { $, formatW, f, sig, hexRgb, luminance, fixSeamNormals } from './ui/util.js';
import {
  GEO_PARAMS, HASH_KEYS, LANG_KEY, MODES, ORIENT_HASH, ORN_BOOLS, ORN_HASH, ORN_KEYS, ORN_PARAMS, QUALITY, RAUP_PARAMS, SHAPE_KEYS, SHELL_SIZE, VIS_PARAMS, WELCOME_KEY, fromHash, hasHashShape, pickOrnament, pickShape, setHashHooks, state, storage, writeHash, writeHashNow,
} from './ui/state.js';
import {
  viewport, setViewport, CAMERA_HOME, PALETTES, axis, axisMat, camera, controls, fill, gizmo, gizmoAxes, ground, inner, innerMat, lineMat, lines, makeLabel, occluder, occluderMat, renderer, scene, setPaletteInputs, shellGroup, solid, solidMat, sun,
} from './ui/scene.js';
import { initGuide, openWelcome, updateWelcomeText, welcomeDlg } from './ui/guide.js';
import { exportPDF as makePDF } from './ui/pdf.js';
import { drawMorpho, drawMorphoOn, morphoOv, initMorphospace } from './ui/morphospace-chart.js';
import { formulaPanel, formulaView, generalTeX, infoBody, infoDialog, liveTeX, openInfo, scheduleFormula, setFormulaOpen, setFormulaView, showInfoPage, initFormulas } from './ui/formulas.js';
import { noteChange, startUndo, undo, initUndo } from './ui/undo.js';
import { syncWizard, wizardDlg, initWizard } from './ui/wizard.js';
import { hasOrnament, ornamentResolution, ORNAMENT_DEFAULTS } from './model/ornament.js';
import { criticalWaves, lambdaForWaves, loadRatio, firstMode, unstableBand, mechanicalCords } from './model/mechanics.js';
import { buildPrintMesh, toSTL, to3MF } from './export/export3d.js';
import { MORPHO_REGIONS } from './model/morphospace.js';
import { encodeTIFF, fitFrame, slugify, plateLayout, FIXED_SIZES, MAX_SIDE } from './export/imagefile.js';
import { PRESETS, DEFAULT_PRESET, PATTERN_PRESETS, DEFAULT_PATTERN, MODEL_DEFAULTS, ORNAMENT_PRESETS } from './model/presets.js';
import { simulatePattern, PROFILE_WIDTH } from './model/meinhardt.js';
import {
  setLang, getLang, t, tParam, tPreset, tPattern, applyStatic,
  GENERAL_TEX, DEFS_TEX, MIRROR_TEX, AI_TEX, AS_TEX, GLOBAL_TEX,
} from './i18n/i18n.js';

// Language: English by default; the visitor's choice is remembered for later visits
setLang(storage.get(LANG_KEY) ?? 'en');

setHashHooks({ patternHash: (q) => patternHash(q), noteChange: () => noteChange() });

// ---------------------------------------------------------------------------
// Mesh construction
// ---------------------------------------------------------------------------

let lastBuild = null;

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


// Sidebar controls
// ---------------------------------------------------------------------------

const controlsByKey = {};
let dirty = true;
/** Asks for the mesh to be rebuilt on the next frame (for the modules of js/ui/). */
function markDirty() {
  dirty = true;
}

/** Captures the pointer if it is still active (a cancelled touch cannot be captured). */
function capturePointer(el, e) {
  try {
    el.setPointerCapture(e.pointerId);
  } catch {
    /* no capture: dragging still works while the pointer stays over the element */
  }
}

function setFill(range) {
  const pct = ((range.value - range.min) / (range.max - range.min)) * 100;
  range.style.setProperty('--pct', `${pct}%`);
}

function createParam(def, container, { compact = false, onChange, target = state }) {
  const el = document.createElement('div');
  el.className = 'param' + (compact ? ' compact' : '');
  const ctlId = def.id ?? def.key;
  const id = `p-${ctlId}`;
  const toggle = def.logToggle
    ? `<span class="scale-toggle" role="group">
         <button type="button" data-scale="lin">Lin</button><button type="button" data-scale="log">Log</button>
       </span>`
    : '';
  el.innerHTML = `
    <div class="param-head">
      ${def.sym ? '<span class="param-sym"></span>' : ''}
      <label class="param-name" for="${id}"><strong></strong><small></small></label>
      <input class="num" type="number" min="${def.min}" max="${def.max}" step="${def.logToggle ? 'any' : def.step}" />
    </div>
    <input id="${id}" type="range" />
    ${compact ? '' : `<div class="range-scale"><span class="scale-min"></span>${toggle}<span class="scale-max"></span></div>`}
  `;
  container.appendChild(el);

  const range = el.querySelector('input[type=range]');
  const num = el.querySelector('input[type=number]');
  const nameEl = el.querySelector('strong');
  const descEl = el.querySelector('small');
  const scaleGroup = el.querySelector('.scale-toggle');
  const symEl = el.querySelector('.param-sym');
  const format = def.format || ((v) => f(v, def.digits));
  let logScale = !!def.log;

  const applyScale = () => {
    const max = def.logToggle && !logScale ? def.linMax : def.max;
    range.min = logScale ? Math.log10(def.min) : def.min;
    range.max = logScale ? Math.log10(def.max) : max;
    range.step = logScale ? 0.001 : def.step;
    if (!compact) {
      el.querySelector('.scale-min').textContent = def.minLabel ?? def.min;
      el.querySelector('.scale-max').textContent = def.maxLabel ?? (logScale ? '10⁴' : max);
    }
    scaleGroup?.querySelectorAll('button').forEach((b) =>
      b.setAttribute('aria-pressed', String((b.dataset.scale === 'log') === logScale))
    );
  };

  const set = (v, { fromNum = false, fitScale = false } = {}) => {
    // def.zero: below the minimum the value is exactly 0 (e.g. no diffusion)
    const clamped = def.zero && v < def.min ? 0 : Math.min(def.max, Math.max(def.min, v));
    target[def.key] = clamped;
    // When a preset is loaded, go back to the linear scale if the value fits in it
    if (fitScale && def.logToggle && logScale && clamped <= def.linMax) {
      logScale = false;
      applyScale();
    }
    // A value outside the linear range (e.g. a bivalve) switches to the logarithmic scale
    if (def.logToggle && !logScale && clamped > def.linMax) {
      logScale = true;
      applyScale();
    }
    range.value = logScale ? Math.log10(Math.max(clamped, def.min)) : clamped;
    setFill(range);
    if (!fromNum) num.value = format(clamped);
  };

  scaleGroup?.querySelectorAll('button').forEach((b) =>
    b.addEventListener('click', () => {
      const wantLog = b.dataset.scale === 'log';
      if (wantLog === logScale) return;
      logScale = wantLog;
      applyScale();
      if (!logScale && target[def.key] > def.linMax) {
        set(def.linMax);
        onChange(def.key);
      } else {
        set(target[def.key]);
      }
    })
  );

  range.addEventListener('input', () => {
    const r = parseFloat(range.value);
    if (def.zero && r <= parseFloat(range.min) + 1e-9) set(0);
    else if (logScale) {
      // Rounded to what is displayed, so the visible value is the actual one
      const v = 10 ** r;
      set(def.digits !== undefined ? +v.toFixed(def.digits) : +v.toPrecision(2));
    } else set(r);
    onChange(def.key);
  });
  num.addEventListener('input', () => {
    const v = parseFloat(num.value);
    if (!Number.isFinite(v)) return;
    set(v, { fromNum: true });
    onChange(def.key);
  });
  num.addEventListener('change', () => set(target[def.key]));

  // The symbol and name may depend on the model (e.g. D_h or D_b)
  const relabel = () => {
    if (symEl) symEl.innerHTML = typeof def.sym === 'function' ? def.sym() : def.sym;
    const tr = tParam(typeof def.i18n === 'function' ? def.i18n() : def.i18n ?? def.key);
    nameEl.textContent = tr.name || def.key;
    descEl.textContent = tr.desc || '';
    descEl.hidden = !tr.desc;
    num.setAttribute('aria-label', tr.name || def.key);
    if (scaleGroup) {
      scaleGroup.title = t('scale.hint');
      scaleGroup.setAttribute('aria-label', scaleGroup.title);
    }
  };
  relabel();
  applyScale();

  controlsByKey[ctlId] = { set, relabel, el };
  set(target[def.key]);
}

function markCustom() {
  $('preset').value = 'custom';
}

function onShapeChange() {
  markCustom();
  ornPresetSel.value = ornPresetKey();
  dirty = true;
}

RAUP_PARAMS.forEach((d) => createParam(d, $('raup-params'), { onChange: onShapeChange }));
GEO_PARAMS.forEach((d) => createParam(d, $('geo-params'), { onChange: onShapeChange }));
VIS_PARAMS.forEach((d) =>
  createParam(d, $('vis-params'), {
    compact: true,
    onChange: (key) => {
      if (key === 'lineOpacity') lineMat.opacity = state.lineOpacity;
      else if (key === 'lineWidth') lineMat.linewidth = state.lineWidth;
      else dirty = true;
    },
  })
);

// Ornament tab
const ornPresetSel = $('ornPreset');
function buildOrnPresetOptions() {
  const v = ornPresetSel.value;
  ornPresetSel.innerHTML = '';
  for (const key of [...Object.keys(ORNAMENT_PRESETS), 'custom']) {
    const o = document.createElement('option');
    o.value = key;
    o.textContent = t(`orn.p.${key}`);
    // "No ornament" and "custom" are states, not examples to choose
    if (key === 'custom' || key === 'smooth') o.hidden = true;
    ornPresetSel.append(o);
  }
  ornPresetSel.value = v || ornPresetKey();
}

/** The ornament preset matching the current shape and relief, or "custom". */
function ornPresetKey() {
  const same = (a, b) => (typeof a === 'boolean' || typeof b === 'boolean' ? !!a === !!b : Math.abs(a - b) < 1e-9);
  return Object.keys(ORNAMENT_PRESETS).find((k) => {
    const p = ORNAMENT_PRESETS[k];
    const orn = { ...ORNAMENT_DEFAULTS, ...p.orn };
    if (!ORN_KEYS.every((key) => same(orn[key], state[key]))) return false;
    return !p.shape || SHAPE_KEYS.every((key) => same(p.shape[key], state[key]));
  }) ?? 'custom';
}

function syncOrnamentControls() {
  for (const d of ORN_PARAMS) controlsByKey[d.key].set(state[d.key]);
  for (const k of ORN_BOOLS) $(k).checked = !!state[k];
  ornPresetSel.value = ornPresetKey();
}

function onOrnamentChange() {
  ornPresetSel.value = ornPresetKey();
  if (state.mode === 'lines' && hasOrnament(state)) {
    state.mode = 'solid'; // relief is read on the surface
    applyMode();
  }
  dirty = true;
}
ORN_PARAMS.forEach((d) => createParam(d, $(`${d.box}-params`), { compact: true, onChange: onOrnamentChange }));
for (const k of ORN_BOOLS) {
  $(k).checked = !!state[k];
  $(k).addEventListener('change', (e) => {
    state[k] = e.target.checked;
    onOrnamentChange();
  });
}
ornPresetSel.addEventListener('change', () => {
  const p = ORNAMENT_PRESETS[ornPresetSel.value];
  if (!p) return;
  Object.assign(state, ORNAMENT_DEFAULTS, p.orn);
  if (p.shape) applyShape(p.shape);
  syncOrnamentControls();
  onOrnamentChange();
});
buildOrnPresetOptions();
$('ornTheory').addEventListener('click', () => openInfo('ornament'));
$('ornClear').addEventListener('click', () => {
  Object.assign(state, ORNAMENT_DEFAULTS);
  syncOrnamentControls();
  onOrnamentChange();
});
function setOrnMode(mode) {
  $('tab-ornament').dataset.omode = mode;
  document.querySelectorAll('#ornMode [data-omode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.omode === mode)));
}
document.querySelectorAll('#ornMode [data-omode]').forEach((b) => b.addEventListener('click', () => setOrnMode(b.dataset.omode)));

// Mechanical model of the cords: the mantle edge buckles on its elastic attachment
const mech = { lambda: lambdaForWaves(9), eta: 1.6 };
const MECH_PARAMS = [
  // The number box needs a plain number: scientific notation such as 2.4e+6
  { key: 'lambda', id: 'mechLambda', i18n: 'mechLambda', min: 1e3, max: 1e10, minLabel: '10³', maxLabel: '10¹⁰', step: 0.01, log: true, format: (v) => v.toExponential(1) },
  { key: 'eta', id: 'mechEta', i18n: 'mechEta', min: 0.5, max: 4, step: 0.05, digits: 2 },
];
MECH_PARAMS.forEach((d) => createParam(d, $('mech-params'), { target: mech, onChange: drawMech }));

function drawMech() {
  const canvas = $('mechCanvas');
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return;
  const dpr = Math.min(window.devicePixelRatio, 2);
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const css = getComputedStyle(document.documentElement);
  const col = (n) => css.getPropertyValue(n).trim();
  const text = col('--text'), muted = col('--muted'), accent = col('--accent');
  ctx.font = `11px ${col('--font') || 'sans-serif'}`;

  const { lambda, eta } = mech;
  const nStar = criticalWaves(lambda);
  const result = mechanicalCords(lambda, eta);
  const n1 = firstMode(lambda);

  // Left: load needed to buckle into n waves, relative to the critical load
  const gw = Math.round(w * 0.58), pad = { l: 30, r: 8, t: 10, b: 26 };
  const nMax = Math.max(8, Math.ceil(nStar * 2.6));
  const yMax = 4;
  const X = (n) => pad.l + (n / nMax) * (gw - pad.l - pad.r);
  const Y = (v) => pad.t + (1 - v / yMax) * (h - pad.t - pad.b);
  ctx.strokeStyle = muted;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.l, pad.t); ctx.lineTo(pad.l, h - pad.b); ctx.lineTo(gw - pad.r, h - pad.b);
  ctx.stroke();
  // Unstable band: modes whose load is below the applied one
  const band = unstableBand(lambda, eta);
  if (band) {
    ctx.fillStyle = `color-mix(in srgb, ${accent} 16%, transparent)`;
    ctx.fillRect(X(band.from), pad.t, X(Math.min(band.to, nMax)) - X(band.from), h - pad.t - pad.b);
  }
  ctx.strokeStyle = text;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (let k = 0; k <= 200; k++) {
    const n = 0.3 + (k / 200) * (nMax - 0.3);
    const v = Math.min(yMax, loadRatio(n, lambda));
    k ? ctx.lineTo(X(n), Y(v)) : ctx.moveTo(X(n), Y(v));
  }
  ctx.stroke();
  // Applied load
  ctx.strokeStyle = accent;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(pad.l, Y(Math.min(eta, yMax))); ctx.lineTo(gw - pad.r, Y(Math.min(eta, yMax)));
  ctx.stroke();
  ctx.setLineDash([]);
  // First mode
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(X(n1), Y(loadRatio(n1, lambda)), 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = muted;
  ctx.textAlign = 'center';
  ctx.fillText(t('mech.axis.n'), (pad.l + gw - pad.r) / 2, h - 6);
  for (const v of [0, Math.round(nMax / 2), nMax]) ctx.fillText(String(v), X(v), h - pad.b + 11);
  ctx.textAlign = 'right';
  ctx.fillText('P/Pc', pad.l - 4, pad.t + 8);
  ctx.fillText('1', pad.l - 4, Y(1) + 4);
  ctx.fillStyle = accent;
  ctx.textAlign = 'left';
  ctx.fillText('η', gw - pad.r - 8, Y(Math.min(eta, yMax)) - 4);

  // Right: the margin, smooth (dashed) and buckled into n waves (amplitude exaggerated ×3)
  const cx = gw + (w - gw) / 2, cy = h / 2 - 4, R = Math.min(w - gw, h) * 0.34;
  ctx.strokeStyle = muted;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = result.cordN ? accent : text;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  const A = result.cordN ? Math.min(0.3, 3 * result.cordH) : 0;
  for (let k = 0; k <= 360; k++) {
    const ph = (k / 360) * Math.PI * 2;
    const r = R * (1 + A * Math.cos(n1 * ph));
    k ? ctx.lineTo(cx + r * Math.cos(ph), cy + r * Math.sin(ph)) : ctx.moveTo(cx + r * Math.cos(ph), cy + r * Math.sin(ph));
  }
  ctx.stroke();
  ctx.fillStyle = muted;
  ctx.textAlign = 'center';
  ctx.fillText(t('mech.ring'), cx, h - 6);

  $('mechOut').textContent = result.cordN
    ? t('mech.out', f(nStar, 1), result.cordN, f(result.cordH, 2))
    : t('mech.out.none', f(nStar, 1));
}
$('mechDrawer').addEventListener('toggle', drawMech);
$('mechApply').addEventListener('click', () => {
  Object.assign(state, mechanicalCords(mech.lambda, mech.eta));
  syncOrnamentControls();
  onOrnamentChange();
});
$('mechTheory').addEventListener('click', () => {
  openInfo('ornament');
  requestAnimationFrame(() => document.getElementById('mech-theory')?.scrollIntoView({ block: 'start' }));
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
  dirty = true;
});

document.querySelectorAll('#mode button').forEach((btn) =>
  btn.addEventListener('click', () => {
    state.mode = btn.dataset.mode;
    applyMode();
    writeHash();
  })
);

$('lineColor').addEventListener('input', (e) => lineMat.color.set(e.target.value));
$('shellColor').addEventListener('input', applyShellMaterial);
$('bgColor').addEventListener('input', (e) => scene.background.set(e.target.value));
$('hideHidden').addEventListener('change', applyMode);
document.querySelectorAll('[data-palette]').forEach((b) =>
  b.addEventListener('click', () => {
    const p = PALETTES[b.dataset.palette];
    setPaletteInputs(p);
    lineMat.color.set(p.line);
    applyShellMaterial();
    scene.background.set(p.bg);
  })
);
$('bands').addEventListener('change', applyShellMaterial);
$('showAxis').addEventListener('change', (e) => {
  axis.visible = e.target.checked;
  $('axis-params').hidden = !e.target.checked; // the width control only appears when the axis is visible
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

// ---------------------------------------------------------------------------
// Standard views with a smooth transition
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Display orientation: coiling axis vertical (orbit around it), horizontal
// (planispiral shells seen face-on with a horizontal drag) or free rotation
// (the shell is turned by hand, in any direction)
// ---------------------------------------------------------------------------

const ORIENT_BASE = {
  vertical: new THREE.Quaternion(),
  // Axis horizontal, pointing to the 3/4 camera: the plane of coiling stands
  // upright and faces the default view
  horizontal: new THREE.Quaternion()
    .setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(CAMERA_HOME.x, CAMERA_HOME.z))
    .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2)),
};
let orientTween = null;

/** The ground (shadow) touches the lowest point of the shell in its current orientation. */
function updateGround() {
  const P = solid.geometry.attributes.position?.array;
  if (!P) return;
  const e = new THREE.Matrix4().makeRotationFromQuaternion(shellGroup.quaternion).elements;
  let minY = Infinity;
  for (let k = 0; k < P.length; k += 3) {
    const y = e[1] * P[k] + e[5] * P[k + 1] + e[9] * P[k + 2];
    if (y < minY) minY = y;
  }
  ground.position.y = minY - 0.002;
}

function setOrient(mode, { animate = true } = {}) {
  state.orient = mode;
  controls.enableRotate = mode !== 'free';
  document.querySelectorAll('.orient [data-orient]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.orient === mode)));
  if (mode !== 'free') {
    const to = ORIENT_BASE[mode];
    if (animate) orientTween = { t0: performance.now(), dur: 600, from: shellGroup.quaternion.clone(), to };
    else {
      orientTween = null;
      shellGroup.quaternion.copy(to);
      updateGround();
    }
  }
  writeHash();
}

function stepOrient(now) {
  const u = Math.min(1, (now - orientTween.t0) / orientTween.dur);
  shellGroup.quaternion.slerpQuaternions(orientTween.from, orientTween.to, easeInOut(u));
  updateGround();
  if (u >= 1) orientTween = null;
}

document.querySelectorAll('.orient [data-orient]').forEach((b) => b.addEventListener('click', () => setOrient(b.dataset.orient)));

// Free rotation: dragging turns the shell about the screen's vertical and
// horizontal axes, like turning it in the hand. Zoom and pan stay with the camera.
const freeDrag = { id: null, x: 0, y: 0, pointers: new Set() };
renderer.domElement.addEventListener('pointerdown', (e) => {
  freeDrag.pointers.add(e.pointerId);
  const ok = state.orient === 'free' && e.button === 0 && freeDrag.pointers.size === 1 && !e.ctrlKey && !e.metaKey && !e.shiftKey;
  freeDrag.id = ok ? e.pointerId : null;
  if (!ok) return;
  freeDrag.x = e.clientX;
  freeDrag.y = e.clientY;
  orientTween = null;
  tween = null;
});
renderer.domElement.addEventListener('pointermove', (e) => {
  if (e.pointerId !== freeDrag.id) return;
  if (freeDrag.pointers.size > 1) { freeDrag.id = null; return; }
  const k = Math.PI / Math.max(200, viewport.clientHeight); // half a turn per viewport height
  const dx = (e.clientX - freeDrag.x) * k, dy = (e.clientY - freeDrag.y) * k;
  freeDrag.x = e.clientX;
  freeDrag.y = e.clientY;
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  shellGroup.quaternion
    .premultiply(new THREE.Quaternion().setFromAxisAngle(up, dx))
    .premultiply(new THREE.Quaternion().setFromAxisAngle(right, dy))
    .normalize();
  updateGround();
});
for (const type of ['pointerup', 'pointercancel', 'pointerleave']) {
  renderer.domElement.addEventListener(type, (e) => {
    freeDrag.pointers.delete(e.pointerId);
    if (e.pointerId === freeDrag.id) freeDrag.id = null;
  });
}

const VIEWS = {
  iso: () => CAMERA_HOME.clone(),
  apertural: () => new THREE.Vector3(0, 0, state.hand), // the aperture faces +Z in dextral shells
  dorsal: () => new THREE.Vector3(0, 0, -state.hand),
  apical: () => new THREE.Vector3(0, 1, 0.001),
  umbilical: () => new THREE.Vector3(0, -1, 0.001),
  profile: () => new THREE.Vector3(1, 0, 0),
};

let tween = null;
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);

function flyTo(name) {
  // Consume the pending OrbitControls inertia so the camera does not spin after the transition
  controls.enableDamping = false;
  controls.update();
  controls.enableDamping = true;

  const offset = camera.position.clone().sub(controls.target);
  const dist = name === 'iso' ? CAMERA_HOME.length() : THREE.MathUtils.clamp(offset.length(), 7, 16);
  const from = new THREE.Spherical().setFromVector3(offset);
  // Standard views are defined on the shell: they follow its display orientation.
  // In free rotation the shell is first set upright again.
  if (state.orient === 'free') orientTween = { t0: performance.now(), dur: 700, from: shellGroup.quaternion.clone(), to: ORIENT_BASE.vertical };
  const base = ORIENT_BASE[state.orient] ?? ORIENT_BASE.vertical;
  const dir = name === 'iso' ? VIEWS.iso() : VIEWS[name]().applyQuaternion(base);
  const to = new THREE.Spherical().setFromVector3(dir.normalize().multiplyScalar(dist));
  // Azimuth along the shortest path
  let dTheta = to.theta - from.theta;
  dTheta = Math.atan2(Math.sin(dTheta), Math.cos(dTheta));
  tween = { t0: performance.now(), dur: 700, from, dTheta, to, fromTarget: controls.target.clone() };
  document.querySelectorAll('.views [data-view]').forEach((b) => b.classList.toggle('active', b.dataset.view === name));
}

function stepTween(now) {
  const u = Math.min(1, (now - tween.t0) / tween.dur);
  const e = easeInOut(u);
  const { from, to } = tween;
  // Interpolating azimuth and elevation separately keeps the orientation
  // continuous, also when reaching the apical and umbilical views (on the vertical axis).
  const sph = new THREE.Spherical(
    THREE.MathUtils.lerp(from.radius, to.radius, e),
    THREE.MathUtils.lerp(from.phi, to.phi, e),
    from.theta + tween.dTheta * e
  );
  const target = tween.fromTarget.clone().lerp(new THREE.Vector3(), e);
  camera.position.copy(target).add(new THREE.Vector3().setFromSpherical(sph));
  controls.target.copy(target);
  camera.lookAt(target);
  if (u >= 1) tween = null;
}

document.querySelectorAll('.views [data-view]').forEach((b) => b.addEventListener('click', () => flyTo(b.dataset.view)));
controls.addEventListener('start', () => {
  tween = null;
  document.querySelectorAll('.views [data-view].active').forEach((b) => b.classList.remove('active'));
});


// Export: dialog with image, plate of views, PDF, 3D printing and GLB
// ---------------------------------------------------------------------------

const exportDlg = $('exportDlg');

function download(href, name) {
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  a.click();
}

function downloadBlob(data, type, name) {
  const url = URL.createObjectURL(data instanceof Blob ? data : new Blob([data], { type }));
  download(url, name);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Name typed by the user in the export dialog ("" if none). */
const customName = () => $('exName').value.trim();

function fileStem() {
  const own = slugify(customName());
  if (own) return own;
  const preset = PRESETS[presetSel.value] ? `${presetSel.value}_` : '';
  return `shell_${preset}W${formatW(state.W)}_D${f(state.D, 3)}_T${f(state.T, 2)}_S${f(state.S, 2)}${state.mirror ? '_mirror' : ''}`;
}

/** Readable name of the current shell: the user's own name, the preset's name or "custom". */
function shellName() {
  return customName() || defaultShellName();
}
const defaultShellName = () => (PRESETS[presetSel.value] ? tPreset(presetSel.value) : t('ex.customShell'));

/** Encodes a canvas in the format chosen in the export dialog and downloads it. */
async function downloadImage(canvas, stem, fmt = 'png') {
  if (fmt === 'tiff') {
    const { width, height } = canvas;
    const rgba = canvas.getContext('2d').getImageData(0, 0, width, height).data;
    downloadBlob(await encodeTIFF(width, height, rgba), 'image/tiff', `${stem}.tif`);
    return;
  }
  let src = canvas;
  if (fmt === 'jpg') {
    // JPEG has no transparency: flatten onto white
    src = document.createElement('canvas');
    src.width = canvas.width;
    src.height = canvas.height;
    const ctx = src.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, src.width, src.height);
    ctx.drawImage(canvas, 0, 0);
  }
  const type = fmt === 'jpg' ? 'image/jpeg' : 'image/png';
  const blob = await new Promise((resolve, reject) =>
    src.toBlob((b) => (b ? resolve(b) : reject(new Error('encoding failed'))), type, 0.95));
  downloadBlob(blob, type, `${stem}.${fmt}`);
}

/** Runs `fn` with the button in a "Preparing…" state and reports failures. */
async function busy(btn, fn) {
  const label = btn.textContent;
  btn.disabled = true;
  btn.textContent = t('ex.working');
  await new Promise((r) => setTimeout(r, 30)); // let the busy state paint
  try {
    await fn();
  } catch (err) {
    console.error(err);
    alert(t('ex.error'));
  } finally {
    btn.disabled = false;
    btn.textContent = label;
  }
}

// --- Image of the current view, at the chosen resolution -------------------

/**
 * Exports follow what the user sees: in "lines only" mode no colour is included
 * (no pattern and no pigmentation page), even if a pattern is selected in the
 * pigment tab.
 */
const colourShown = () => state.mode !== 'lines' && pattern.on && !!patternValues;

/** Runs `fn` with the coiling axis shown or hidden according to the export checkbox. */
function withExportAxis(fn) {
  const prev = axis.visible;
  axis.visible = $('exAxis').checked;
  try {
    return fn();
  } finally {
    axis.visible = prev;
  }
}

/**
 * Size in pixels chosen in one of the size menus: a multiple of the 3D view
 * (x1, x2, x4), the device screen, a fixed size (1920x1080…) or a custom one.
 */
function chosenSize(value, customW, customH) {
  const { clientWidth: w, clientHeight: h } = viewport;
  let W, H;
  if (value.startsWith('x')) {
    const k = parseFloat(value.slice(1)) * renderer.getPixelRatio();
    [W, H] = [w * k, h * k];
  } else if (value === 'screen') {
    const dpr = window.devicePixelRatio || 1;
    [W, H] = [screen.width * dpr, screen.height * dpr];
  } else if (value === 'custom') {
    [W, H] = [parseFloat(customW) || 1920, parseFloat(customH) || 1080];
  } else {
    [W, H] = value.split('x').map(Number);
  }
  // Within the largest side, keeping the proportions
  const fit = Math.min(1, MAX_SIDE / Math.max(W, H));
  return { W: Math.max(16, Math.round(W * fit)), H: Math.max(16, Math.round(H * fit)) };
}

const viewImageSize = () => chosenSize($('exRes').value, $('exW').value, $('exH').value);

/** Size of the plate of views, or null for the standard 3 × 2 plate. */
const plateImageSize = () => ($('exPlateRes').value === 'std'
  ? null : chosenSize($('exPlateRes').value, $('exPlateW').value, $('exPlateH').value));

const PLATE_TILE = 900; // view size of the standard plate

function updateViewImageSize() {
  const { W, H } = viewImageSize();
  $('exResDims').textContent = `${W} × ${H} px`;
  $('exCustomRow').hidden = $('exRes').value !== 'custom';
  const p = plateImageSize();
  const labelH = $('exLabels').checked ? Math.round(PLATE_TILE * 0.1) : 0;
  const [pw, ph] = p ? [p.W, p.H] : [3 * PLATE_TILE, 2 * (PLATE_TILE + labelH)];
  $('exPlateDims').textContent = `${pw} × ${ph} px`;
  document.querySelectorAll('[data-plate-custom]').forEach((el) => (el.hidden = $('exPlateRes').value !== 'custom'));
}

/**
 * Renders the current view at any size. The image is drawn in tiles (pieces of
 * the same camera frustum), so it does not depend on how large a drawing buffer
 * the browser grants. A different aspect ratio widens or narrows the framing so
 * that everything seen on screen stays in the image.
 * @returns {HTMLCanvasElement}
 */
function renderViewImage(W, H) {
  return withExportAxis(() => renderViewImageRaw(W, H));
}

function renderViewImageRaw(W, H) {
  const { clientWidth: w, clientHeight: h } = viewport;
  const frame = fitFrame(camera.fov, camera.aspect, W / H);
  const cam = camera.clone();
  cam.aspect = W / H;
  cam.fov = frame.fov;
  // Lines keep their width relative to the shell
  const lineScale = (frame.scale * H) / h;

  const out = document.createElement('canvas');
  out.width = W;
  out.height = H;
  const ctx = out.getContext('2d');
  const prevPR = renderer.getPixelRatio();
  const gl = renderer.getContext();
  const tile = Math.min(2048, ...gl.getParameter(gl.MAX_VIEWPORT_DIMS), gl.getParameter(gl.MAX_RENDERBUFFER_SIZE));
  renderer.setPixelRatio(1);
  renderer.setScissorTest(false);
  try {
    for (let y = 0; y < H; y += tile) {
      for (let x = 0; x < W; x += tile) {
        const tw = Math.min(tile, W - x), th = Math.min(tile, H - y);
        renderer.setSize(tw, th, false);
        renderer.setViewport(0, 0, tw, th);
        cam.setViewOffset(W, H, x, y, tw, th);
        lineMat.resolution.set(tw / lineScale, th / lineScale);
        axisMat.resolution.set(tw / lineScale, th / lineScale);
        renderer.clear();
        renderer.render(scene, cam);
        ctx.drawImage(renderer.domElement, 0, 0, tw, th, x, y, tw, th);
      }
    }
  } finally {
    renderer.setPixelRatio(prevPR);
    resize();
  }
  return out;
}

// --- Plate of standard views (orthographic projection) ---------------------

const PLATE_VIEWS = ['apertural', 'dorsal', 'apical', 'umbilical', 'profile', 'iso'];

/** Orthographic camera framed on the shell for one standard view. */
function plateCamera(name) {
  const dir = VIEWS[name]().normalize();
  const up = name === 'apical' || name === 'umbilical'
    ? new THREE.Vector3(0, 0, -state.hand) // the aperture ends up at the bottom
    : new THREE.Vector3(0, 1, 0);           // the apex ends up at the top
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  cam.up.copy(up);
  cam.position.copy(dir).multiplyScalar(30);
  cam.lookAt(0, 0, 0);
  cam.updateMatrixWorld();
  // Tight framing: vertices are projected onto the camera plane
  const P = solid.geometry.attributes.position.array;
  const inv = cam.matrixWorldInverse.elements;
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let k = 0; k < P.length; k += 3) {
    const x = inv[0] * P[k] + inv[4] * P[k + 1] + inv[8] * P[k + 2] + inv[12];
    const y = inv[1] * P[k] + inv[5] * P[k + 1] + inv[9] * P[k + 2] + inv[13];
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  const half = (Math.max(x1 - x0, y1 - y0) / 2) * 1.08;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  Object.assign(cam, { left: cx - half, right: cx + half, top: cy + half, bottom: cy - half });
  cam.updateProjectionMatrix();
  return { cam, dir, up };
}


/**
 * Draws the six views in a 3 × 2 grid.
 * @returns {HTMLCanvasElement}
 */
function renderPlate(opts) {
  return withExportAxis(() => renderPlateRaw(opts));
}

function renderPlateRaw({ tile = 640, background = '#ffffff', labels = true, width = 0, height = 0 } = {}) {
  const n = PLATE_VIEWS.length;
  // Standard plate: 3 × 2 views (or one row). At a given size, the grid that
  // gives the largest views, centred on the background.
  let cols = Math.min(3, n), rowsN = Math.ceil(n / cols), x0 = 0, y0 = 0;
  if (width && height && n === 6) {
    ({ cols, rows: rowsN, tile, x0, y0 } = plateLayout(width, height, labels ? 0.1 : 0));
  }
  const labelH = labels ? Math.round(tile * 0.1) : 0;
  const out = document.createElement('canvas');
  out.width = width || cols * tile;
  out.height = height || rowsN * (tile + labelH);
  const ctx = out.getContext('2d');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, out.width, out.height);

  const prev = {
    orient: shellGroup.quaternion.clone(),
    pr: renderer.getPixelRatio(),
    bg: scene.background.clone(),
    ground: ground.visible,
    sun: sun.position.clone(),
    res: lineMat.resolution.clone(),
    axisRes: axisMat.resolution.clone(),
  };
  renderer.setPixelRatio(1);
  renderer.setSize(tile, tile, false);
  renderer.setScissorTest(false);
  renderer.setViewport(0, 0, tile, tile);
  scene.background = new THREE.Color(background);
  ground.visible = false;
  shellGroup.quaternion.identity(); // the views of the plate are defined in the model frame
  lineMat.resolution.set(720, 720); // line width similar to the screen
  axisMat.resolution.set(720, 720);

  const ink = luminance(background) > 0.5 ? '#1c2430' : '#e6e8eb';
  PLATE_VIEWS.forEach((name, k) => {
    const { cam, dir, up } = plateCamera(name);
    // Key light from the viewer's upper left, in every view
    const right = new THREE.Vector3().crossVectors(up, dir).normalize();
    sun.position.copy(dir).multiplyScalar(0.7).addScaledVector(up, 0.6).addScaledVector(right, -0.5).normalize().multiplyScalar(10);
    renderer.clear();
    renderer.render(scene, cam);
    const x = x0 + (k % cols) * tile;
    const y = y0 + Math.floor(k / cols) * (tile + labelH);
    ctx.drawImage(renderer.domElement, x, y);
    if (labels) {
      ctx.fillStyle = ink;
      ctx.font = `500 ${Math.round(labelH * 0.5)}px Inter, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(t(`view.${name}`), x + tile / 2, y + tile + labelH * 0.45);
    }
  });

  scene.background = prev.bg;
  ground.visible = prev.ground;
  shellGroup.quaternion.copy(prev.orient);
  sun.position.copy(prev.sun);
  lineMat.resolution.copy(prev.res);
  axisMat.resolution.copy(prev.axisRes);
  renderer.setPixelRatio(prev.pr);
  resize();
  return out;
}

const plateBackground = () => ($('exBg').value === 'current' ? $('bgColor').value : '#ffffff');

function updatePlatePreview() {
  const size = plateImageSize();
  const k = size ? 660 / Math.max(size.W, size.H) : 0;
  const c = renderPlate({ tile: 220, background: plateBackground(), labels: $('exLabels').checked,
    width: size ? Math.round(size.W * k) : 0, height: size ? Math.round(size.H * k) : 0 });
  const img = $('exPlatePreview');
  img.src = c.toDataURL('image/png');
}

// --- 3D printing --------------------------------------------------------------

let printCache = { key: '', mesh: null };

function printOptions() {
  const size = THREE.MathUtils.clamp(parseFloat($('exSize').value) || 80, 20, 300);
  const wall = THREE.MathUtils.clamp(parseFloat($('exWall').value) || 1.2, 0.4, 6);
  return { size, wall };
}

function printMesh() {
  const { size, wall } = printOptions();
  const shape = { ...pickShape(state), ...(hasOrnament(state) ? pickOrnament(state) : {}) };
  const key = JSON.stringify({ shape, size, wall });
  if (printCache.key !== key) printCache = { key, mesh: buildPrintMesh(shape, { size, wall }) };
  return printCache.mesh;
}

let dimsTimer = 0;
function updatePrintDims() {
  clearTimeout(dimsTimer);
  dimsTimer = setTimeout(() => {
    const [x, y, z] = printMesh().dims.map((d) => d.toFixed(0));
    $('exDims').textContent = t('ex.dims', x, y, z);
  }, 120);
}

// --- GLB with colour ----------------------------------------------------------

async function exportGLB() {
  const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
  const group = new THREE.Group();
  // Lines ("Lines" and "Both" modes): plain segments with the line colour
  if (state.mode !== 'solid' && lastBuild.lineIndices.length) {
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.BufferAttribute(lastBuild.positions.slice(), 3));
    lg.setIndex(new THREE.BufferAttribute(lastBuild.lineIndices.slice(), 1));
    const segs = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: lineMat.color.clone() }));
    segs.name = `${shellName()} (lines)`;
    group.add(segs);
  }
  // In "lines only" mode the surface is not exported: no colour and no pattern
  if (state.mode === 'lines') {
    const data = await new GLTFExporter().parseAsync(group, { binary: true });
    downloadBlob(data, 'model/gltf-binary', `${fileStem()}_lines.glb`);
    return;
  }
  const mat = solidMat.clone();
  mat.side = THREE.DoubleSide;
  mat.polygonOffset = false;
  // In glTF the vertex colour always multiplies the texture: export it only when used
  const geo = solid.geometry.clone();
  if (!mat.vertexColors) geo.deleteAttribute('color');
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = shellName();
  group.add(mesh);
  const data = await new GLTFExporter().parseAsync(group, { binary: true });
  downloadBlob(data, 'model/gltf-binary', `${fileStem()}.glb`);
}

// --- PDF (js/ui/pdf.js) ------------------------------------------------------
// The sheet reads the app through this context, built when the PDF is made
const pdfContext = () => ({
  state, pattern, lastBuild, patternCanvas, profileRow, PATTERN_CELLS, PATTERN_ROWS,
  colourShown, drawMorphoOn, drawProfileOn, fileStem, generalTeX, liveTeX, renderPlate,
  renderPlateSubset, shellName, writeHashNow,
});
const exportPDF = () => makePDF(pdfContext());

/** Some views of the plate, in one row (for the pattern page). */
function renderPlateSubset(names, tile, background = '#ffffff') {
  const saved = PLATE_VIEWS.slice();
  PLATE_VIEWS.splice(0, PLATE_VIEWS.length, ...names);
  try {
    // With up to three views the plate is a single row, labels included
    return renderPlate({ tile, background, labels: true });
  } finally {
    PLATE_VIEWS.splice(0, PLATE_VIEWS.length, ...saved);
  }
}

// --- Dialog -------------------------------------------------------------------

function openExport() {
  // By default the axis is exported if it is visible in the 3D view
  $('exAxis').checked = $('showAxis').checked;
  $('exLinesNote').hidden = state.mode !== 'lines';
  $('exPatternCard').classList.toggle('disabled', !(pattern.on && patternValues));
  $('exPattern').disabled = !(pattern.on && patternValues);
  $('exPatternNone').hidden = pattern.on && !!patternValues;
  $('exName').placeholder = defaultShellName();
  fillFixedSizes();
  if (!exportDlg.open) exportDlg.showModal();
  updatePrintDims();
  updateViewImageSize();
  requestAnimationFrame(updatePlatePreview);
}

/** Fixed sizes in the size menus (after "Your screen", which depends on the device). */
function fillFixedSizes() {
  const dpr = window.devicePixelRatio || 1;
  const sw = Math.round(screen.width * dpr), sh = Math.round(screen.height * dpr);
  for (const group of [$('exResFixed'), $('exPlateFixed')]) {
    group.querySelector('[value="screen"]').textContent = `${t('ex.res.screen')} · ${sw} × ${sh}`;
    if (group.children.length > 1) continue;
    for (const z of FIXED_SIZES) {
      const o = document.createElement('option');
      o.value = z.key;
      o.textContent = `${z.ratio} · ${z.w} × ${z.h}${z.label ? ` (${z.label})` : ''}`;
      group.append(o);
    }
  }
}

$('openExport').addEventListener('click', openExport);
$('closeExport').addEventListener('click', () => exportDlg.close());
exportDlg.addEventListener('click', (e) => {
  if (e.target === exportDlg) exportDlg.close();
});
$('exBg').addEventListener('change', updatePlatePreview);
$('exAxis').addEventListener('change', updatePlatePreview);
$('exLabels').addEventListener('change', () => { updateViewImageSize(); updatePlatePreview(); });
for (const id of ['exSize', 'exWall']) $(id).addEventListener('input', updatePrintDims);

$('exRes').addEventListener('change', updateViewImageSize);
for (const id of ['exW', 'exH']) $(id).addEventListener('input', updateViewImageSize);
$('exPlateRes').addEventListener('change', () => { updateViewImageSize(); updatePlatePreview(); });
for (const id of ['exPlateW', 'exPlateH']) $(id).addEventListener('change', () => { updateViewImageSize(); updatePlatePreview(); });
$('exPng').addEventListener('click', (e) => busy(e.currentTarget, async () => {
  const { W, H } = viewImageSize();
  await downloadImage(renderViewImage(W, H), `${fileStem()}_${W}x${H}`, $('exFormat').value);
}));
$('exPlate').addEventListener('click', (e) => busy(e.currentTarget, async () => {
  const size = plateImageSize();
  const c = renderPlate({ tile: PLATE_TILE, background: plateBackground(), labels: $('exLabels').checked, width: size?.W, height: size?.H });
  await downloadImage(c, `${fileStem()}_views${size ? `_${size.W}x${size.H}` : ''}`, $('exPlateFormat').value);
}));
$('exPdf').addEventListener('click', (e) => busy(e.currentTarget, exportPDF));
$('exStl').addEventListener('click', (e) => busy(e.currentTarget, () => {
  downloadBlob(toSTL(printMesh(), shellName()), 'model/stl', `${fileStem()}_${printOptions().size}mm.stl`);
}));
$('ex3mf').addEventListener('click', (e) => busy(e.currentTarget, async () => {
  downloadBlob(await to3MF(printMesh(), shellName()), 'model/3mf', `${fileStem()}_${printOptions().size}mm.3mf`);
}));
$('exGlb').addEventListener('click', (e) => busy(e.currentTarget, exportGLB));
$('exPattern').addEventListener('click', (e) => {
  if (!patternValues) return;
  const own = slugify(customName());
  busy(e.currentTarget, () => downloadImage(patternCanvas, own ? `${own}_pattern` : `meinhardt_${pattern.preset}_seed${pattern.seed}`, $('exPatternFormat').value));
});

// ---------------------------------------------------------------------------
// Pigmentation (Meinhardt's reaction–diffusion models)
// ---------------------------------------------------------------------------

const PATTERN_ROWS = 2048;   // rows of the space–time record (apex → aperture)
const PATTERN_WIDTH = 1024;  // texture columns (once around the aperture)
const PATTERN_CELLS = 256;   // margin cells at the aperture (size ×1)
// Half-width of the pigmentation threshold: pigment is laid down where the
// activator exceeds a threshold, as in Meinhardt's simulations, with sharp edges
const PIGMENT_EDGE = 0.12;
const THUMB = { rows: 144, width: 256 }; // one-cell lines must not be lost when downscaling

const PATTERN_KEYS = ['model', 'Da', 'D2', 'ra', 'r2', 'kappa', 'ba', 'b2', 'noise', 'globalCtl', 'T', 'insertion', 'base', 'pigment', 'size', 'amount'];
const PATTERN_DEFAULTS = { size: 1, amount: 0.5 };

const pickPattern = (p) => Object.fromEntries(PATTERN_KEYS.map((k) => [k, p[k] ?? PATTERN_DEFAULTS[k]]));

const pattern = { on: false, preset: DEFAULT_PATTERN, seed: 7, ...pickPattern(PATTERN_PRESETS[DEFAULT_PATTERN]) };
let patternState = 'pattern'; // 'pattern' | 'uniform' | 'extinct'

// Pattern state in the URL: pg=1 and the parameters prefixed with p
const PATTERN_HASH = { pm: 'model', pDa: 'Da', pD2: 'D2', pra: 'ra', pr2: 'r2', pk: 'kappa', pba: 'ba', pb2: 'b2', pn: 'noise', pgc: 'globalCtl', pT: 'T', ps: 'seed', pz: 'size', pa: 'amount' };
if (fromHash.get('pg') === '1') {
  pattern.on = true;
  pattern.preset = PATTERN_PRESETS[fromHash.get('pp')] ? fromHash.get('pp') : 'custom';
  // A named pattern starts from its own constants; the link may then change some of them
  if (PATTERN_PRESETS[pattern.preset]) Object.assign(pattern, pickPattern(PATTERN_PRESETS[pattern.preset]));
  for (const [short, key] of Object.entries(PATTERN_HASH)) {
    if (!fromHash.has(short)) continue;
    if (key === 'model') pattern.model = fromHash.get(short) === 'AS' ? 'AS' : 'AI';
    else if (Number.isFinite(parseFloat(fromHash.get(short)))) pattern[key] = parseFloat(fromHash.get(short));
  }
  if (fromHash.has('pi')) pattern.insertion = fromHash.get('pi') === '1';
  for (const [short, key] of [['pcb', 'base'], ['pcp', 'pigment']]) {
    if (/^[0-9a-f]{6}$/i.test(fromHash.get(short) || '')) pattern[key] = `#${fromHash.get(short)}`;
  }
}

function patternHash(q) {
  q.set('pg', pattern.on ? '1' : '0');
  if (!pattern.on) return;
  q.set('pp', pattern.preset);
  for (const [short, key] of Object.entries(PATTERN_HASH)) q.set(short, key === 'model' ? pattern.model : String(+Number(pattern[key]).toFixed(4)));
  q.set('pi', pattern.insertion ? '1' : '0');
  q.set('pcb', pattern.base.slice(1));
  q.set('pcp', pattern.pigment.slice(1));
}

// Texture and canvas with the space–time record (row 0 = apex, like v = 0 on the mesh)
const patternPixels = new Uint8Array(PATTERN_WIDTH * PATTERN_ROWS * 4);
const patternTex = new THREE.DataTexture(patternPixels, PATTERN_WIDTH, PATTERN_ROWS, THREE.RGBAFormat);
patternTex.colorSpace = THREE.SRGBColorSpace;
patternTex.wrapS = THREE.RepeatWrapping;
patternTex.wrapT = THREE.ClampToEdgeWrapping;
patternTex.magFilter = THREE.LinearFilter;
patternTex.minFilter = THREE.LinearMipmapLinearFilter;
patternTex.generateMipmaps = true;
patternTex.anisotropy = renderer.capabilities.getMaxAnisotropy();

const patternCanvas = document.createElement('canvas');
patternCanvas.width = PATTERN_WIDTH;
patternCanvas.height = PATTERN_ROWS;
const patternImage = new ImageData(new Uint8ClampedArray(patternPixels.buffer), PATTERN_WIDTH, PATTERN_ROWS);
const spacetime = $('spacetime');

let patternValues = null;
let patternSecond = null; // inhibitor or substrate (rows × PROFILE_WIDTH), relative to its maximum
let profileRow = null;    // moment chosen for the profile (null = the aperture)
const profileCanvas = $('profile');


/**
 * Turns the activator (0–1) into colour: pigment where it exceeds the threshold,
 * with a short smoothstep transition so edges are sharp but not jagged. The
 * pigment amount shifts the threshold.
 */
function colorize(values, base, pigment, amount, out) {
  const b = hexRgb(base);
  const p = hexRgb(pigment);
  const lo = 1 - amount - PIGMENT_EDGE;
  const span = 2 * PIGMENT_EDGE;
  for (let i = 0, k = 0; i < values.length; i++, k += 4) {
    let x = (values[i] - lo) / span;
    x = x < 0 ? 0 : x > 1 ? 1 : x;
    const t = x * x * (3 - 2 * x);
    out[k] = b[0] + (p[0] - b[0]) * t;
    out[k + 1] = b[1] + (p[1] - b[1]) * t;
    out[k + 2] = b[2] + (p[2] - b[2]) * t;
    out[k + 3] = 255;
  }
}

function paintPattern() {
  if (!patternValues) return;
  colorize(patternValues, pattern.base, pattern.pigment, pattern.amount, patternPixels);
  patternVersion++;
  patternTex.needsUpdate = true;
  patternCanvas.getContext('2d').putImageData(patternImage, 0, 0);
  drawSpacetime();
  applyShellMaterial();
  updatePatternMessage();
}

// ---------------------------------------------------------------------------
// Two ways of drawing the record:
// - "In time" (Meinhardt's diagram): every row is the same time interval and
//   every whorl gets the same height; the margin is normalised to the width.
// - "Unrolled shell": every row is as long as the margin at that moment and as
//   tall as the growth it records. On a logarithmic spiral the size
//   g = W^(θ/2π) grows together with the distance travelled from the apex (∝ g),
//   so the unrolled surface is a straight-sided fan opening from the apex, with
//   the height/width ratio of the shell.
// ---------------------------------------------------------------------------

let stView = 'time';
let stRect = { ox: 0, oy: 0, dw: 1, dh: 1 }; // drawn area, in CSS pixels
let patternVersion = 0;
let unrolledCache = { key: '', canvas: null };

/** Proportions of the unrolled shell and relative size of the apex (g0). */
function unrolledGeometry() {
  const W = Math.max(state.W, 1.0001), N = state.turns;
  const k = Math.log(W) / (2 * Math.PI);
  const rc = (1 + state.D) / 2, a = (1 - state.D) / 2, b = state.S * a;
  // Aperture perimeter (Ramanujan's approximation) and advance of its centre per radian
  const P = Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
  const v = rc * Math.sqrt(1 + k * k * (1 + state.T * state.T));
  const g0 = Math.exp(-2 * Math.PI * N * k);
  return { k, N, g0, aspect: (v * (1 - g0)) / (k * P) };
}

/** Record row → vertical position (0 = apex, 1 = aperture) in the current view. */
function rowToFrac(row) {
  if (stView === 'time') return (row + 0.5) / PATTERN_ROWS;
  const { k, N, g0 } = unrolledGeometry();
  const g = Math.exp(-2 * Math.PI * N * k * (1 - row / (PATTERN_ROWS - 1)));
  return (g - g0) / (1 - g0);
}

function fracToRow(f) {
  if (stView === 'time') return Math.round(f * (PATTERN_ROWS - 1));
  const { k, N, g0 } = unrolledGeometry();
  const g = g0 + f * (1 - g0);
  const row = Math.round((PATTERN_ROWS - 1) * (1 + Math.log(g) / (2 * Math.PI * N * k)));
  return Math.min(PATTERN_ROWS - 1, Math.max(0, row));
}

/** Image of the unrolled shell (the columns covered by each pixel are averaged). */
function unrolledImage(wpx, hpx) {
  const key = `${patternVersion}|${state.W}|${state.turns}|${wpx}|${hpx}`;
  if (unrolledCache.key === key) return unrolledCache.canvas;
  const { k, N, g0 } = unrolledGeometry();
  const img = new ImageData(wpx, hpx);
  const out = img.data;
  const src = patternPixels;
  for (let y = 0; y < hpx; y++) {
    const g = g0 + ((1 - g0) * (y + 0.5)) / hpx;
    const row = Math.min(PATTERN_ROWS - 1, Math.max(0, Math.round((PATTERN_ROWS - 1) * (1 + Math.log(g) / (2 * Math.PI * N * k)))));
    const rw = wpx * g;
    const x0 = (wpx - rw) / 2;
    const xs = Math.max(0, Math.floor(x0)), xe = Math.min(wpx, Math.ceil(x0 + rw));
    for (let x = xs; x < xe; x++) {
      const u0 = Math.max(0, (x - x0) / rw), u1 = Math.min(1, (x + 1 - x0) / rw);
      if (u1 <= u0) continue;
      const c0 = Math.floor(u0 * PATTERN_WIDTH);
      const c1 = Math.max(c0 + 1, Math.min(PATTERN_WIDTH, Math.ceil(u1 * PATTERN_WIDTH)));
      let r = 0, gg = 0, bb = 0;
      for (let c = c0; c < c1; c++) {
        const si = (row * PATTERN_WIDTH + c) * 4;
        r += src[si]; gg += src[si + 1]; bb += src[si + 2];
      }
      const n = c1 - c0, di = (y * wpx + x) * 4;
      out[di] = r / n; out[di + 1] = gg / n; out[di + 2] = bb / n;
      out[di + 3] = 255 * Math.min(1, (u1 - u0) * rw); // anti-aliased fan edge
    }
  }
  const c = document.createElement('canvas');
  c.width = wpx;
  c.height = hpx;
  c.getContext('2d').putImageData(img, 0, 0);
  unrolledCache = { key, canvas: c };
  return c;
}

function drawSpacetime() {
  // Canvas height: fixed in the time view; true proportions in the unrolled view
  let aspect = 0;
  if (stView === 'shell') {
    aspect = unrolledGeometry().aspect;
    const cw = spacetime.clientWidth;
    if (cw) spacetime.style.height = `${Math.round(Math.min(440, Math.max(170, cw * aspect)))}px`;
  } else {
    spacetime.style.height = '';
  }
  const w = spacetime.clientWidth;
  const h = spacetime.clientHeight;
  // The profile is drawn even with the tab hidden: it is also shown on the 3D view
  if (!w || !h) return drawProfile();
  const dpr = Math.min(window.devicePixelRatio, 2);
  spacetime.width = Math.round(w * dpr);
  spacetime.height = Math.round(h * dpr);
  const ctx = spacetime.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  if (stView === 'shell') {
    const dw = Math.min(w - 8, (h - 8) / aspect), dh = dw * aspect;
    stRect = { ox: (w - dw) / 2, oy: (h - dh) / 2, dw, dh };
  } else {
    stRect = { ox: 0, oy: 0, dw: w, dh: h };
  }
  if (patternValues) {
    const { ox, oy, dw, dh } = stRect;
    if (stView === 'shell') ctx.drawImage(unrolledImage(Math.round(dw * dpr), Math.round(dh * dpr)), ox * dpr, oy * dpr);
    else ctx.drawImage(patternCanvas, 0, 0, spacetime.width, spacetime.height);
  }
  // In the advanced view the moment of the profile is marked
  if (patternValues && $('tab-pigment').dataset.pmode === 'advanced') {
    const row = profileRow ?? PATTERN_ROWS - 1;
    const { ox, oy, dw, dh } = stRect;
    const y = Math.min(spacetime.height - 1, (oy + rowToFrac(row) * dh) * dpr);
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    ctx.lineWidth = 2 * dpr;
    ctx.beginPath();
    ctx.moveTo(ox * dpr, y);
    ctx.lineTo((ox + dw) * dpr, y);
    ctx.stroke();
  }
  drawProfile();
}

function setStView(view) {
  stView = view;
  document.querySelectorAll('#stView [data-stview]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.stview === view)));
  for (const [id, base] of [['stCapX', 'pig.axis.x'], ['stCapT', 'pig.axis.t'], ['stNote', 'pig.st.note']]) {
    const el = $(id);
    el.dataset.i18n = id === 'stNote' ? `${base}.${view}` : view === 'shell' ? `${base}.shell` : base;
    el.textContent = t(el.dataset.i18n);
  }
  drawSpacetime();
}
document.querySelectorAll('#stView [data-stview]').forEach((b) => b.addEventListener('click', () => setStView(b.dataset.stview)));
new ResizeObserver(drawSpacetime).observe(spacetime);

/**
 * Profile along the margin at one moment: the activator and the second substance
 * (inhibitor or substrate), each relative to its maximum, and the pigment threshold.
 */
function drawProfile() {
  const row = profileRow ?? PATTERN_ROWS - 1;
  const label = `${t('pig.profile.time')} ${Math.round((100 * row) / (PATTERN_ROWS - 1))} %`;
  const css = getComputedStyle(document.documentElement);
  const accent = css.getPropertyValue('--accent').trim();
  // The activator uses the text colour (readable with any pigment and theme); the pigmented area uses the pigment colour
  document.querySelectorAll('.lg-a').forEach((el) => el.style.setProperty('--lg', css.getPropertyValue('--text').trim()));
  document.querySelectorAll('.lg-b').forEach((el) => el.style.setProperty('--lg', accent));
  $('profileTime').textContent = label;
  drawProfileOn(profileCanvas, row, css);

  // Overlay version on the 3D view: only meaningful with a pattern applied
  if ($('ovProfile').hidden) return;
  const has = pattern.on && !!patternValues;
  $('ovProfileBody').hidden = !has;
  $('ovProfileEmpty').hidden = has;
  $('ovProfileTime').textContent = has ? label : '';
  $('ovProfileRow').value = Math.round((1000 * row) / (PATTERN_ROWS - 1));
  setFill($('ovProfileRow'));
  if (has) drawProfileOn($('profileOv'), row, css);
}

/** @param {object} [off] for off-screen drawing (PDF): { width, height, scale, colors } */
function drawProfileOn(canvas, row, css, off) {
  const w = off ? off.width : canvas.clientWidth;
  const h = off ? off.height : canvas.clientHeight;
  if (!w || !h) return;
  const dpr = off ? off.scale : Math.min(window.devicePixelRatio, 2);
  const col = (name) => off?.colors?.[name] ?? css.getPropertyValue(name).trim();
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (!patternValues || !patternSecond) return;

  const pad = 8;
  const x = (k) => (k / (PROFILE_WIDTH - 1)) * w;
  const y = (v) => pad + (1 - v) * (h - 2 * pad);
  const aAt = (k) => patternValues[row * PATTERN_WIDTH + Math.floor((k / PROFILE_WIDTH) * PATTERN_WIDTH)];
  const threshold = 1 - pattern.amount;

  // Pigmented area: activator above the threshold
  ctx.fillStyle = pattern.pigment;
  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.moveTo(0, y(threshold));
  for (let k = 0; k < PROFILE_WIDTH; k++) ctx.lineTo(x(k), y(Math.max(threshold, aAt(k))));
  ctx.lineTo(w, y(threshold));
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  // Pigment threshold
  ctx.setLineDash([2, 3]);
  ctx.strokeStyle = col('--muted');
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, y(threshold));
  ctx.lineTo(w, y(threshold));
  ctx.stroke();

  // Second substance (dashed) and activator
  const line = (get, color, width, dash) => {
    ctx.setLineDash(dash);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    for (let k = 0; k < PROFILE_WIDTH; k++) ctx[k ? 'lineTo' : 'moveTo'](x(k), y(get(k)));
    ctx.stroke();
  };
  line((k) => patternSecond[row * PROFILE_WIDTH + k], col('--accent'), 1.6, [5, 3]);
  line(aAt, col('--text'), 1.8, []);
  ctx.setLineDash([]);
}
new ResizeObserver(drawProfile).observe(profileCanvas);

// The moment can also be chosen with the slider of the overlaid profile
$('ovProfileRow').addEventListener('input', (e) => {
  profileRow = Math.round((e.target.value / 1000) * (PATTERN_ROWS - 1));
  drawSpacetime();
});

// Choose the moment of the profile on the space–time record (advanced view)
function pickProfileRow(e) {
  if ($('tab-pigment').dataset.pmode !== 'advanced' || !patternValues) return;
  const r = spacetime.getBoundingClientRect();
  const f = Math.min(1, Math.max(0, (e.clientY - r.top - stRect.oy) / stRect.dh));
  profileRow = fracToRow(f);
  drawSpacetime();
}
spacetime.addEventListener('pointerdown', (e) => {
  capturePointer(spacetime, e);
  pickProfileRow(e);
});
spacetime.addEventListener('pointermove', (e) => {
  if (spacetime.hasPointerCapture(e.pointerId)) pickProfileRow(e);
});

/** If the current values form no pattern, explain it instead of showing a blank shell. */
function updatePatternMessage() {
  const msg = $('patternMsg');
  msg.hidden = patternState === 'pattern';
  if (!msg.hidden) msg.textContent = t(`pig.state.${patternState}`);
}

/** Solid colour or pattern, depending on the chosen option. */
function applyShellMaterial() {
  const withPattern = pattern.on && !!patternValues;
  solidMat.map = withPattern ? patternTex : null;
  solidMat.color.set(withPattern ? '#ffffff' : $('shellColor').value);
  solidMat.vertexColors = !withPattern && $('bands').checked;
  solidMat.needsUpdate = true;
  // The inside, lighter than the background colour of the outside
  innerMat.color.set(withPattern ? pattern.base : $('shellColor').value).lerp(new THREE.Color('#ffffff'), 0.55);
  const swatch = document.querySelector('.pattern-card[data-pattern="none"] .swatch');
  if (swatch) swatch.style.background = $('shellColor').value;
}

// Computed in a Web Worker, or on the main thread if workers are unavailable.
// If a new computation arrives while another is running, the busy worker is
// discarded instead of waiting: when dragging a slider only the last value matters.
let patternWorker = null;
let workerBusy = false;
let workerFailed = false;
const workerUrl = new URL('./workers/pigment-worker.js', import.meta.url);

function startWorker() {
  try {
    patternWorker = new Worker(workerUrl, { type: 'module' });
    patternWorker.onmessage = (e) => {
      workerBusy = false;
      onPatternResult(e.data);
    };
    patternWorker.onerror = () => {
      patternWorker = null;
      workerBusy = false;
      workerFailed = true;
      computePattern();
    };
  } catch {
    patternWorker = null;
    workerFailed = true;
  }
}
startWorker();

let patternJob = 0;
let patternTimer = 0;
let patternGeomKey = '';

/** Simulation parameters from the state (global control only exists with a substrate). */
function simParams(p) {
  const { model, Da, D2, ra, r2, kappa, ba, b2, noise, globalCtl, T, seed, insertion } = p;
  return { model, Da, D2, ra, r2, kappa, ba, b2, noise, globalCtl: model === 'AS' ? globalCtl : 0, T, seed, insertion };
}

function computePattern() {
  const id = ++patternJob;
  const p = simParams(pattern);
  // The pattern size is the number of margin cells (fewer cells, larger elements)
  const g = { W: state.W, turns: state.turns, rows: PATTERN_ROWS, width: PATTERN_WIDTH, nMax: Math.round(PATTERN_CELLS / pattern.size) };
  patternGeomKey = `${state.W}|${state.turns}`;
  $('patternStatus').hidden = false;
  if (workerBusy && patternWorker) {
    patternWorker.terminate();
    startWorker();
  }
  if (patternWorker) {
    workerBusy = true;
    patternWorker.postMessage({ id, p, g });
  } else if (workerFailed) {
    setTimeout(() => {
      const r = simulatePattern(p, g);
      onPatternResult({ id, v: r.values, second: r.second, state: r.state });
    });
  }
}

function onPatternResult({ id, v, second, state: simState }) {
  if (id !== patternJob) return; // a stale computation arrived
  patternValues = v;
  patternSecond = second;
  patternState = simState;
  $('patternStatus').hidden = true;
  paintPattern();
}

function schedulePattern() {
  clearTimeout(patternTimer);
  if (pattern.on) patternTimer = setTimeout(computePattern, 80);
  writeHash();
  if (formulaView === 'meinhardt') scheduleFormula();
}

// With cell insertion the pattern depends on the size of each whorl (W and N)
function onGeometryForPattern() {
  if (pattern.insertion && pattern.on && patternGeomKey !== `${state.W}|${state.turns}`) schedulePattern();
}

// Controls. The intuitive quantities (size, time, irregularity, amount) are in
// both views; the model constants only in the advanced view.
const sub = (x, y) => `${x}<sub>${y}</sub>`;
const second = () => (pattern.model === 'AS' ? 'b' : 'h');
const PIG_SIMPLE = [
  { key: 'size', id: 'pSize', i18n: 'pSize', log: true, min: 0.5, max: 4, digits: 2 },
  { key: 'T', id: 'pT', i18n: 'pT', log: true, min: 500, max: 12000, format: (v) => v.toFixed(0) },
  { key: 'noise', id: 'pnoise', i18n: 'pNoise', min: 0, max: 0.5, step: 0.01, digits: 2 },
  { key: 'amount', id: 'pAmount', i18n: 'pAmount', min: 0.15, max: 0.85, step: 0.01, digits: 2 },
];

// Model constants: logarithmic scale, with the leftmost position = 0 where it makes sense
const PIG_ADVANCED = [
  { key: 'Da', id: 'pDa', sym: sub('D', 'a'), log: true, zero: true, min: 0.0005, max: 0.5, format: sig },
  { key: 'D2', id: 'pD2', sym: () => sub('D', second()), i18n: () => `D2.${pattern.model}`, log: true, zero: true, min: 0.001, max: 30, format: sig },
  { key: 'ra', id: 'pra', sym: sub('r', 'a'), log: true, min: 0.002, max: 0.3, format: sig },
  { key: 'r2', id: 'pr2', sym: () => sub('r', second()), i18n: () => `r2.${pattern.model}`, log: true, zero: true, min: 0.0005, max: 0.3, format: sig },
  { key: 'kappa', id: 'pkappa', sym: 'κ', min: 0, max: 2, step: 0.01, digits: 2 },
  { key: 'ba', id: 'pba', sym: sub('b', 'a'), log: true, zero: true, min: 0.0001, max: 0.1, format: sig },
  { key: 'b2', id: 'pb2', sym: () => sub('b', second()), i18n: () => `b2.${pattern.model}`, log: true, zero: true, min: 0.0005, max: 0.1, format: sig },
  { key: 'globalCtl', id: 'pglobal', sym: 'g', log: true, zero: true, min: 0.0005, max: 0.05, format: sig },
];
const PIG_PARAMS = [...PIG_SIMPLE, ...PIG_ADVANCED];

const pigControls = {};
for (const [defs, container] of [[PIG_SIMPLE, 'pig-simple'], [PIG_ADVANCED, 'pig-params']]) {
  defs.forEach((d) => {
    createParam(d, $(container), {
      compact: true,
      target: pattern,
      onChange: (key) => {
        if (key === 'amount') {
          paintPattern(); // only the colouring changes, not the simulation
          writeHash();
          return;
        }
        markPatternCustom();
        schedulePattern();
      },
    });
    pigControls[d.id] = controlsByKey[d.id];
  });
}

// Gallery: solid colour and one preset per pattern type, with its real thumbnail
const gallery = $('patternGallery');
const GALLERY = ['none', ...Object.keys(PATTERN_PRESETS)];

function buildGallery() {
  for (const key of GALLERY) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'pattern-card';
    card.dataset.pattern = key;
    card.setAttribute('role', 'radio');
    if (key === 'none') {
      card.innerHTML = '<div class="swatch"></div><span></span>';
    } else {
      const c = document.createElement('canvas');
      c.width = THUMB.width;
      c.height = THUMB.rows;
      card.append(c, document.createElement('span'));
    }
    card.addEventListener('click', () => selectPattern(key));
    gallery.append(card);
  }
  updateGalleryLabels();
}

function updateGalleryLabels() {
  gallery.querySelectorAll('.pattern-card').forEach((card) => {
    const key = card.dataset.pattern;
    card.querySelector('span').textContent = key === 'none' ? t('pig.none') : tPattern(key);
  });
}

function updateGallerySelection() {
  const selected = pattern.on ? pattern.preset : 'none';
  gallery.querySelectorAll('.pattern-card').forEach((card) => card.setAttribute('aria-checked', String(card.dataset.pattern === selected)));
}

// Thumbnails: computed once, in their own worker so they do not interfere with the main one
let thumbsDone = false;
function computeThumbs() {
  if (thumbsDone) return;
  thumbsDone = true;
  const jobs = Object.entries(PATTERN_PRESETS).map(([key, preset]) => {
    const p = { ...pickPattern(preset), seed: 7 };
    return { id: key, p: simParams(p), g: { W: 2.4, turns: 4.5, ...THUMB, nMax: Math.round(PATTERN_CELLS / p.size) }, preset: p };
  });
  const draw = (key, values) => {
    const job = jobs.find((j) => j.id === key);
    const canvas = gallery.querySelector(`.pattern-card[data-pattern="${key}"] canvas`);
    const img = new ImageData(THUMB.width, THUMB.rows);
    colorize(values, job.preset.base, job.preset.pigment, job.preset.amount, img.data);
    canvas.getContext('2d').putImageData(img, 0, 0);
  };
  try {
    const w = new Worker(workerUrl, { type: 'module' });
    let left = jobs.length;
    w.onmessage = (e) => {
      draw(e.data.id, e.data.v);
      if (--left === 0) w.terminate();
    };
    jobs.forEach(({ id, p, g }) => w.postMessage({ id, p, g }));
  } catch {
    jobs.forEach(({ id, p, g }) => setTimeout(() => draw(id, simulatePattern(p, g).values)));
  }
}

function markPatternCustom() {
  pattern.preset = 'custom';
  updateGallerySelection();
}

/** Colour is seen on the surface: lines are removed and the mode switches to solid. */
function ensureSurfaceMode() {
  if (state.mode !== 'solid') {
    state.mode = 'solid';
    applyMode();
    writeHash();
  }
}

function setPatternOn(on) {
  pattern.on = on;
  $('pigBody').hidden = !on;
  if (on) {
    ensureSurfaceMode();
    if (!patternValues) computePattern();
  }
  applyShellMaterial();
  updateGallerySelection();
  writeHash();
  drawProfile();
}

function selectPattern(key) {
  if (key === 'none') return setPatternOn(false);
  pattern.preset = key;
  Object.assign(pattern, pickPattern(PATTERN_PRESETS[key]));
  syncPatternControls();
  setPatternOn(true);
  computePattern();
}

/** Pushes the pattern state to all controls. */
function syncPatternControls() {
  PIG_PARAMS.forEach((d) => pigControls[d.id].set(pattern[d.key]));
  Object.values(pigControls).forEach((c) => c.relabel());
  pigControls.pglobal.el.hidden = pattern.model !== 'AS'; // global control only exists with a substrate
  $('patternModel').value = pattern.model;
  $('patternInsertion').checked = pattern.insertion;
  $('patternSeed').value = pattern.seed;
  $('pigBase').value = pattern.base;
  $('pigColor').value = pattern.pigment;
  $('pigBody').hidden = !pattern.on;
  setSecondLabel();
  updateGallerySelection();
}

function setSecondLabel() {
  const label = t(pattern.model === 'AS' ? 'pig.profile.b' : 'pig.profile.h');
  $('profileSecond').textContent = label;
  $('ovProfileSecond').textContent = label;
}

// Simple or advanced view: the advanced one also shows the model constants
function setPigMode(mode) {
  $('tab-pigment').dataset.pmode = mode;
  document.querySelectorAll('#pigMode [data-pmode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.pmode === mode)));
  drawSpacetime(); // the moment marker and the profile only exist in the advanced view
}
document.querySelectorAll('#pigMode [data-pmode]').forEach((b) => b.addEventListener('click', () => setPigMode(b.dataset.pmode)));

// Changing the model loads the constants of its reference preset: those of the
// other model make no sense here (e.g. without substrate production there is no pattern)
$('patternModel').addEventListener('change', (e) => {
  const { base, pigment, size, amount } = pattern;
  Object.assign(pattern, pickPattern(MODEL_DEFAULTS[e.target.value]), { base, pigment, size, amount });
  syncPatternControls();
  markPatternCustom();
  schedulePattern();
});

$('patternInsertion').addEventListener('change', (e) => {
  pattern.insertion = e.target.checked;
  markPatternCustom();
  schedulePattern();
});

$('patternSeed').addEventListener('change', (e) => {
  const v = Math.round(Math.min(99999, Math.max(1, parseFloat(e.target.value) || 1)));
  pattern.seed = v;
  e.target.value = v;
  schedulePattern();
});

$('newSeed').addEventListener('click', () => {
  pattern.seed = 1 + Math.floor(Math.random() * 99999);
  $('patternSeed').value = pattern.seed;
  schedulePattern();
});

for (const [id, key] of [['pigBase', 'base'], ['pigColor', 'pigment']]) {
  $(id).addEventListener('input', (e) => {
    pattern[key] = e.target.value;
    paintPattern(); // changing the colour does not require simulating again
    writeHash();
  });
}

$('pigTheory').addEventListener('click', () => openInfo('meinhardt'));
$('pigClear').addEventListener('click', () => setPatternOn(false));

$('savePattern').addEventListener('click', () => {
  if (patternValues) download(patternCanvas.toDataURL('image/png'), `meinhardt_${pattern.preset}_seed${pattern.seed}.png`);
});

// Shape | Pigment tabs. Entering Pigment switches the shell to solid, in a plain
// colour: the user picks the pattern in the gallery.
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
  applyMode,
  computePattern,
  controlsByKey,
  markDirty,
  pattern,
  presetSel,
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

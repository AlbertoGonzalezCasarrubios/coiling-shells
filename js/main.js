import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { buildShell } from './raup.js';
import { PRESETS, DEFAULT_PRESET } from './presets.js';
import { setLang, getLang, t, tParam, tPreset, applyStatic, GENERAL_TEX, DEFS_TEX, MIRROR_TEX } from './i18n.js';

// ---------------------------------------------------------------------------
// Definición de controles (los textos están en i18n.js)
// ---------------------------------------------------------------------------

const formatW = (v) => v.toFixed(v < 100 ? 2 : v < 1000 ? 1 : 0);

const RAUP_PARAMS = [
  { key: 'W', sym: 'W', min: 1, max: 10000, log: true, format: formatW, scale: ['1', '10⁴'] },
  { key: 'D', sym: 'D', min: 0, max: 0.9, step: 0.005, digits: 3 },
  { key: 'T', sym: 'T', min: 0, max: 10, step: 0.05, digits: 2 },
  { key: 'S', sym: 'S', min: 0.5, max: 2, step: 0.01, digits: 2 },
];

const GEO_PARAMS = [
  { key: 'turns', sym: 'N', min: 0.25, max: 20, step: 0.25, digits: 2 },
];

const VIS_PARAMS = [
  { key: 'spiralLines', min: 0, max: 48, step: 1, digits: 0 },
  { key: 'ringsPerTurn', min: 0, max: 72, step: 1, digits: 0 },
  { key: 'lineWidth', min: 0.5, max: 4, step: 0.1, digits: 1 },
  { key: 'lineOpacity', min: 0.1, max: 1, step: 0.05, digits: 2 },
];

const QUALITY = {
  low: { segPerTurn: 48, segPhi: 24 },
  medium: { segPerTurn: 96, segPhi: 48 },
  high: { segPerTurn: 160, segPhi: 72 },
};

const SHAPE_KEYS = ['W', 'D', 'T', 'S', 'turns', 'hand', 'mirror'];
const SHELL_SIZE = 4;
const MODES = ['lines', 'solid', 'both'];

const state = {
  ...pickShape(PRESETS[DEFAULT_PRESET]),
  grow: 1,
  quality: 'medium',
  mode: 'lines',
  spiralLines: 16,
  ringsPerTurn: 24,
  lineWidth: 1.2,
  lineOpacity: 0.9,
};

function pickShape(p) {
  return Object.fromEntries(SHAPE_KEYS.map((k) => [k, p[k]]));
}

// ---------------------------------------------------------------------------
// Estado compartible en la URL: #W=2.4&D=0.08&T=1.6&S=1&N=4.5&h=1&v=0&m=lines&l=en
// ---------------------------------------------------------------------------

const HASH_KEYS = { W: 'W', D: 'D', T: 'T', S: 'S', N: 'turns', h: 'hand' };

const fromHash = new URLSearchParams(location.hash.slice(1));
const hasHashShape = [...fromHash.keys()].some((k) => k in HASH_KEYS);
for (const [short, key] of Object.entries(HASH_KEYS)) {
  const v = parseFloat(fromHash.get(short));
  if (Number.isFinite(v)) state[key] = key === 'hand' ? Math.sign(v) || 1 : v;
}
if (fromHash.has('v')) state.mirror = fromHash.get('v') === '1';
if (MODES.includes(fromHash.get('m'))) state.mode = fromHash.get('m');

let storedLang = null;
try { storedLang = localStorage.getItem('raup-lang'); } catch { /* almacenamiento no disponible */ }
setLang(fromHash.get('l') || storedLang || 'en');

let hashTimer = 0;
function writeHash() {
  clearTimeout(hashTimer);
  hashTimer = setTimeout(() => {
    const q = new URLSearchParams();
    for (const [short, key] of Object.entries(HASH_KEYS)) q.set(short, String(+Number(state[key]).toFixed(3)));
    q.set('v', state.mirror ? '1' : '0');
    q.set('m', state.mode);
    q.set('l', getLang());
    history.replaceState(null, '', `#${q}`);
  }, 250);
}

// ---------------------------------------------------------------------------
// Escena
// ---------------------------------------------------------------------------

const $ = (id) => document.getElementById(id);
const viewport = $('viewport');

if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
  $('lineColor').value = '#d9d2c3';
  $('bgColor').value = '#14171c';
}

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.autoClear = false;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
viewport.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color($('bgColor').value);

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 200);
const CAMERA_HOME = new THREE.Vector3(6.2, 3.6, 7.4);
camera.position.copy(CAMERA_HOME);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 1.5;
controls.maxDistance = 40;
controls.autoRotateSpeed = 1.2;

scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7f70, 0.55));
const sun = new THREE.DirectionalLight(0xffffff, 2.2);
sun.position.set(4, 8, 5);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 0.5, far: 25 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.03;
scene.add(sun);
const fill = new THREE.DirectionalLight(0xdfe8ff, 0.5);
fill.position.set(-5, 2, -4);
scene.add(fill);

const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: 0.18 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Materiales
const solidMat = new THREE.MeshStandardMaterial({
  color: $('shellColor').value,
  roughness: 0.42,
  metalness: 0.0,
  envMapIntensity: 0.6,
  side: THREE.DoubleSide,
  vertexColors: true,
  // empuja la superficie hacia atrás para que las líneas queden por encima
  polygonOffset: true,
  polygonOffsetFactor: 1,
  polygonOffsetUnits: 1,
});

// Ocultador invisible: escribe profundidad pero no color → eliminación de líneas ocultas
const occluderMat = new THREE.MeshBasicMaterial({
  colorWrite: false,
  side: THREE.DoubleSide,
  polygonOffset: true,
  polygonOffsetFactor: 1,
  polygonOffsetUnits: 1,
});

// Líneas con grosor en píxeles (las líneas WebGL nativas siempre miden 1 px)
const lineMat = new LineMaterial({
  color: $('lineColor').value,
  linewidth: state.lineWidth,
  transparent: true,
  opacity: state.lineOpacity,
});

const axisMat = new THREE.LineDashedMaterial({ color: 0x2a9d8f, dashSize: 0.12, gapSize: 0.08 });

const solid = new THREE.Mesh(new THREE.BufferGeometry(), solidMat);
solid.castShadow = true;
solid.receiveShadow = true;
const occluder = new THREE.Mesh(solid.geometry, occluderMat);
occluder.renderOrder = 0;
const lines = new LineSegments2(new LineSegmentsGeometry(), lineMat);
lines.renderOrder = 1;
const axis = new THREE.Line(new THREE.BufferGeometry(), axisMat);
axis.visible = false;
scene.add(solid, occluder, lines, axis);

// ---------------------------------------------------------------------------
// Indicador de ejes x, y, z (sistema de la ecuación: z = eje de enrollamiento)
// ---------------------------------------------------------------------------

const gizmo = {
  scene: new THREE.Scene(),
  camera: new THREE.OrthographicCamera(-1.7, 1.7, 1.7, -1.7, 0.1, 10),
  size: 120,
  visible: true,
};

function makeLabel(text, color) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  ctx.font = 'italic 600 46px "Times New Roman", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, 32, 34);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, toneMapped: false, depthTest: false }));
  sprite.scale.setScalar(0.5);
  return sprite;
}

// Three.js: X = x, Y = z, Z = −y
for (const { label, dir, color } of [
  { label: 'x', dir: [1, 0, 0], color: '#e5534b' },
  { label: 'y', dir: [0, 0, -1], color: '#3fb950' },
  { label: 'z', dir: [0, 1, 0], color: '#4c8dff' },
]) {
  const v = new THREE.Vector3(...dir);
  const mat = new THREE.MeshBasicMaterial({ color, toneMapped: false });
  const arrow = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.78, 12), mat);
  shaft.position.y = 0.39;
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.28, 16), mat);
  head.position.y = 0.92;
  arrow.add(shaft, head);
  arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v);
  gizmo.scene.add(arrow);
  const sprite = makeLabel(label, color);
  sprite.position.copy(v).multiplyScalar(1.34);
  gizmo.scene.add(sprite);
}
gizmo.scene.add(new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 12), new THREE.MeshBasicMaterial({ color: 0x8a8f98, toneMapped: false })));

// ---------------------------------------------------------------------------
// Construcción de la malla
// ---------------------------------------------------------------------------

let lastBuild = null;

function rebuild() {
  const q = QUALITY[state.quality];
  // Con W alto casi toda la concha está en la última fracción de vuelta (bivalvos):
  // se densifica θ para que la malla y las líneas de crecimiento no queden escasas.
  const boost = Math.max(1, Math.log10(state.W));
  const shell = buildShell({
    ...state,
    segPhi: q.segPhi,
    segPerTurn: Math.round(q.segPerTurn * boost),
    ringsPerTurn: Math.round(state.ringsPerTurn * boost),
    size: SHELL_SIZE,
  });
  lastBuild = shell;

  const position = new THREE.BufferAttribute(shell.positions, 3);
  const meshGeo = new THREE.BufferGeometry();
  meshGeo.setAttribute('position', position);
  meshGeo.setAttribute('color', new THREE.BufferAttribute(shell.colors, 3));
  meshGeo.setIndex(new THREE.BufferAttribute(shell.indices, 1));
  meshGeo.computeVertexNormals();
  meshGeo.computeBoundingSphere();

  // LineSegmentsGeometry necesita pares de puntos explícitos
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
  lines.geometry = lineGeo;

  const { x, z, yTop, yBottom } = shell.axis;
  axis.geometry.dispose();
  axis.geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(x, yBottom - 0.4, z),
    new THREE.Vector3(x, yTop + 0.4, z),
  ]);
  axis.computeLineDistances();

  ground.position.y = yBottom - 0.002;

  updateHud();
  writeHash();
  scheduleFormula();
  drawMorpho();
}

function updateHud() {
  if (lastBuild) $('hud').textContent = t('hud.stats', lastBuild.stats.vertices, lastBuild.stats.triangles);
}

function applyMode() {
  const m = state.mode;
  solid.visible = m !== 'lines';
  lines.visible = m !== 'solid' && lines.geometry.attributes.instanceStart !== undefined;
  occluder.visible = m === 'lines' && $('hideHidden').checked;
  ground.visible = m !== 'lines';
  document.querySelectorAll('#mode button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === m)));
}

// ---------------------------------------------------------------------------
// Fórmulas (MathJax). Se componen solo cuando su panel está visible.
// ---------------------------------------------------------------------------

const formulaPanel = $('formula');
const formulaGeneral = $('formulaGeneral');
const formulaLive = $('formulaLive');
const infoDialog = $('info');
const infoBody = $('infoBody');

const mathJaxReady = new Promise((resolve) => {
  const check = () => {
    const s = window.MathJax && window.MathJax.startup;
    if (s && s.promise) s.promise.then(resolve);
    else setTimeout(check, 100);
  };
  check();
});
let mathQueue = mathJaxReady;

/** Encola la composición de `el`; `html` (función) se evalúa justo antes, con el estado más reciente. */
function typeset(el, html) {
  mathQueue = mathQueue
    .then(() => {
      const MJ = window.MathJax;
      MJ.typesetClear([el]);
      if (html) el.innerHTML = html();
      return MJ.typesetPromise([el]);
    })
    .catch((err) => console.warn('MathJax:', err));
}

const f = (v, d) => Number(v).toFixed(d);

function generalTeX() {
  return GENERAL_TEX + DEFS_TEX + (state.mirror ? MIRROR_TEX : '');
}

function liveTeX() {
  const { W, D, T, S, hand, turns } = state;
  const { rc, a, b } = lastBuild.derived;
  const R = `(${f(rc, 3)} + ${f(a, 3)}\\cos\\varphi)`;
  const zc = T * rc;
  const zTerm = zc === 0 ? `${f(b, 3)}\\sin\\varphi` : `-${f(zc, 3)} + ${f(b, 3)}\\sin\\varphi`;
  const ySign = hand > 0 ? '-' : ''; // ε = −1 dextral
  return (
    `\\[ W = ${formatW(W)},\\; D = ${f(D, 3)},\\; T = ${f(T, 2)},\\; S = ${f(S, 2)},\\; N = ${f(turns, 2)} \\]` +
    `\\[ r_c = ${f(rc, 3)},\\; a = ${f(a, 3)},\\; b = ${f(b, 3)},\\; \\varepsilon = ${hand > 0 ? '-1' : '+1'} \\]` +
    `\\[ \\mathbf{P}(\\theta,\\varphi) = ${formatW(W)}^{\\theta/2\\pi}` +
    `\\begin{pmatrix} ${R}\\cos\\theta \\\\ ${ySign}${R}\\sin\\theta \\\\ ${zTerm} \\end{pmatrix} \\]` +
    (state.mirror ? `\\[ \\mathbf{P}' = (x,\\,-y,\\,z) \\]` : '')
  );
}

let formulaTimer = 0;
let lastGeneral = '';
function scheduleFormula() {
  if (formulaPanel.hidden || !lastBuild) return;
  clearTimeout(formulaTimer);
  formulaTimer = setTimeout(() => {
    if (generalTeX() !== lastGeneral) {
      lastGeneral = generalTeX();
      typeset(formulaGeneral, generalTeX);
    }
    typeset(formulaLive, liveTeX);
  }, 80);
}

function setFormulaOpen(open) {
  formulaPanel.hidden = !open;
  $('toggleFormula').setAttribute('aria-pressed', String(open));
  if (open) {
    lastGeneral = '';
    typeset(formulaPanel.querySelector('[data-i18n="eq.chirality"]'));
    scheduleFormula();
  }
}

function openInfo() {
  if (!infoBody.dataset.typeset) {
    infoBody.dataset.typeset = '1';
    typeset(infoBody);
  }
  if (!infoDialog.open) infoDialog.showModal();
}

// ---------------------------------------------------------------------------
// Controles de la barra lateral
// ---------------------------------------------------------------------------

const controlsByKey = {};
let dirty = true;

function setFill(range) {
  const pct = ((range.value - range.min) / (range.max - range.min)) * 100;
  range.style.setProperty('--pct', `${pct}%`);
}

function createParam(def, container, { compact = false, onChange }) {
  const el = document.createElement('div');
  el.className = 'param' + (compact ? ' compact' : '');
  const id = `p-${def.key}`;
  const rMin = def.log ? Math.log10(def.min) : def.min;
  const rMax = def.log ? Math.log10(def.max) : def.max;
  const rStep = def.log ? 0.001 : def.step;
  const scale = def.scale || [def.min, def.max];
  el.innerHTML = `
    <div class="param-head">
      ${def.sym ? `<span class="param-sym">${def.sym}</span>` : ''}
      <label class="param-name" for="${id}"><strong></strong><small></small></label>
      <input class="num" type="number" min="${def.min}" max="${def.max}" step="${def.log ? 'any' : def.step}" />
    </div>
    <input id="${id}" type="range" min="${rMin}" max="${rMax}" step="${rStep}" />
    ${compact ? '' : `<div class="range-scale"><span>${scale[0]}</span><span>${scale[1]}</span></div>`}
  `;
  container.appendChild(el);

  const range = el.querySelector('input[type=range]');
  const num = el.querySelector('input[type=number]');
  const nameEl = el.querySelector('strong');
  const descEl = el.querySelector('small');
  const format = def.format || ((v) => f(v, def.digits));

  const set = (v, { fromNum = false } = {}) => {
    const clamped = Math.min(def.max, Math.max(def.min, v));
    state[def.key] = clamped;
    range.value = def.log ? Math.log10(clamped) : clamped;
    setFill(range);
    if (!fromNum) num.value = format(clamped);
  };

  range.addEventListener('input', () => {
    const r = parseFloat(range.value);
    set(def.log ? 10 ** r : r);
    onChange(def.key);
  });
  num.addEventListener('input', () => {
    const v = parseFloat(num.value);
    if (!Number.isFinite(v)) return;
    set(v, { fromNum: true });
    onChange(def.key);
  });
  num.addEventListener('change', () => set(state[def.key]));

  const relabel = () => {
    const tr = tParam(def.key);
    nameEl.textContent = tr.name || def.key;
    descEl.textContent = tr.desc || '';
    descEl.hidden = !tr.desc;
    num.setAttribute('aria-label', tr.name || def.key);
  };
  relabel();

  controlsByKey[def.key] = { set, relabel };
  set(state[def.key]);
}

function markCustom() {
  $('preset').value = 'custom';
}

function onShapeChange() {
  markCustom();
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

// Presets agrupados
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

presetSel.addEventListener('change', () => {
  const p = PRESETS[presetSel.value];
  if (!p) return;
  const shape = pickShape(p);
  for (const k of ['W', 'D', 'T', 'S', 'turns']) controlsByKey[k].set(shape[k]);
  state.hand = shape.hand;
  $('hand').value = String(shape.hand);
  setMirror(shape.mirror);
  dirty = true;
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
$('shellColor').addEventListener('input', (e) => solidMat.color.set(e.target.value));
$('bgColor').addEventListener('input', (e) => scene.background.set(e.target.value));
$('hideHidden').addEventListener('change', applyMode);
$('bands').addEventListener('change', (e) => {
  solidMat.vertexColors = e.target.checked;
  solidMat.needsUpdate = true;
});
$('showAxis').addEventListener('change', (e) => (axis.visible = e.target.checked));
$('autoRotate').addEventListener('change', (e) => (controls.autoRotate = e.target.checked));

$('toggleFormula').addEventListener('click', () => setFormulaOpen(formulaPanel.hidden));
$('closeFormula').addEventListener('click', () => setFormulaOpen(false));
$('openInfo').addEventListener('click', openInfo);
$('closeInfo').addEventListener('click', () => infoDialog.close());
infoDialog.addEventListener('click', (e) => {
  if (e.target === infoDialog) infoDialog.close(); // clic en el fondo
});

$('toggleAxes').addEventListener('click', (e) => {
  gizmo.visible = !gizmo.visible;
  e.currentTarget.setAttribute('aria-pressed', String(gizmo.visible));
});

// ---------------------------------------------------------------------------
// Animación de crecimiento: la apertura avanza desde el ápice
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
  // Mezcla de avance lineal en θ y lineal en tamaño, para que tanto las
  // espiras del ápice como la última vuelta (o una valva) se vean crecer.
  const lnW = Math.log(Math.max(state.W, 1.0001));
  const s0 = Math.exp(-state.turns * lnW);
  const bySize = 1 + Math.log(s0 + (1 - s0) * u) / (state.turns * lnW);
  state.grow = Math.max(0.004, 0.5 * u + 0.5 * bySize);
  dirty = true;
  if (u >= 1) stopGrow();
}

// ---------------------------------------------------------------------------
// Vistas estándar con transición suave
// ---------------------------------------------------------------------------

const VIEWS = {
  iso: () => CAMERA_HOME.clone(),
  apertural: () => new THREE.Vector3(0, 0, state.hand), // la apertura mira hacia +Z en dextrales
  dorsal: () => new THREE.Vector3(0, 0, -state.hand),
  apical: () => new THREE.Vector3(0, 1, 0.002),
  umbilical: () => new THREE.Vector3(0, -1, 0.002),
  profile: () => new THREE.Vector3(1, 0, 0),
};

let tween = null;
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);

function flyTo(name) {
  const offset = camera.position.clone().sub(controls.target);
  const dist = name === 'iso' ? CAMERA_HOME.length() : THREE.MathUtils.clamp(offset.length(), 7, 16);
  tween = {
    t0: performance.now(),
    dur: 700,
    fromDir: offset.clone().normalize(),
    fromLen: offset.length(),
    fromTarget: controls.target.clone(),
    rot: new THREE.Quaternion().setFromUnitVectors(offset.clone().normalize(), VIEWS[name]().normalize()),
    toLen: dist,
  };
  document.querySelectorAll('.views button').forEach((b) => b.classList.toggle('active', b.dataset.view === name));
}

function stepTween(now) {
  const u = Math.min(1, (now - tween.t0) / tween.dur);
  const e = easeInOut(u);
  const q = new THREE.Quaternion().slerpQuaternions(new THREE.Quaternion(), tween.rot, e);
  const dir = tween.fromDir.clone().applyQuaternion(q);
  const target = tween.fromTarget.clone().lerp(new THREE.Vector3(), e);
  camera.position.copy(target).addScaledVector(dir, THREE.MathUtils.lerp(tween.fromLen, tween.toLen, e));
  controls.target.copy(target);
  camera.lookAt(target);
  if (u >= 1) tween = null;
}

document.querySelectorAll('.views button').forEach((b) => b.addEventListener('click', () => flyTo(b.dataset.view)));
controls.addEventListener('start', () => {
  tween = null;
  document.querySelectorAll('.views button.active').forEach((b) => b.classList.remove('active'));
});

// ---------------------------------------------------------------------------
// Morfoespacio W – D (corte T = 0 de Raup)
// ---------------------------------------------------------------------------

const morpho = $('morpho');
const morphoDrawer = $('morphoDrawer');
const MORPHO = { l: 34, r: 10, t: 10, b: 26, h: 210, logMax: 4 };
const MORPHO_REGIONS = [
  { cx: 2.6, cy: 0.17, rx: 1.35, ry: 0.17, color: '#8a5cb8' },  // bivalvos y braquiópodos
  { cx: 0.45, cy: 0.14, rx: 0.42, ry: 0.14, color: '#3f7fbf' }, // gasterópodos
  { cx: 0.33, cy: 0.36, rx: 0.22, ry: 0.27, color: '#c77d2e' }, // ammonoideos
];

function morphoScales() {
  const w = morpho.clientWidth;
  const { l, r, t: top, b, h, logMax } = MORPHO;
  return {
    w,
    x: (lw) => l + (lw / logMax) * (w - l - r),
    y: (d) => top + (1 - d) * (h - top - b),
    inv: (px, py) => ({
      lw: ((px - l) / (w - l - r)) * logMax,
      d: 1 - (py - top) / (h - top - b),
    }),
  };
}

function drawMorpho() {
  if (!morphoDrawer.open) return;
  const dpr = Math.min(window.devicePixelRatio, 2);
  const { w, x, y } = morphoScales();
  if (!w) return;
  morpho.style.height = `${MORPHO.h}px`;
  morpho.width = w * dpr;
  morpho.height = MORPHO.h * dpr;
  const ctx = morpho.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const css = getComputedStyle(document.documentElement);
  const v = (name) => css.getPropertyValue(name).trim();
  const muted = v('--muted');
  const accent = v('--accent');

  ctx.fillStyle = v('--surface-2');
  ctx.fillRect(x(0), y(1), x(4) - x(0), y(0) - y(1));

  // Región por encima de D = 1/W: vueltas sin contacto (para T = 0)
  ctx.beginPath();
  ctx.moveTo(x(0), y(1));
  for (let lw = 0; lw <= 4.0001; lw += 0.02) ctx.lineTo(x(lw), y(10 ** -lw));
  ctx.lineTo(x(4), y(1));
  ctx.closePath();
  ctx.fillStyle = muted;
  ctx.globalAlpha = 0.08;
  ctx.fill();
  ctx.globalAlpha = 1;

  // Regiones ocupadas (aproximadas)
  for (const r of MORPHO_REGIONS) {
    ctx.beginPath();
    ctx.ellipse(x(r.cx), y(r.cy), x(r.cx + r.rx) - x(r.cx), y(r.cy) - y(r.cy + r.ry), 0, 0, Math.PI * 2);
    ctx.fillStyle = r.color;
    ctx.globalAlpha = 0.18;
    ctx.fill();
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = r.color;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.font = '500 10.5px Inter, system-ui, sans-serif';
  ctx.fillStyle = v('--text');
  ctx.textAlign = 'center';
  ctx.fillText(t('morpho.bivalves'), x(2.6), y(0.17) + 4);
  ctx.textAlign = 'left';
  ctx.fillText(t('morpho.gastropods'), x(0.9), y(0.06) + 4);
  ctx.fillText(t('morpho.ammonoids'), x(0.58), y(0.48) + 4);

  // Curva D = 1/W
  ctx.beginPath();
  for (let lw = 0; lw <= 4.0001; lw += 0.02) ctx[lw ? 'lineTo' : 'moveTo'](x(lw), y(10 ** -lw));
  ctx.setLineDash([4, 3]);
  ctx.strokeStyle = muted;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = muted;
  ctx.font = 'italic 11px "Times New Roman", serif';
  ctx.fillText(t('morpho.touch'), x(0.16), y(0.78));
  ctx.font = '10.5px Inter, system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(t('morpho.open'), x(3.95), y(0.9));

  // Ejes
  ctx.strokeStyle = v('--border');
  ctx.lineWidth = 1;
  ctx.strokeRect(x(0) + 0.5, y(1) + 0.5, x(4) - x(0), y(0) - y(1));
  ctx.fillStyle = muted;
  ctx.font = '10px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ['1', '10', '10²', '10³', '10⁴'].forEach((lab, i) => ctx.fillText(lab, x(i), y(0) + 14));
  ctx.textAlign = 'right';
  [0, 0.5, 1].forEach((d) => ctx.fillText(String(d), x(0) - 5, y(d) + 3));
  ctx.font = 'italic 13px "Times New Roman", serif';
  ctx.fillStyle = accent;
  ctx.fillText('W', x(4), y(0) + 24);
  ctx.textAlign = 'left';
  ctx.fillText('D', 4, y(1) + 10);

  // Concha actual
  ctx.beginPath();
  ctx.arc(x(Math.log10(Math.max(1, state.W))), y(state.D), 5.5, 0, Math.PI * 2);
  ctx.fillStyle = accent;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = v('--surface');
  ctx.stroke();
}

function pickMorpho(e) {
  const rect = morpho.getBoundingClientRect();
  const { lw, d } = morphoScales().inv(e.clientX - rect.left, e.clientY - rect.top);
  controlsByKey.W.set(10 ** THREE.MathUtils.clamp(lw, 0, 4));
  controlsByKey.D.set(d);
  onShapeChange();
}
morpho.addEventListener('pointerdown', (e) => {
  morpho.setPointerCapture(e.pointerId);
  pickMorpho(e);
});
morpho.addEventListener('pointermove', (e) => {
  if (morpho.hasPointerCapture(e.pointerId)) pickMorpho(e);
});
morphoDrawer.addEventListener('toggle', drawMorpho);

// ---------------------------------------------------------------------------
// Exportación
// ---------------------------------------------------------------------------

function download(href, name) {
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  a.click();
}

function fileStem() {
  return `raup_W${formatW(state.W)}_D${f(state.D, 3)}_T${f(state.T, 2)}_S${f(state.S, 2)}${state.mirror ? '_mirror' : ''}`;
}

$('savePng').addEventListener('click', () => {
  renderFrame();
  download(renderer.domElement.toDataURL('image/png'), `${fileStem()}.png`);
});

$('saveStl').addEventListener('click', () => {
  const mesh = new THREE.Mesh(solid.geometry);
  mesh.scale.setScalar(80 / SHELL_SIZE); // tamaño máximo 80 mm
  mesh.updateMatrixWorld();
  const data = new STLExporter().parse(mesh, { binary: true });
  const url = URL.createObjectURL(new Blob([data], { type: 'model/stl' }));
  download(url, `${fileStem()}.stl`);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

// ---------------------------------------------------------------------------
// Idioma
// ---------------------------------------------------------------------------

function applyLanguage(lang) {
  setLang(lang);
  try { localStorage.setItem('raup-lang', getLang()); } catch { /* almacenamiento no disponible */ }
  applyStatic();
  Object.values(controlsByKey).forEach((c) => c.relabel());
  buildPresetOptions();
  updateGrowButton();
  updateHud();
  drawMorpho();
  document.querySelectorAll('.lang button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === getLang())));
  // applyStatic reemplaza el HTML con TeX sin componer
  delete infoBody.dataset.typeset;
  if (infoDialog.open) openInfo();
  if (!formulaPanel.hidden) setFormulaOpen(true);
  writeHash();
}

document.querySelectorAll('.lang button').forEach((b) => b.addEventListener('click', () => applyLanguage(b.dataset.lang)));

// ---------------------------------------------------------------------------
// Bucle de render
// ---------------------------------------------------------------------------

function resize() {
  const { clientWidth: w, clientHeight: h } = viewport;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // En pantallas verticales se conserva el encuadre horizontal
  const fov = THREE.MathUtils.degToRad(35);
  camera.fov = camera.aspect >= 1 ? 35 : THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(fov / 2) / camera.aspect));
  camera.updateProjectionMatrix();
  lineMat.resolution.set(w, h);
}
new ResizeObserver(resize).observe(viewport);
resize();

function renderFrame() {
  const { clientWidth: w, clientHeight: h } = viewport;
  renderer.setScissorTest(false);
  renderer.setViewport(0, 0, w, h);
  renderer.clear();
  renderer.render(scene, camera);

  if (gizmo.visible) {
    const s = gizmo.size;
    const x = w - s - 8;
    const y = w < 760 ? 56 : 8; // por encima de la barra de vistas en pantallas estrechas
    gizmo.camera.position.copy(camera.position).sub(controls.target).setLength(4);
    gizmo.camera.quaternion.copy(camera.quaternion);
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

renderer.setAnimationLoop((now) => {
  if (growAnim) stepGrow(now);
  if (dirty) {
    dirty = false;
    rebuild();
    applyMode();
  }
  if (tween) stepTween(now);
  else controls.update();
  renderFrame();
});

$('loading').hidden = true;

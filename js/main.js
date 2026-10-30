import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildShell } from './raup.js';
import { PRESETS, DEFAULT_PRESET } from './presets.js';

// ---------------------------------------------------------------------------
// Definición de controles
// ---------------------------------------------------------------------------

const RAUP_PARAMS = [
  { key: 'W', sym: 'W', name: 'Expansión de la espiral', desc: 'Factor de crecimiento de la apertura por vuelta', min: 1.0, max: 10, step: 0.01, digits: 2 },
  { key: 'D', sym: 'D', name: 'Distancia al eje', desc: 'Tamaño del ombligo (r interno / r externo)', min: 0, max: 0.9, step: 0.005, digits: 3 },
  { key: 'T', sym: 'T', name: 'Traslación vertical', desc: 'Desplazamiento a lo largo del eje por unidad radial', min: 0, max: 10, step: 0.05, digits: 2 },
  { key: 'S', sym: 'S', name: 'Forma de la apertura', desc: 'Razón de semiejes de la elipse (axial / radial)', min: 0.5, max: 2, step: 0.01, digits: 2 },
];

const GEO_PARAMS = [
  { key: 'turns', sym: 'N', name: 'Número de vueltas', desc: 'Revoluciones desde el ápice hasta la apertura', min: 1, max: 20, step: 0.25, digits: 2 },
];

const VIS_PARAMS = [
  { key: 'spiralLines', name: 'Líneas espirales', min: 0, max: 48, step: 1, digits: 0 },
  { key: 'ringsPerTurn', name: 'Líneas de crecimiento / vuelta', min: 0, max: 72, step: 1, digits: 0 },
  { key: 'lineOpacity', name: 'Opacidad de líneas', min: 0.1, max: 1, step: 0.05, digits: 2 },
];

const QUALITY = {
  low: { segPerTurn: 48, segPhi: 24 },
  medium: { segPerTurn: 96, segPhi: 48 },
  high: { segPerTurn: 160, segPhi: 72 },
};

const SHELL_SIZE = 4;

const HASH_KEYS = { W: 'W', D: 'D', T: 'T', S: 'S', N: 'turns', h: 'hand' };
const MODES = ['lines', 'solid', 'both'];

const state = {
  ...pickShape(PRESETS[DEFAULT_PRESET]),
  quality: 'medium',
  mode: 'lines',
  spiralLines: 16,
  ringsPerTurn: 24,
  lineOpacity: 0.9,
};

// Lee el estado compartido en la URL, p. ej. #W=2.4&D=0.08&T=1.6&S=1&N=4.5&h=1&m=solid
const fromHash = new URLSearchParams(location.hash.slice(1));
const hasHashShape = [...fromHash.keys()].some((k) => k in HASH_KEYS);
for (const [short, key] of Object.entries(HASH_KEYS)) {
  const v = parseFloat(fromHash.get(short));
  if (Number.isFinite(v)) state[key] = key === 'hand' ? Math.sign(v) || 1 : v;
}
if (MODES.includes(fromHash.get('m'))) state.mode = fromHash.get('m');

let hashTimer = 0;
function writeHash() {
  clearTimeout(hashTimer);
  hashTimer = setTimeout(() => {
    const q = new URLSearchParams();
    for (const [short, key] of Object.entries(HASH_KEYS)) q.set(short, String(+Number(state[key]).toFixed(3)));
    q.set('m', state.mode);
    history.replaceState(null, '', `#${q}`);
  }, 250);
}

function pickShape(p) {
  const { W, D, T, S, turns, hand } = p;
  return { W, D, T, S, turns, hand };
}

// ---------------------------------------------------------------------------
// Escena
// ---------------------------------------------------------------------------

const $ = (id) => document.getElementById(id);
const viewport = $('viewport');

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
viewport.appendChild(renderer.domElement);

if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
  $('lineColor').value = '#d9d2c3';
  $('bgColor').value = '#14171c';
}

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

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(60, 60),
  new THREE.ShadowMaterial({ opacity: 0.18 })
);
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

const lineMat = new THREE.LineBasicMaterial({
  color: $('lineColor').value,
  transparent: true,
  opacity: state.lineOpacity,
});

const axisMat = new THREE.LineDashedMaterial({ color: 0x115e59, dashSize: 0.12, gapSize: 0.08 });

const solid = new THREE.Mesh(new THREE.BufferGeometry(), solidMat);
solid.castShadow = true;
solid.receiveShadow = true;
const occluder = new THREE.Mesh(solid.geometry, occluderMat);
occluder.renderOrder = 0;
const lines = new THREE.LineSegments(new THREE.BufferGeometry(), lineMat);
lines.renderOrder = 1;
const axis = new THREE.Line(new THREE.BufferGeometry(), axisMat);
axis.visible = false;
scene.add(solid, occluder, lines, axis);

let lastBuild = null;

function rebuild() {
  const q = QUALITY[state.quality];
  const shell = buildShell({ ...state, ...q, size: SHELL_SIZE });
  lastBuild = shell;

  const position = new THREE.BufferAttribute(shell.positions, 3);

  const meshGeo = new THREE.BufferGeometry();
  meshGeo.setAttribute('position', position);
  meshGeo.setAttribute('color', new THREE.BufferAttribute(shell.colors, 3));
  meshGeo.setIndex(new THREE.BufferAttribute(shell.indices, 1));
  meshGeo.computeVertexNormals();
  meshGeo.computeBoundingSphere();

  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', position);
  lineGeo.setIndex(new THREE.BufferAttribute(shell.lineIndices, 1));
  lineGeo.computeBoundingSphere();

  solid.geometry.dispose();
  lines.geometry.dispose();
  solid.geometry = meshGeo;
  occluder.geometry = meshGeo;
  lines.geometry = lineGeo;

  const { x, z, yTop, yBottom } = shell.axis;
  const pad = 0.4;
  axis.geometry.dispose();
  axis.geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(x, yBottom - pad, z),
    new THREE.Vector3(x, yTop + pad, z),
  ]);
  axis.computeLineDistances();

  ground.position.y = yBottom - 0.002;

  writeHash();
  $('hud').textContent =
    `${shell.stats.vertices.toLocaleString('es')} vértices · ${shell.stats.triangles.toLocaleString('es')} triángulos`;
  scheduleFormula();
}

function applyMode() {
  const m = state.mode;
  solid.visible = m !== 'lines';
  lines.visible = m !== 'solid';
  occluder.visible = m === 'lines' && $('hideHidden').checked;
  ground.visible = m !== 'lines';
  document.querySelectorAll('#mode button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === m)));
}

// ---------------------------------------------------------------------------
// Fórmula en vivo (MathJax)
// ---------------------------------------------------------------------------

const formulaLive = $('formulaLive');
const mathJaxReady = new Promise((resolve) => {
  const check = () => {
    const s = window.MathJax && window.MathJax.startup;
    if (s && s.promise) s.promise.then(resolve);
    else setTimeout(check, 100);
  };
  check();
});
let mathQueue = mathJaxReady;
let formulaTimer = 0;

const f = (v, d) => Number(v).toFixed(d);

function formulaTeX() {
  const { W, D, T, S, hand } = state;
  const { rc, a, b } = lastBuild.derived;
  const R = `(${f(rc, 3)} + ${f(a, 3)}\\cos\\varphi)`;
  const zc = T * rc;
  const zTerm = zc === 0 ? `${f(b, 3)}\\sin\\varphi` : `-${f(zc, 3)} + ${f(b, 3)}\\sin\\varphi`;
  const sinSign = hand < 0 ? '-' : '';
  return (
    `\\[ W = ${f(W, 2)},\\; D = ${f(D, 3)},\\; T = ${f(T, 2)},\\; S = ${f(S, 2)} \\]` +
    `\\[ r_c = ${f(rc, 3)},\\; a = ${f(a, 3)},\\; b = ${f(b, 3)},\\; \\theta \\in [-${f(state.turns * 2, 2)}\\pi,\\, 0] \\]` +
    `\\[ \\mathbf{P}(\\theta,\\varphi) = ${f(W, 2)}^{\\theta/2\\pi}` +
    `\\begin{pmatrix} ${R}\\cos\\theta \\\\ ${sinSign}${R}\\sin\\theta \\\\ ${zTerm} \\end{pmatrix} \\]`
  );
}

function scheduleFormula() {
  clearTimeout(formulaTimer);
  formulaTimer = setTimeout(() => {
    mathQueue = mathQueue
      .then(() => {
        const MJ = window.MathJax;
        MJ.typesetClear([formulaLive]);
        formulaLive.innerHTML = formulaTeX();
        return MJ.typesetPromise([formulaLive]);
      })
      .catch((err) => console.warn('MathJax:', err));
  }, 80);
}

// ---------------------------------------------------------------------------
// UI
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
  el.innerHTML = `
    <div class="param-head">
      ${def.sym ? `<span class="param-sym">${def.sym}</span>` : ''}
      <label class="param-name" for="${id}">
        <strong>${def.name}</strong>
        ${def.desc ? `<small>${def.desc}</small>` : ''}
      </label>
      <input class="num" type="number" min="${def.min}" max="${def.max}" step="${def.step}" aria-label="${def.name} (valor)" />
    </div>
    <input id="${id}" type="range" min="${def.min}" max="${def.max}" step="${def.step}" />
    ${compact ? '' : `<div class="range-scale"><span>${def.min}</span><span>${def.max}</span></div>`}
  `;
  container.appendChild(el);

  const range = el.querySelector('input[type=range]');
  const num = el.querySelector('input[type=number]');

  const set = (v, { fromNum = false } = {}) => {
    const clamped = Math.min(def.max, Math.max(def.min, v));
    state[def.key] = clamped;
    range.value = clamped;
    setFill(range);
    if (!fromNum) num.value = f(clamped, def.digits);
  };

  range.addEventListener('input', () => {
    set(parseFloat(range.value));
    onChange(def.key);
  });
  num.addEventListener('input', () => {
    const v = parseFloat(num.value);
    if (!Number.isFinite(v)) return;
    set(v, { fromNum: true });
    onChange(def.key);
  });
  num.addEventListener('change', () => set(state[def.key]));

  controlsByKey[def.key] = { set };
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
      else dirty = true;
    },
  })
);

// Presets
const presetSel = $('preset');
for (const [key, p] of Object.entries(PRESETS)) presetSel.add(new Option(p.name, key));
presetSel.add(new Option('Personalizado', 'custom'));
const matchingPreset = Object.keys(PRESETS).find((k) =>
  Object.entries(pickShape(PRESETS[k])).every(([key, v]) => Math.abs(state[key] - v) < 1e-6)
);
presetSel.value = matchingPreset || (hasHashShape ? 'custom' : DEFAULT_PRESET);
presetSel.addEventListener('change', () => {
  const p = PRESETS[presetSel.value];
  if (!p) return;
  const shape = pickShape(p);
  for (const k of ['W', 'D', 'T', 'S', 'turns']) controlsByKey[k].set(shape[k]);
  state.hand = shape.hand;
  $('hand').value = String(shape.hand);
  dirty = true;
});

$('hand').value = String(state.hand);
$('hand').addEventListener('change', (e) => {
  state.hand = Number(e.target.value);
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

$('resetCam').addEventListener('click', () => {
  camera.position.copy(CAMERA_HOME);
  controls.target.set(0, 0, 0);
  controls.update();
});

$('savePng').addEventListener('click', () => {
  renderer.render(scene, camera);
  const a = document.createElement('a');
  a.href = renderer.domElement.toDataURL('image/png');
  a.download = `concha-raup_W${f(state.W, 2)}_D${f(state.D, 3)}_T${f(state.T, 2)}_S${f(state.S, 2)}.png`;
  a.click();
});

$('toggleFormula').addEventListener('click', (e) => {
  const body = $('formulaBody');
  body.hidden = !body.hidden;
  e.target.textContent = body.hidden ? 'Mostrar' : 'Ocultar';
  e.target.setAttribute('aria-expanded', String(!body.hidden));
});

// ---------------------------------------------------------------------------
// Bucle de render
// ---------------------------------------------------------------------------

function resize() {
  const { clientWidth: w, clientHeight: h } = viewport;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(viewport);
resize();

applyMode();

renderer.setAnimationLoop(() => {
  if (dirty) {
    dirty = false;
    rebuild();
  }
  controls.update();
  renderer.render(scene, camera);
});

$('loading').hidden = true;

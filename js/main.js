import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { buildShell } from './raup.js';
import { buildPrintMesh, toSTL, to3MF } from './export3d.js';
import { PRESETS, DEFAULT_PRESET, PATTERN_PRESETS, DEFAULT_PATTERN, MODEL_REFERENCE } from './presets.js';
import { simulatePattern, PROFILE_WIDTH } from './meinhardt.js';
import {
  setLang, getLang, t, tParam, tPreset, tPattern, applyStatic,
  GENERAL_TEX, DEFS_TEX, MIRROR_TEX, AI_TEX, AS_TEX, GLOBAL_TEX,
} from './i18n.js';

// ---------------------------------------------------------------------------
// Definición de controles (los textos están en i18n.js)
// ---------------------------------------------------------------------------

const formatW = (v) => v.toFixed(v < 100 ? 2 : v < 1000 ? 1 : 0);

const RAUP_PARAMS = [
  // Escala lineal 1–10 (gasterópodos, cefalópodos) o logarítmica 1–10⁴ (bivalvos)
  { key: 'W', sym: 'W', min: 1, max: 10000, linMax: 10, step: 0.01, logToggle: true, format: formatW },
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
  axisWidth: 1,
};

function pickShape(p) {
  return Object.fromEntries(SHAPE_KEYS.map((k) => [k, p[k]]));
}

// ---------------------------------------------------------------------------
// Estado compartible en la URL: #W=2.4&D=0.08&T=1.6&S=1&N=4.5&h=1&v=0&m=lines
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

// La página abre siempre en inglés; el español se elige con el botón EN / ES
setLang('en');

let hashTimer = 0;
function writeHash() {
  clearTimeout(hashTimer);
  hashTimer = setTimeout(writeHashNow, 250);
}

function writeHashNow() {
  clearTimeout(hashTimer);
  const q = new URLSearchParams();
  for (const [short, key] of Object.entries(HASH_KEYS)) q.set(short, String(+Number(state[key]).toFixed(3)));
  q.set('v', state.mirror ? '1' : '0');
  q.set('m', state.mode);
  patternHash(q);
  history.replaceState(null, '', `#${q}`);
}

// ---------------------------------------------------------------------------
// Escena
// ---------------------------------------------------------------------------

const $ = (id) => document.getElementById(id);
const viewport = $('viewport');

const PALETTES = {
  light: { line: '#2b3a4a', shell: '#e8d3b0', bg: '#f4f0e6' }, // tinta sobre papel
  dark: { line: '#d8c08c', shell: '#e4cfae', bg: '#111821' },  // oro viejo sobre azul noche
};

function setPaletteInputs({ line, shell, bg }) {
  $('lineColor').value = line;
  $('shellColor').value = shell;
  $('bgColor').value = bg;
}
setPaletteInputs(PALETTES[window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light']);

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

// Eje discontinuo con grosor en píxeles (por defecto 1 px, como una línea WebGL normal)
const axisMat = new LineMaterial({ color: 0x2a9d8f, linewidth: state.axisWidth, dashed: true, dashSize: 0.12, gapSize: 0.08 });

solidMat.side = THREE.FrontSide; // exterior (las caras frontales miran hacia fuera)

// Interior de la concha: sin pigmento y con un ligero brillo nacarado
const innerMat = new THREE.MeshPhysicalMaterial({
  color: '#f3eee6',
  roughness: 0.28,
  metalness: 0,
  envMapIntensity: 0.8,
  iridescence: 0.35,
  iridescenceIOR: 1.3,
  iridescenceThicknessRange: [250, 500],
  side: THREE.BackSide,
  polygonOffset: true,
  polygonOffsetFactor: 1,
  polygonOffsetUnits: 1,
});

const solid = new THREE.Mesh(new THREE.BufferGeometry(), solidMat);
solid.castShadow = true;
solid.receiveShadow = true;
const inner = new THREE.Mesh(solid.geometry, innerMat);
inner.receiveShadow = true;
const occluder = new THREE.Mesh(solid.geometry, occluderMat);
occluder.renderOrder = 0;
const lines = new LineSegments2(new LineSegmentsGeometry(), lineMat);
lines.renderOrder = 1;
const axis = new Line2(new LineGeometry(), axisMat);
axis.visible = false;
scene.add(solid, inner, occluder, lines, axis);

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
  meshGeo.setAttribute('uv', new THREE.BufferAttribute(shell.uvs, 2));
  meshGeo.setIndex(new THREE.BufferAttribute(shell.indices, 1));
  meshGeo.computeVertexNormals();
  fixSeamNormals(meshGeo.attributes.normal.array, shell.grid);
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
  inner.geometry = meshGeo;
  lines.geometry = lineGeo;

  const { x, z, yTop, yBottom } = shell.axis;
  axis.geometry.dispose();
  axis.geometry = new LineGeometry().setPositions([x, yBottom - 0.4, z, x, yTop + 0.4, z]);
  axis.computeLineDistances();

  ground.position.y = yBottom - 0.002;

  writeHash();
  scheduleFormula();
  drawMorpho();
  onGeometryForPattern();
  if (stView === 'shell') drawSpacetime(); // sus proporciones dependen de la forma
}

/** La costura de la apertura tiene vértices duplicados: se promedian sus normales para que no se vea. */
function fixSeamNormals(n, { rows, cols, copies, count }) {
  for (let c = 0; c < copies; c++) {
    for (let r = 0; r < rows; r++) {
      const i0 = (c * count + r * cols) * 3;
      const i1 = i0 + (cols - 1) * 3;
      const x = n[i0] + n[i1], y = n[i0 + 1] + n[i1 + 1], z = n[i0 + 2] + n[i1 + 2];
      const len = Math.hypot(x, y, z) || 1;
      n[i0] = n[i1] = x / len;
      n[i0 + 1] = n[i1 + 1] = y / len;
      n[i0 + 2] = n[i1 + 2] = z / len;
    }
  }
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
/** Dos cifras significativas: para constantes que abarcan varios órdenes de magnitud. */
const sig = (v) => (v === 0 ? '0' : v >= 100 ? v.toFixed(0) : String(+Number(v).toPrecision(2)));

let formulaView = 'raup';

const SOURCE_TEX = String.raw`\[ s_i = r_a\,(1 + \sigma\,\xi_i),\quad \xi_i \in [-1,\,1],\quad x = 1,\dots,N \]`;

function generalTeX(view = formulaView) {
  if (view === 'meinhardt') {
    const isAS = pattern.model === 'AS';
    return (isAS ? AS_TEX : AI_TEX) + (isAS && pattern.globalCtl > 0 ? GLOBAL_TEX : '') + SOURCE_TEX;
  }
  return GENERAL_TEX + DEFS_TEX + (state.mirror ? MIRROR_TEX : '');
}

function meinhardtLiveTeX() {
  const { model, Da, D2, ra, r2, kappa, ba, b2, noise, globalCtl, T } = pattern;
  // Términos opcionales: se omiten cuando su coeficiente es 0
  const term = (sign, c, tex) => (c > 0 ? ` ${sign} ${sig(c)}${tex ? String.raw`\,${tex}` : ''}` : '');
  const lap = (v) => String.raw`\frac{\partial^2 ${v}}{\partial x^2}`;
  const sat = kappa > 0 ? String.raw`(1+${sig(kappa)}\,a^2)` : '';
  const basal = term('+', ba, '');
  let eqs;
  if (model === 'AS') {
    const prod = String.raw`s\,b\left(\frac{a^2}{${sat || '1'}}${basal}\right)`;
    eqs = String.raw`\begin{aligned}
      \frac{\partial a}{\partial t} &= ${prod} - ${sig(ra)}\,a${term('+', Da, lap('a'))} \\
      \frac{\partial b}{\partial t} &= ${sig(b2)} - ${prod}${term('-', r2, 'b')}${term('+', D2, lap('b'))}
    \end{aligned}`;
  } else {
    eqs = String.raw`\begin{aligned}
      \frac{\partial a}{\partial t} &= s\left(\frac{a^2}{h${sat ? String.raw`\,${sat}` : ''}}${basal}\right) - ${sig(ra)}\,a${term('+', Da, lap('a'))} \\
      \frac{\partial h}{\partial t} &= s\,a^2 - ${sig(r2)}\,h${term('+', D2, lap('h'))}${term('+', b2, '')}
    \end{aligned}`;
  }
  const global = model === 'AS' && globalCtl > 0 ? String.raw`\[ b_a^{\mathrm{ef}} = ${sig(ba)} + \frac{${sig(globalCtl)}}{1 + 40\,c} \]` : '';
  const cells = Math.round(PATTERN_CELLS / pattern.size);
  return String.raw`\[ ${eqs} \]` + global +
    String.raw`\[ s_i = ${sig(ra)}\,(1 \pm ${sig(noise)}),\quad N = ${cells},\quad T = ${Math.round(T)} \]`;
}

function liveTeX(view = formulaView) {
  if (view === 'meinhardt') return meinhardtLiveTeX();
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

function setFormulaView(view) {
  formulaView = view;
  document.querySelectorAll('#eqView [data-eq]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.eq === view)));
  const note = $('eqNote');
  note.dataset.i18n = view === 'meinhardt' ? 'eq.mein.note' : 'eq.chirality';
  note.textContent = t(note.dataset.i18n);
  if (!formulaPanel.hidden) {
    typeset(note);
    lastGeneral = '';
    scheduleFormula();
  }
}

function setFormulaOpen(open) {
  formulaPanel.hidden = !open;
  $('toggleFormula').setAttribute('aria-pressed', String(open));
  if (open) {
    // Desde la pestaña de pigmento se abren directamente las ecuaciones de Meinhardt
    setFormulaView($('tab-pigment').hidden ? formulaView : 'meinhardt');
  }
}

let infoPage = 'raup';

function showInfoPage(page) {
  infoPage = page;
  document.querySelectorAll('.info-tabs [data-page]').forEach((b) => {
    const on = b.dataset.page === page;
    b.setAttribute('aria-selected', String(on));
    b.tabIndex = on ? 0 : -1;
  });
  infoBody.querySelectorAll('.info-page').forEach((el) => {
    el.hidden = el.dataset.page !== page;
    // Cada página se compone con MathJax la primera vez que se muestra
    if (!el.hidden && !el.dataset.typeset) {
      el.dataset.typeset = '1';
      typeset(el);
    }
  });
  infoBody.scrollTop = 0;
}

function openInfo(page = infoPage) {
  showInfoPage(page);
  if (!infoDialog.open) infoDialog.showModal();
}

// ---------------------------------------------------------------------------
// Controles de la barra lateral
// ---------------------------------------------------------------------------

const controlsByKey = {};
let dirty = true;

/** Captura el puntero si sigue activo (un toque cancelado no se puede capturar). */
function capturePointer(el, e) {
  try {
    el.setPointerCapture(e.pointerId);
  } catch {
    /* sin captura: el arrastre funciona igual mientras el puntero esté encima */
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
      el.querySelector('.scale-min').textContent = def.min;
      el.querySelector('.scale-max').textContent = logScale ? '10⁴' : max;
    }
    scaleGroup?.querySelectorAll('button').forEach((b) =>
      b.setAttribute('aria-pressed', String((b.dataset.scale === 'log') === logScale))
    );
  };

  const set = (v, { fromNum = false, fitScale = false } = {}) => {
    // def.zero: por debajo del mínimo el valor es exactamente 0 (p. ej. sin difusión)
    const clamped = def.zero && v < def.min ? 0 : Math.min(def.max, Math.max(def.min, v));
    target[def.key] = clamped;
    // Al cargar un preset, se vuelve a la escala lineal si el valor cabe en ella
    if (fitScale && def.logToggle && logScale && clamped <= def.linMax) {
      logScale = false;
      applyScale();
    }
    // Un valor fuera del rango lineal (p. ej. un bivalvo) pasa a escala logarítmica
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
      // Se redondea a lo que se muestra, para que el valor visible sea el real
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

  // El símbolo y el nombre pueden depender del modelo (p. ej. D_h o D_b)
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
  for (const k of ['W', 'D', 'T', 'S', 'turns']) controlsByKey[k].set(shape[k], { fitScale: true });
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
  $('axis-params').hidden = !e.target.checked; // el grosor solo aparece con el eje visible
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
  if (e.target === infoDialog) infoDialog.close(); // clic en el fondo
});

// ---------------------------------------------------------------------------
// Pantalla completa y modo "solo la concha"
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

$('toggleFullscreen').hidden = !fsSupported; // p. ej. Safari en iPhone
$('toggleFullscreen').addEventListener('click', toggleFullscreen);
document.addEventListener('fullscreenchange', updateFullscreenButton);
document.addEventListener('webkitfullscreenchange', updateFullscreenButton);
$('hideInfo').addEventListener('click', () => setClean(true));
$('showInfo').addEventListener('click', () => setClean(false));

window.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey || infoDialog.open) return;
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
  apical: () => new THREE.Vector3(0, 1, 0.001),
  umbilical: () => new THREE.Vector3(0, -1, 0.001),
  profile: () => new THREE.Vector3(1, 0, 0),
};

let tween = null;
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);

function flyTo(name) {
  // Consume la inercia pendiente de OrbitControls para que no gire al acabar la transición
  controls.enableDamping = false;
  controls.update();
  controls.enableDamping = true;

  const offset = camera.position.clone().sub(controls.target);
  const dist = name === 'iso' ? CAMERA_HOME.length() : THREE.MathUtils.clamp(offset.length(), 7, 16);
  const from = new THREE.Spherical().setFromVector3(offset);
  const to = new THREE.Spherical().setFromVector3(VIEWS[name]().normalize().multiplyScalar(dist));
  // Acimut por el camino más corto
  let dTheta = to.theta - from.theta;
  dTheta = Math.atan2(Math.sin(dTheta), Math.cos(dTheta));
  tween = { t0: performance.now(), dur: 700, from, dTheta, to, fromTarget: controls.target.clone() };
  document.querySelectorAll('.views button').forEach((b) => b.classList.toggle('active', b.dataset.view === name));
}

function stepTween(now) {
  const u = Math.min(1, (now - tween.t0) / tween.dur);
  const e = easeInOut(u);
  const { from, to } = tween;
  // Interpolar acimut y elevación por separado mantiene la orientación continua
  // también al llegar a las vistas apical y umbilical (sobre el eje vertical).
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

document.querySelectorAll('.views button').forEach((b) => b.addEventListener('click', () => flyTo(b.dataset.view)));
controls.addEventListener('start', () => {
  tween = null;
  document.querySelectorAll('.views button.active').forEach((b) => b.classList.remove('active'));
});

// ---------------------------------------------------------------------------
// Morfoespacio W – D (corte T = 0 de Raup)
// ---------------------------------------------------------------------------

const morpho = $('morpho');
const morphoOv = $('morphoOv');
const morphoDrawer = $('morphoDrawer');
const MORPHO = { l: 34, r: 10, t: 10, b: 26, logMax: 4 };
// Escala del eje W: 1–10⁴ (todos los grupos) o 1–10 (caracoles y cefalópodos, con más detalle)
const MORPHO_TICKS = {
  4: [[0, '1'], [1, '10'], [2, '10²'], [3, '10³'], [4, '10⁴']],
  1: [[0, '1'], [Math.log10(2), '2'], [Math.log10(3), '3'], [Math.log10(5), '5'], [1, '10']],
};
// En el visor la altura se adapta al ancho del panel (más estrecho en móvil)
const morphoHeight = (canvas) => (canvas === morpho ? 210 : Math.round(THREE.MathUtils.clamp(canvas.clientWidth * 0.68, 130, 200)));
/**
 * Regiones ocupadas por cada grupo, en coordenadas (log10 W, D). Son aproximadas
 * (según Raup, 1966, 1967) y parten de D = 0, donde vive gran parte de las conchas
 * reales. El plano es un corte del cubo W–D–T de Raup: los grupos se separan sobre
 * todo por T, así que cada región indica el T con el que existe (`tOk`).
 * Al pinchar en su nombre se carga una concha típica del grupo (`preset`).
 */
const halfEllipse = (cx, rx, ry) =>
  Array.from({ length: 41 }, (_, i) => {
    const a = (Math.PI * i) / 40;
    return [cx + rx * Math.cos(a), ry * Math.sin(a)];
  });
const MORPHO_REGIONS = [
  {
    key: 'bivalves', preset: 'almeja', color: '#8a5cb8', tOk: (T) => T <= 1,
    poly: halfEllipse(2.8, 1.6, 0.3), label: [2.75, 0.13, 'center'],
  },
  {
    key: 'gastropods', preset: 'caracol', color: '#3f7fbf', tOk: () => true,
    poly: halfEllipse(0.3, 0.29, 0.42), label: [0.64, 0.4, 'left'], labelNear: [0.98, 0.5, 'right'],
  },
  {
    // Ammonoideos y nautiloideos: vueltas en contacto o solapadas (bajo D = 1/W)
    key: 'ammonoids', preset: 'ammonite', color: '#c77d2e', tOk: (T) => T <= 0.25,
    poly: (() => {
      const pts = [];
      for (let lw = 0.146; lw <= 0.6021; lw += 0.01) pts.push([lw, Math.min(1, 10 ** -lw + 0.02)]);
      for (let lw = 0.6021; lw >= 0.146; lw -= 0.01) pts.push([lw, Math.max(0, 10 ** -lw - 0.3)]);
      return pts;
    })(),
    label: [0.36, 0.66, 'left'], labelNear: [0.98, 0.3, 'right'],
  },
];

function morphoScales(canvas, size) {
  const w = size ? size.width : canvas.clientWidth;
  const h = size ? size.height : morphoHeight(canvas);
  const { l, r, t: top, b, logMax } = MORPHO;
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

/** Dibuja el morfoespacio en la barra lateral y en el visor 3D, si están visibles. */
function drawMorpho() {
  if (morphoDrawer.open) drawMorphoOn(morpho);
  if (!$('ovMorpho').hidden) drawMorphoOn(morphoOv);
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {object} [off] para dibujar fuera de pantalla (PDF): { width, height, scale, colors }
 */
function drawMorphoOn(canvas, off) {
  const dpr = off ? off.scale : Math.min(window.devicePixelRatio, 2);
  const h = off ? off.height : morphoHeight(canvas);
  if (!off) canvas.style.height = `${h}px`;
  const { w, x, y } = morphoScales(canvas, off);
  if (!w) return;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const css = getComputedStyle(document.documentElement);
  const v = (name) => off?.colors?.[name] ?? css.getPropertyValue(name).trim();
  const muted = v('--muted');
  const accent = v('--accent');

  ctx.fillStyle = v('--surface-2');
  const X1 = MORPHO.logMax;
  ctx.fillRect(x(0), y(1), x(X1) - x(0), y(0) - y(1));

  // Región por encima de D = 1/W: vueltas sin contacto (para T = 0)
  ctx.beginPath();
  ctx.moveTo(x(0), y(1));
  for (let lw = 0; lw <= X1 + 1e-4; lw += X1 / 200) ctx.lineTo(x(lw), y(10 ** -lw));
  ctx.lineTo(x(X1), y(1));
  ctx.closePath();
  ctx.fillStyle = muted;
  ctx.globalAlpha = 0.08;
  ctx.fill();
  ctx.globalAlpha = 1;

  // Regiones ocupadas (aproximadas), recortadas al marco. Las de grupos que no
  // existen con el T actual se dibujan atenuadas y con borde discontinuo.
  ctx.save();
  ctx.beginPath();
  ctx.rect(x(0), y(1), x(X1) - x(0), y(0) - y(1));
  ctx.clip();
  for (const r of MORPHO_REGIONS) {
    const ok = r.tOk(state.T);
    ctx.beginPath();
    r.poly.forEach(([lw, d], i) => ctx[i ? 'lineTo' : 'moveTo'](x(lw), y(d)));
    ctx.closePath();
    ctx.fillStyle = r.color;
    ctx.globalAlpha = ok ? 0.2 : 0.05;
    ctx.fill();
    ctx.globalAlpha = ok ? 0.75 : 0.35;
    ctx.setLineDash(ok ? [] : [3, 3]);
    ctx.strokeStyle = r.color;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
  ctx.setLineDash([]);
  // Nombres de los grupos: se pueden pinchar para cargar una concha típica
  ctx.font = '600 10.5px Inter, system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  canvas.labelBoxes = [];
  for (const r of MORPHO_REGIONS) {
    const pos = MORPHO.logMax === 4 ? r.label : r.labelNear;
    if (!pos) continue;
    const [lw, d, align] = pos;
    const text = t(`morpho.${r.key}`);
    const tw = ctx.measureText(text).width;
    const x0 = align === 'center' ? x(lw) - tw / 2 : align === 'right' ? x(lw) - tw : x(lw);
    ctx.textAlign = 'left';
    ctx.fillStyle = r.tOk(state.T) ? v('--text') : v('--muted');
    ctx.fillText(text, x0, y(d));
    ctx.fillRect(x0, y(d) + 7, tw, 1); // subrayado: es un enlace
    canvas.labelBoxes.push({ x0: x0 - 3, x1: x0 + tw + 3, y0: y(d) - 9, y1: y(d) + 10, preset: r.preset });
  }
  ctx.textBaseline = 'alphabetic';

  // Curva D = 1/W
  ctx.beginPath();
  for (let lw = 0; lw <= X1 + 1e-4; lw += X1 / 200) ctx[lw ? 'lineTo' : 'moveTo'](x(lw), y(10 ** -lw));
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
  ctx.fillText(t('morpho.open'), x(X1 * 0.9875), y(0.9));
  // El plano es un corte del cubo de Raup al T actual
  ctx.fillStyle = accent;
  ctx.font = '600 10.5px Inter, system-ui, sans-serif';
  ctx.fillText(t('morpho.section', f(state.T, 2)), x(X1 * 0.9875), y(0.78));

  // Ejes
  ctx.strokeStyle = v('--border');
  ctx.lineWidth = 1;
  ctx.strokeRect(x(0) + 0.5, y(1) + 0.5, x(X1) - x(0), y(0) - y(1));
  ctx.fillStyle = muted;
  ctx.font = '10px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  MORPHO_TICKS[X1].forEach(([lw, lab]) => ctx.fillText(lab, x(lw), y(0) + 14));
  ctx.textAlign = 'right';
  [0, 0.5, 1].forEach((d) => ctx.fillText(String(d), x(0) - 5, y(d) + 3));
  ctx.font = 'italic 13px "Times New Roman", serif';
  ctx.fillStyle = accent;
  ctx.fillText('W', x(X1), y(0) + 24);
  ctx.textAlign = 'left';
  ctx.fillText('D', 4, y(1) + 10);

  // Concha actual
  ctx.beginPath();
  ctx.arc(x(Math.min(X1, Math.log10(Math.max(1, state.W)))), y(state.D), 5.5, 0, Math.PI * 2);
  ctx.fillStyle = accent;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = v('--surface');
  ctx.stroke();
}

/** Nombre de grupo bajo el puntero, si lo hay. */
function morphoLabelAt(canvas, e) {
  const rect = canvas.getBoundingClientRect();
  const px = e.clientX - rect.left, py = e.clientY - rect.top;
  return (canvas.labelBoxes || []).find((b) => px >= b.x0 && px <= b.x1 && py >= b.y0 && py <= b.y1);
}

function pickMorpho(e) {
  const canvas = e.currentTarget;
  const rect = canvas.getBoundingClientRect();
  const { lw, d } = morphoScales(canvas).inv(e.clientX - rect.left, e.clientY - rect.top);
  controlsByKey.W.set(10 ** THREE.MathUtils.clamp(lw, 0, MORPHO.logMax));
  controlsByKey.D.set(d);
  onShapeChange();
}
for (const canvas of [morpho, morphoOv]) {
  canvas.addEventListener('pointerdown', (e) => {
    // Pinchar en el nombre de un grupo carga una concha típica (W, D, T, S y N a la vez)
    const label = morphoLabelAt(canvas, e);
    if (label) {
      presetSel.value = label.preset;
      presetSel.dispatchEvent(new Event('change'));
      return;
    }
    capturePointer(canvas, e);
    pickMorpho(e);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (canvas.hasPointerCapture(e.pointerId)) pickMorpho(e);
    else canvas.style.cursor = morphoLabelAt(canvas, e) ? 'pointer' : 'crosshair';
  });
}
morphoDrawer.addEventListener('toggle', drawMorpho);

// Escala del eje W (compartida por el panel lateral y el gráfico superpuesto)
function setMorphoScale(logMax) {
  MORPHO.logMax = logMax;
  document.querySelectorAll('[data-wscale]').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.wscale) === logMax)));
  drawMorpho();
}
document.querySelectorAll('[data-wscale]').forEach((b) => b.addEventListener('click', () => setMorphoScale(Number(b.dataset.wscale))));

// ---------------------------------------------------------------------------
// Exportación: ventana con imagen, lámina de vistas, PDF, impresión 3D y GLB
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

function fileStem() {
  const preset = PRESETS[presetSel.value] ? `${presetSel.value}_` : '';
  return `shell_${preset}W${formatW(state.W)}_D${f(state.D, 3)}_T${f(state.T, 2)}_S${f(state.S, 2)}${state.mirror ? '_mirror' : ''}`;
}

/** Nombre legible de la concha actual (el del preset o «personalizada»). */
function shellName() {
  return PRESETS[presetSel.value] ? tPreset(presetSel.value) : t('ex.customShell');
}

/** Ejecuta `fn` con el botón en estado «Preparando…» y avisa si falla. */
async function busy(btn, fn) {
  const label = btn.textContent;
  btn.disabled = true;
  btn.textContent = t('ex.working');
  await new Promise((r) => setTimeout(r, 30)); // deja pintar el estado
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

// --- Imagen de la vista actual, a la resolución elegida ---------------------

/**
 * Lo que se exporta respeta lo que el usuario ve: en modo «solo líneas» no se
 * incluye nada de color (ni patrón ni página de pigmentación), aunque haya un
 * patrón elegido en la pestaña de pigmento.
 */
const colourShown = () => state.mode !== 'lines' && pattern.on && !!patternValues;

/** Ejecuta `fn` con el eje de enrollamiento visible o no, según la casilla de la exportación. */
function withExportAxis(fn) {
  const prev = axis.visible;
  axis.visible = $('exAxis').checked;
  try {
    return fn();
  } finally {
    axis.visible = prev;
  }
}

function renderCurrentView(scaleFactor) {
  return withExportAxis(() => renderCurrentViewRaw(scaleFactor));
}

function renderCurrentViewRaw(scaleFactor) {
  const { clientWidth: w, clientHeight: h } = viewport;
  const prevPR = renderer.getPixelRatio();
  const pr = Math.min(prevPR * scaleFactor, 8192 / Math.max(w, h));
  renderer.setPixelRatio(pr);
  renderer.setSize(w, h, false);
  renderer.setViewport(0, 0, w, h);
  renderer.clear();
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL('image/png');
  renderer.setPixelRatio(prevPR);
  resize();
  return url;
}

// --- Lámina de vistas estándar (proyección ortográfica) ---------------------

const PLATE_VIEWS = ['apertural', 'dorsal', 'apical', 'umbilical', 'profile', 'iso'];

/** Cámara ortográfica encuadrada sobre la concha para una vista estándar. */
function plateCamera(name) {
  const dir = VIEWS[name]().normalize();
  const up = name === 'apical' || name === 'umbilical'
    ? new THREE.Vector3(0, 0, -state.hand) // la apertura queda abajo
    : new THREE.Vector3(0, 1, 0);           // el ápice queda arriba
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  cam.up.copy(up);
  cam.position.copy(dir).multiplyScalar(30);
  cam.lookAt(0, 0, 0);
  cam.updateMatrixWorld();
  // Encuadre ajustado: se proyectan los vértices sobre el plano de la cámara
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

const luminance = (hex) => {
  const [r, g, b] = hexRgb(hex).map((c) => c / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/**
 * Dibuja las seis vistas en una cuadrícula de 3 × 2.
 * @returns {HTMLCanvasElement}
 */
function renderPlate(opts) {
  return withExportAxis(() => renderPlateRaw(opts));
}

function renderPlateRaw({ tile = 640, background = '#ffffff', labels = true } = {}) {
  const cols = 3, rowsN = 2;
  const labelH = labels ? Math.round(tile * 0.1) : 0;
  const out = document.createElement('canvas');
  out.width = cols * tile;
  out.height = rowsN * (tile + labelH);
  const ctx = out.getContext('2d');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, out.width, out.height);

  const prev = {
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
  lineMat.resolution.set(720, 720); // grosor de línea parecido al de la pantalla
  axisMat.resolution.set(720, 720);

  const ink = luminance(background) > 0.5 ? '#1c2430' : '#e6e8eb';
  PLATE_VIEWS.forEach((name, k) => {
    const { cam, dir, up } = plateCamera(name);
    // Luz principal desde arriba a la izquierda del observador, en cada vista
    const right = new THREE.Vector3().crossVectors(up, dir).normalize();
    sun.position.copy(dir).multiplyScalar(0.7).addScaledVector(up, 0.6).addScaledVector(right, -0.5).normalize().multiplyScalar(10);
    renderer.clear();
    renderer.render(scene, cam);
    const x = (k % cols) * tile;
    const y = Math.floor(k / cols) * (tile + labelH);
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
  sun.position.copy(prev.sun);
  lineMat.resolution.copy(prev.res);
  axisMat.resolution.copy(prev.axisRes);
  renderer.setPixelRatio(prev.pr);
  resize();
  return out;
}

const plateBackground = () => ($('exBg').value === 'current' ? $('bgColor').value : '#ffffff');

function updatePlatePreview() {
  const c = renderPlate({ tile: 220, background: plateBackground(), labels: $('exLabels').checked });
  const img = $('exPlatePreview');
  img.src = c.toDataURL('image/png');
}

// --- Impresión 3D ------------------------------------------------------------

let printCache = { key: '', mesh: null };

function printOptions() {
  const size = THREE.MathUtils.clamp(parseFloat($('exSize').value) || 80, 20, 300);
  const wall = THREE.MathUtils.clamp(parseFloat($('exWall').value) || 1.2, 0.4, 6);
  return { size, wall };
}

function printMesh() {
  const { size, wall } = printOptions();
  const shape = pickShape(state);
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

// --- GLB con color -----------------------------------------------------------

async function exportGLB() {
  const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
  const group = new THREE.Group();
  // Líneas (modos «Líneas» y «Ambos»): segmentos simples con el color de las líneas
  if (state.mode !== 'solid' && lastBuild.lineIndices.length) {
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.BufferAttribute(lastBuild.positions.slice(), 3));
    lg.setIndex(new THREE.BufferAttribute(lastBuild.lineIndices.slice(), 1));
    const segs = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: lineMat.color.clone() }));
    segs.name = `${shellName()} (lines)`;
    group.add(segs);
  }
  // En modo «solo líneas» no se exporta la superficie: nada de color ni de patrón
  if (state.mode === 'lines') {
    const data = await new GLTFExporter().parseAsync(group, { binary: true });
    downloadBlob(data, 'model/gltf-binary', `${fileStem()}_lines.glb`);
    return;
  }
  const mat = solidMat.clone();
  mat.side = THREE.DoubleSide;
  mat.polygonOffset = false;
  // En glTF el color por vértice multiplica siempre la textura: solo se exporta si se usa
  const geo = solid.geometry.clone();
  if (!mat.vertexColors) geo.deleteAttribute('color');
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = shellName();
  group.add(mesh);
  const data = await new GLTFExporter().parseAsync(group, { binary: true });
  downloadBlob(data, 'model/gltf-binary', `${fileStem()}.glb`);
}

// --- PDF ---------------------------------------------------------------------

let jsPDFPromise = null;
function loadJsPDF() {
  jsPDFPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
    s.onload = () => resolve(window.jspdf.jsPDF);
    s.onerror = () => {
      jsPDFPromise = null;
      reject(new Error('jsPDF'));
    };
    document.head.append(s);
  });
  return jsPDFPromise;
}

const LIGHT_COLORS = {
  '--surface': '#ffffff', '--surface-2': '#f1eee6', '--border': '#e3ddd0',
  '--text': '#1c2430', '--muted': '#6b7280', '--accent': '#115e59',
};

/** Las fuentes estándar del PDF solo cubren Latin-1: se sustituyen flechas, rayas y letras griegas. */
function pdfSafe(text) {
  return String(text)
    .replace(/[–—−]/g, '-').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/…/g, '...')
    .replace(/←/g, '<-').replace(/→/g, '->').replace(/σ/g, 'sigma').replace(/κ/g, 'kappa')
    .replace(/θ/g, 'theta').replace(/φ/g, 'phi').replace(/≈/g, '~')
    .replace(/[^\x00-\xff]/g, '');
}

async function exportPDF() {
  const jsPDF = await loadJsPDF();
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  doc.setProperties({ title: pdfSafe(`${shellName()} - ${t('doc.title')}`), author: 'Alberto González Casarrubios', creator: pdfSafe(t('doc.title')) });
  const rawText = doc.text.bind(doc);
  doc.text = (s, ...rest) => rawText(Array.isArray(s) ? s.map(pdfSafe) : pdfSafe(s), ...rest);
  const M = 15, W = 210 - 2 * M;
  const lang = getLang();
  const dark = [28, 36, 48], muted = [107, 114, 128], accent = [17, 94, 89];

  const header = () => {
    doc.setFont('helvetica', 'normal').setFontSize(8.5).setTextColor(...muted);
    doc.text(t('doc.title'), M, 11);
    doc.text(new Date().toLocaleDateString(lang), 210 - M, 11, { align: 'right' });
    doc.setDrawColor(227, 221, 208).line(M, 13, 210 - M, 13);
  };
  const footer = () => {
    doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...muted);
    doc.text(t('ex.pdf.cite'), M, 284, { maxWidth: W - 30 });
    doc.text('CC BY-NC 4.0', 210 - M, 284, { align: 'right' });
  };
  const heading = (text, y, x = M) => {
    doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(...accent);
    doc.text(text.toUpperCase(), x, y);
  };
  const rowsTable = (rows, x, y, wName, wVal) => {
    doc.setFontSize(9.5);
    for (const [name, value] of rows) {
      doc.setFont('helvetica', 'normal').setTextColor(...dark);
      doc.text(name, x, y, { maxWidth: wName });
      doc.setFont('courier', 'bold');
      doc.text(String(value), x + wName + wVal, y, { align: 'right' });
      y += 5.6;
    }
    return y;
  };

  // Página 1: forma
  header();
  doc.setFont('helvetica', 'bold').setFontSize(17).setTextColor(...dark);
  doc.text(shellName(), M, 24);
  doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...muted);
  doc.text(`W = ${formatW(state.W)}   D = ${f(state.D, 3)}   T = ${f(state.T, 2)}   S = ${f(state.S, 2)}   N = ${f(state.turns, 2)}   ·   ${t(state.hand > 0 ? 'geo.dextral' : 'geo.sinistral')}`, M, 30.5);

  heading(t('ex.pdf.views'), 39);
  const plate = renderPlate({ tile: 560, background: '#ffffff', labels: true });
  const plateH = (W * plate.height) / plate.width;
  doc.addImage(plate.toDataURL('image/jpeg', 0.92), 'JPEG', M, 42, W, plateH);
  let y = 42 + plateH + 9;

  heading(t('ex.pdf.params'), y);
  const colW = 84;
  const { rc, a, b } = lastBuild.derived;
  let yL = rowsTable([
    [`W · ${tParam('W').name}`, formatW(state.W)],
    [`D · ${tParam('D').name}`, f(state.D, 3)],
    [`T · ${tParam('T').name}`, f(state.T, 2)],
    [`S · ${tParam('S').name}`, f(state.S, 2)],
    [`N · ${tParam('turns').name}`, f(state.turns, 2)],
    [t('geo.hand'), t(state.hand > 0 ? 'geo.dextral' : 'geo.sinistral')],
    [t('geo.mirror'), t(state.mirror ? 'ex.yes' : 'ex.no')],
  ], M, y + 6.5, colW - 24, 24);
  doc.setFont('helvetica', 'normal').setFontSize(8.5).setTextColor(...muted);
  doc.text(`${t('ex.pdf.derived')}: rc = ${f(rc, 3)}   a = ${f(a, 3)}   b = ${f(b, 3)}`, M, yL + 1.5);
  yL += 4;

  const mx = M + colW + 10, mw = W - colW - 10;
  heading(t('morpho.title'), y, mx);
  const mc = document.createElement('canvas');
  const mh = Math.round(mw * 0.68 * 4);
  drawMorphoOn(mc, { width: Math.round(mw * 4), height: mh, scale: 2, colors: LIGHT_COLORS });
  // drawMorphoOn usa píxeles CSS: se dibuja a 4 px por mm y escala 2
  doc.addImage(mc.toDataURL('image/png'), 'PNG', mx, y + 3, mw, mw * 0.68);
  y = Math.max(yL, y + 3 + mw * 0.68) + 8;

  // Enlace que reabre esta concha
  writeHashNow();
  doc.setFont('helvetica', 'normal').setFontSize(8.5).setTextColor(...muted);
  doc.text(t('ex.pdf.link'), M, y);
  doc.setTextColor(...accent);
  const url = location.href;
  const lines = doc.splitTextToSize(url, W);
  doc.textWithLink(lines[0] + (lines.length > 1 ? '...' : ''), M, y + 4.5, { url });
  footer();

  // Página 2: pigmentación (si hay patrón)
  if (colourShown()) {
    doc.addPage();
    header();
    doc.setFont('helvetica', 'bold').setFontSize(17).setTextColor(...dark);
    doc.text(t('ex.pdf.pattern'), M, 24);
    doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...muted);
    const pname = PATTERN_PRESETS[pattern.preset] ? tPattern(pattern.preset) : t('pig.custom');
    doc.text(`${pname}   ·   ${t(`pig.model.${pattern.model}`)}`, M, 30.5);

    // Registro espacio-tiempo con sus ejes
    heading(t('pig.spacetime'), 39);
    const ax = M + 7;               // deja sitio al eje vertical
    const stW = 64, stH = 118, stY = 51;
    const st = document.createElement('canvas');
    st.width = 512;
    st.height = Math.round((512 * stH) / stW);
    st.getContext('2d').drawImage(patternCanvas, 0, 0, st.width, st.height);
    doc.addImage(st.toDataURL('image/jpeg', 0.92), 'JPEG', ax, stY, stW, stH);
    doc.setDrawColor(227, 221, 208).setLineWidth(0.2).rect(ax, stY, stW, stH);

    const arrow = (x1, y1, x2, y2) => {
      doc.setDrawColor(...dark).setFillColor(...dark).setLineWidth(0.3);
      doc.line(x1, y1, x2, y2);
      const a = Math.atan2(y2 - y1, x2 - x1), L = 1.8, s = 0.8;
      doc.triangle(
        x2, y2,
        x2 - L * Math.cos(a) + s * Math.sin(a), y2 - L * Math.sin(a) - s * Math.cos(a),
        x2 - L * Math.cos(a) - s * Math.sin(a), y2 - L * Math.sin(a) + s * Math.cos(a), 'F');
    };
    // Eje horizontal: posición a lo largo del borde (el borde rodea la apertura)
    doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...dark);
    doc.text(t('ex.pdf.axis.x'), ax + stW / 2, 44.5, { align: 'center', maxWidth: stW + 6 });
    arrow(ax + stW / 2, 47.5, ax + stW, 47.5);
    arrow(ax + stW / 2, 47.5, ax, 47.5);
    // Eje vertical: tiempo, del ápice a la apertura
    arrow(M + 4.5, stY, M + 4.5, stY + stH);
    const tLabel = t('ex.pdf.axis.t');
    // Girado 90° en sentido horario: las letras quedan a la derecha del punto de anclaje
    doc.text(tLabel, M - 0.8, stY + stH / 2 - doc.getTextWidth(pdfSafe(tLabel)) / 2, { angle: -90 });
    doc.setFontSize(7).setTextColor(...muted);
    doc.text(t('ex.pdf.apex'), ax + stW + 1.5, stY + 2.5);
    doc.text(t('ex.pdf.aperture'), ax + stW + 1.5, stY + stH);
    // Instante del perfil, marcado sobre el registro
    const row = profileRow ?? PATTERN_ROWS - 1;
    const ry = stY + (stH * (row + 0.5)) / PATTERN_ROWS;
    doc.setDrawColor(...accent).setLineWidth(0.5).line(ax - 1, ry, ax + stW + 1, ry);
    doc.setFontSize(7.5).setTextColor(...muted);
    doc.text(t('ex.pdf.st.caption'), M, stY + stH + 5, { maxWidth: stW + 7 });

    // Concha pigmentada en vista apertural y 3/4
    const sx = M + 7 + stW + 17, sw = W - (sx - M);
    const two = renderPlateSubset(['apertural', 'iso'], 520);
    doc.addImage(two.toDataURL('image/jpeg', 0.92), 'JPEG', sx, 39, sw, sw / 2);

    // Perfil del borde: activador e inhibidor (o sustrato) en ese instante
    let yy = 39 + sw / 2 + 7;
    heading(t('pig.profile'), yy, sx);
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...muted);
    const atLines = doc.splitTextToSize(pdfSafe(t('ex.pdf.profile.at', Math.round((100 * row) / (PATTERN_ROWS - 1)))), sw);
    doc.text(atLines, sx, yy + 4.5);
    const ph = 36, py = yy + 4.5 + atLines.length * 3.4;
    const pc = document.createElement('canvas');
    drawProfileOn(pc, row, getComputedStyle(document.documentElement), { width: Math.round(sw * 4), height: ph * 4, scale: 2, colors: LIGHT_COLORS });
    doc.setFillColor(241, 238, 230).rect(sx, py, sw, ph, 'F');
    doc.addImage(pc.toDataURL('image/png'), 'PNG', sx, py, sw, ph);
    // Leyenda
    let lx = sx, ly = py + ph + 4.5;
    const legend = (label, color, dash, width) => {
      doc.setDrawColor(...color).setLineWidth(width).setLineDashPattern(dash, 0).line(lx, ly - 1, lx + 6, ly - 1);
      doc.setLineDashPattern([], 0);
      doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...dark);
      doc.text(label, lx + 7.5, ly);
      lx += 7.5 + doc.getTextWidth(pdfSafe(label)) + 5;
    };
    legend(t('pig.profile.a'), dark, [], 0.5);
    legend(t(pattern.model === 'AS' ? 'pig.profile.b' : 'pig.profile.h'), accent, [1.2, 0.8], 0.4);
    legend(t('pig.profile.threshold'), muted, [0.4, 0.6], 0.3);
    doc.setFontSize(7).setTextColor(...muted);
    doc.text(t('ex.pdf.profile.note'), sx, ly + 4, { maxWidth: sw });

    yy = ly + 13;
    heading(t('ex.pdf.constants'), yy, sx);
    const sym = { Da: 'Da', D2: pattern.model === 'AS' ? 'Db' : 'Dh', ra: 'ra', r2: pattern.model === 'AS' ? 'rb' : 'rh', kappa: 'kappa', ba: 'ba', b2: pattern.model === 'AS' ? 'bb' : 'bh', globalCtl: 'g' };
    const name = (k) => tParam(k === 'D2' || k === 'r2' || k === 'b2' ? `${k}.${pattern.model}` : k).name;
    const rows = Object.keys(sym)
      .filter((k) => k !== 'globalCtl' || pattern.model === 'AS')
      .map((k) => [`${sym[k]} · ${name(k)}`, sig(pattern[k])]);
    rows.push(
      [`N · ${t('ex.pdf.cells')}`, Math.round(PATTERN_CELLS / pattern.size)],
      [`T · ${tParam('pT').name}`, Math.round(pattern.T)],
      [`σ · ${tParam('pNoise').name}`, f(pattern.noise, 2)],
      [tParam('pAmount').name, f(pattern.amount, 2)],
      [t('pig.insertion'), t(pattern.insertion ? 'ex.yes' : 'ex.no')],
      [t('pig.seed'), pattern.seed],
    );
    rowsTable(rows, sx, yy + 6.5, sw - 22, 22);
    footer();
  }

  // Página de ecuaciones (opcional): forma general y con los valores actuales
  if ($('exEq').checked) {
    doc.addPage();
    header();
    doc.setFont('helvetica', 'bold').setFontSize(17).setTextColor(...dark);
    doc.text(t('ex.pdf.eq'), M, 24);
    let y = 34;
    let MJ = null;
    try {
      MJ = await loadSvgMath();
    } catch (err) {
      console.warn(err);
    }
    if (!MJ) {
      doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...muted);
      doc.text(t('ex.pdf.eq.fail'), M, y, { maxWidth: W });
    } else {
      const blocks = [[t('ex.pdf.eq.raup'), 'raup', t('ex.pdf.eq.noteRaup')]];
      if (colourShown()) blocks.push([t('ex.pdf.eq.mein'), 'meinhardt', t('eq.mein.note')]);
      const EX_MM = 1.7;
      const newPageIfNeeded = (h) => {
        if (y + h <= 278) return;
        footer();
        doc.addPage();
        header();
        y = 22;
      };
      for (const [title, view, note] of blocks) {
        newPageIfNeeded(20);
        heading(title, y);
        y += 6;
        for (const [sub, tex] of [[t('eq.general'), generalTeX(view)], [t('eq.live'), liveTeX(view)]]) {
          newPageIfNeeded(14);
          doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(...dark);
          doc.text(sub, M, y);
          y += 3;
          for (const piece of displayPieces(tex)) {
            const img = await texToImage(MJ, piece, EX_MM * 12);
            let w = img.wEx * EX_MM, h = img.hEx * EX_MM;
            if (w > W - 6) { h *= (W - 6) / w; w = W - 6; }
            newPageIfNeeded(h + 2);
            doc.addImage(img.url, 'PNG', M + 4, y, w, h);
            y += h + 2.5;
          }
          y += 3;
        }
        doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...muted);
        const lines = doc.splitTextToSize(pdfSafe(note), W);
        newPageIfNeeded(lines.length * 3.6);
        doc.text(lines, M, y);
        y += lines.length * 3.6 + 9;
      }
    }
    footer();
  }

  doc.save(`${fileStem()}.pdf`);
}

/** Separa un bloque TeX con varias fórmulas \[ … \] en sus piezas. */
function displayPieces(tex) {
  return [...tex.matchAll(/\\\[([\s\S]*?)\\\]/g)].map((m) => m[1].trim());
}

// MathJax con salida SVG en un iframe aparte (la página usa la salida CHTML, que no
// se puede convertir en imagen); se carga solo al exportar las ecuaciones
let svgMathPromise = null;
function loadSvgMath() {
  svgMathPromise ??= new Promise((resolve, reject) => {
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = 'position:fixed;left:-9999px;width:10px;height:10px;border:0;visibility:hidden';
    frame.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><script>window.MathJax={svg:{fontCache:'none'},startup:{typeset:false}};<\/script><script src="https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-svg.js"><\/script></head><body></body></html>`;
    const t0 = performance.now();
    const wait = () => {
      const MJ = frame.contentWindow?.MathJax;
      if (MJ?.startup?.promise && MJ.tex2svgPromise) MJ.startup.promise.then(() => resolve(MJ), reject);
      else if (performance.now() - t0 > 20000) reject(new Error('MathJax SVG'));
      else setTimeout(wait, 100);
    };
    frame.onload = wait;
    document.body.append(frame);
  }).catch((err) => {
    svgMathPromise = null;
    throw err;
  });
  return svgMathPromise;
}

/** Compone una fórmula en SVG y la pasa a PNG. Devuelve también su tamaño en ex. */
async function texToImage(MJ, tex, exPx) {
  const node = await MJ.tex2svgPromise(tex, { display: true });
  const svg = node.querySelector('svg');
  const wEx = parseFloat(svg.getAttribute('width'));
  const hEx = parseFloat(svg.getAttribute('height'));
  svg.setAttribute('width', `${wEx * exPx}px`);
  svg.setAttribute('height', `${hEx * exPx}px`);
  svg.setAttribute('style', 'color:#1c2430');
  if (!svg.getAttribute('xmlns')) svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const xml = new XMLSerializer().serializeToString(svg);
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = Math.ceil(wEx * exPx);
  c.height = Math.ceil(hEx * exPx);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return { url: c.toDataURL('image/png'), wEx, hEx };
}

/** Algunas vistas de la lámina, en una fila (para la página del patrón). */
function renderPlateSubset(names, tile) {
  const saved = PLATE_VIEWS.slice();
  PLATE_VIEWS.splice(0, PLATE_VIEWS.length, ...names);
  try {
    const full = renderPlate({ tile, background: '#ffffff', labels: true });
    const out = document.createElement('canvas');
    out.width = names.length * tile;
    out.height = full.height / 2;
    out.getContext('2d').drawImage(full, 0, 0);
    return out;
  } finally {
    PLATE_VIEWS.splice(0, PLATE_VIEWS.length, ...saved);
  }
}

// --- Ventana ------------------------------------------------------------------

function openExport() {
  // Por defecto, el eje se exporta si está visible en la vista 3D
  $('exAxis').checked = $('showAxis').checked;
  $('exLinesNote').hidden = state.mode !== 'lines';
  $('exPatternCard').classList.toggle('disabled', !(pattern.on && patternValues));
  $('exPattern').disabled = !(pattern.on && patternValues);
  $('exPatternNone').hidden = pattern.on && !!patternValues;
  if (!exportDlg.open) exportDlg.showModal();
  updatePrintDims();
  requestAnimationFrame(updatePlatePreview);
}

$('openExport').addEventListener('click', openExport);
$('closeExport').addEventListener('click', () => exportDlg.close());
exportDlg.addEventListener('click', (e) => {
  if (e.target === exportDlg) exportDlg.close();
});
$('exBg').addEventListener('change', updatePlatePreview);
$('exAxis').addEventListener('change', updatePlatePreview);
$('exLabels').addEventListener('change', updatePlatePreview);
for (const id of ['exSize', 'exWall']) $(id).addEventListener('input', updatePrintDims);

$('exPng').addEventListener('click', (e) => busy(e.currentTarget, () => {
  download(renderCurrentView(parseFloat($('exRes').value)), `${fileStem()}.png`);
}));
$('exPlate').addEventListener('click', (e) => busy(e.currentTarget, () => {
  const c = renderPlate({ tile: 900, background: plateBackground(), labels: $('exLabels').checked });
  download(c.toDataURL('image/png'), `${fileStem()}_views.png`);
}));
$('exPdf').addEventListener('click', (e) => busy(e.currentTarget, exportPDF));
$('exStl').addEventListener('click', (e) => busy(e.currentTarget, () => {
  downloadBlob(toSTL(printMesh(), shellName()), 'model/stl', `${fileStem()}_${printOptions().size}mm.stl`);
}));
$('ex3mf').addEventListener('click', (e) => busy(e.currentTarget, async () => {
  downloadBlob(await to3MF(printMesh(), shellName()), 'model/3mf', `${fileStem()}_${printOptions().size}mm.3mf`);
}));
$('exGlb').addEventListener('click', (e) => busy(e.currentTarget, exportGLB));
$('exPattern').addEventListener('click', () => {
  if (patternValues) download(patternCanvas.toDataURL('image/png'), `meinhardt_${pattern.preset}_seed${pattern.seed}.png`);
});

// ---------------------------------------------------------------------------
// Pigmentación (modelos de reacción-difusión de Meinhardt)
// ---------------------------------------------------------------------------

const PATTERN_ROWS = 2048;   // filas del registro espacio-tiempo (ápice → apertura)
const PATTERN_WIDTH = 1024;  // columnas de la textura (vuelta completa a la apertura)
const PATTERN_CELLS = 256;   // células del borde en la apertura (tamaño ×1)
// Semiancho del umbral de pigmentación: el pigmento se deposita donde el activador
// supera un umbral, como en las simulaciones de Meinhardt, con bordes nítidos
const PIGMENT_EDGE = 0.12;
const THUMB = { rows: 144, width: 256 }; // las líneas de una célula no deben perderse al reducir

const PATTERN_KEYS = ['model', 'Da', 'D2', 'ra', 'r2', 'kappa', 'ba', 'b2', 'noise', 'globalCtl', 'T', 'insertion', 'base', 'pigment', 'size', 'amount'];
const PATTERN_DEFAULTS = { size: 1, amount: 0.5 };

const pickPattern = (p) => Object.fromEntries(PATTERN_KEYS.map((k) => [k, p[k] ?? PATTERN_DEFAULTS[k]]));

const pattern = { on: false, preset: DEFAULT_PATTERN, seed: 7, ...pickPattern(PATTERN_PRESETS[DEFAULT_PATTERN]) };
let patternState = 'pattern'; // 'pattern' | 'uniform' | 'extinct'

// Estado del patrón en la URL: pg=1 y los parámetros con prefijo p
const PATTERN_HASH = { pm: 'model', pDa: 'Da', pD2: 'D2', pra: 'ra', pr2: 'r2', pk: 'kappa', pba: 'ba', pb2: 'b2', pn: 'noise', pgc: 'globalCtl', pT: 'T', ps: 'seed', pz: 'size', pa: 'amount' };
if (fromHash.get('pg') === '1') {
  pattern.on = true;
  pattern.preset = PATTERN_PRESETS[fromHash.get('pp')] ? fromHash.get('pp') : 'custom';
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

// Textura y lienzo con el registro espacio-tiempo (fila 0 = ápice, como v = 0 en la malla)
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
let patternSecond = null; // inhibidor o sustrato (rows × PROFILE_WIDTH), relativo a su máximo
let profileRow = null;    // instante elegido para el perfil (null = la apertura)
const profileCanvas = $('profile');

function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Convierte el activador (0–1) en color: pigmento donde supera el umbral, con una
 * transición corta (smoothstep) para que los bordes sean nítidos sin dientes.
 * La cantidad de pigmento desplaza el umbral.
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
// Dos formas de dibujar el registro:
// - «En el tiempo» (diagrama de Meinhardt): cada fila es el mismo intervalo de
//   tiempo y cada vuelta ocupa la misma altura; el borde se normaliza a lo ancho.
// - «Concha desenrollada»: cada fila mide lo que el borde en ese instante y tiene
//   la altura del crecimiento que registra. En una espiral logarítmica el tamaño
//   g = W^(θ/2π) crece a la vez que la distancia recorrida desde el ápice (∝ g),
//   así que la superficie desenrollada es un abanico de lados rectos que se abre
//   desde el ápice, con la proporción alto/ancho de la concha.
// ---------------------------------------------------------------------------

let stView = 'time';
let stRect = { ox: 0, oy: 0, dw: 1, dh: 1 }; // zona dibujada, en píxeles CSS
let patternVersion = 0;
let unrolledCache = { key: '', canvas: null };

/** Proporción de la concha desenrollada y tamaño relativo del ápice (g0). */
function unrolledGeometry() {
  const W = Math.max(state.W, 1.0001), N = state.turns;
  const k = Math.log(W) / (2 * Math.PI);
  const rc = (1 + state.D) / 2, a = (1 - state.D) / 2, b = state.S * a;
  // Perímetro de la apertura (aproximación de Ramanujan) y avance de su centro por radián
  const P = Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
  const v = rc * Math.sqrt(1 + k * k * (1 + state.T * state.T));
  const g0 = Math.exp(-2 * Math.PI * N * k);
  return { k, N, g0, aspect: (v * (1 - g0)) / (k * P) };
}

/** Fila del registro → posición vertical (0 = ápice, 1 = apertura) en la vista actual. */
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

/** Imagen de la concha desenrollada (se promedian las columnas que cubre cada píxel). */
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
      out[di + 3] = 255 * Math.min(1, (u1 - u0) * rw); // borde del abanico suavizado
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
  // Altura del lienzo: fija en la vista temporal; con la proporción real en la desenrollada
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
  // El perfil se dibuja aunque la pestaña esté oculta: también se ve sobre el visor 3D
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
  // En la vista avanzada se marca el instante del perfil
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
 * Perfil a lo largo del borde en un instante: activador y segunda sustancia
 * (inhibidor o sustrato), cada una relativa a su máximo, y el umbral de pigmento.
 */
function drawProfile() {
  const row = profileRow ?? PATTERN_ROWS - 1;
  const label = `${t('pig.profile.time')} ${Math.round((100 * row) / (PATTERN_ROWS - 1))} %`;
  const css = getComputedStyle(document.documentElement);
  const accent = css.getPropertyValue('--accent').trim();
  // El activador va en el color del texto (se lee con cualquier pigmento y tema); la zona pigmentada, en el del pigmento
  document.querySelectorAll('.lg-a').forEach((el) => el.style.setProperty('--lg', css.getPropertyValue('--text').trim()));
  document.querySelectorAll('.lg-b').forEach((el) => el.style.setProperty('--lg', accent));
  $('profileTime').textContent = label;
  drawProfileOn(profileCanvas, row, css);

  // Versión superpuesta en el visor 3D: solo tiene sentido con un patrón aplicado
  if ($('ovProfile').hidden) return;
  const has = pattern.on && !!patternValues;
  $('ovProfileBody').hidden = !has;
  $('ovProfileEmpty').hidden = has;
  $('ovProfileTime').textContent = has ? label : '';
  $('ovProfileRow').value = Math.round((1000 * row) / (PATTERN_ROWS - 1));
  setFill($('ovProfileRow'));
  if (has) drawProfileOn($('profileOv'), row, css);
}

/** @param {object} [off] para dibujar fuera de pantalla (PDF): { width, height, scale, colors } */
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

  // Zona pigmentada: activador por encima del umbral
  ctx.fillStyle = pattern.pigment;
  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.moveTo(0, y(threshold));
  for (let k = 0; k < PROFILE_WIDTH; k++) ctx.lineTo(x(k), y(Math.max(threshold, aAt(k))));
  ctx.lineTo(w, y(threshold));
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  // Umbral de pigmento
  ctx.setLineDash([2, 3]);
  ctx.strokeStyle = col('--muted');
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, y(threshold));
  ctx.lineTo(w, y(threshold));
  ctx.stroke();

  // Segunda sustancia (discontinua) y activador
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

// El instante también se elige con el slider del perfil superpuesto
$('ovProfileRow').addEventListener('input', (e) => {
  profileRow = Math.round((e.target.value / 1000) * (PATTERN_ROWS - 1));
  drawSpacetime();
});

// Elegir el instante del perfil sobre el registro espacio-tiempo (vista avanzada)
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

/** Si con los valores actuales no se forma patrón, se explica en lugar de mostrar un blanco mudo. */
function updatePatternMessage() {
  const msg = $('patternMsg');
  msg.hidden = patternState === 'pattern';
  if (!msg.hidden) msg.textContent = t(`pig.state.${patternState}`);
}

/** Color sólido o patrón, según la opción elegida. */
function applyShellMaterial() {
  const withPattern = pattern.on && !!patternValues;
  solidMat.map = withPattern ? patternTex : null;
  solidMat.color.set(withPattern ? '#ffffff' : $('shellColor').value);
  solidMat.vertexColors = !withPattern && $('bands').checked;
  solidMat.needsUpdate = true;
  // El interior, más claro que el color de fondo del exterior
  innerMat.color.set(withPattern ? pattern.base : $('shellColor').value).lerp(new THREE.Color('#ffffff'), 0.55);
  const swatch = document.querySelector('.pattern-card[data-pattern="none"] .swatch');
  if (swatch) swatch.style.background = $('shellColor').value;
}

// Cálculo en un Web Worker; si no está disponible, en el hilo principal.
// Si llega un cálculo nuevo mientras otro sigue en marcha, se descarta el worker
// ocupado en lugar de esperar: al arrastrar un slider solo importa el último valor.
let patternWorker = null;
let workerBusy = false;
let workerFailed = false;
const workerUrl = new URL('./pigment-worker.js', import.meta.url);

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

/** Parámetros de simulación a partir del estado (el control global solo existe con sustrato). */
function simParams(p) {
  const { model, Da, D2, ra, r2, kappa, ba, b2, noise, globalCtl, T, seed, insertion } = p;
  return { model, Da, D2, ra, r2, kappa, ba, b2, noise, globalCtl: model === 'AS' ? globalCtl : 0, T, seed, insertion };
}

function computePattern() {
  const id = ++patternJob;
  const p = simParams(pattern);
  // El tamaño del patrón es el número de células del borde (menos células, elementos mayores)
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
  if (id !== patternJob) return; // llegó un cálculo antiguo
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

// Con inserción de células el patrón depende del tamaño de cada vuelta (W y N)
function onGeometryForPattern() {
  if (pattern.insertion && pattern.on && patternGeomKey !== `${state.W}|${state.turns}`) schedulePattern();
}

// Controles. Las magnitudes intuitivas (tamaño, tiempo, irregularidad, cantidad)
// están en las dos vistas; las constantes del modelo, solo en la avanzada.
const sub = (x, y) => `${x}<sub>${y}</sub>`;
const second = () => (pattern.model === 'AS' ? 'b' : 'h');
const PIG_SIMPLE = [
  { key: 'size', id: 'pSize', i18n: 'pSize', log: true, min: 0.5, max: 4, digits: 2 },
  { key: 'T', id: 'pT', i18n: 'pT', log: true, min: 500, max: 12000, format: (v) => v.toFixed(0) },
  { key: 'noise', id: 'pnoise', i18n: 'pNoise', min: 0, max: 0.5, step: 0.01, digits: 2 },
  { key: 'amount', id: 'pAmount', i18n: 'pAmount', min: 0.15, max: 0.85, step: 0.01, digits: 2 },
];

// Constantes del modelo: escala logarítmica, con la posición izquierda = 0 cuando tiene sentido
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
          paintPattern(); // solo cambia el coloreado, no la simulación
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

// Galería: color sólido y un preset por tipo de patrón, con su miniatura real
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

// Miniaturas: se calculan una vez, en un worker propio para no interferir con el principal
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

/** El color se ve sobre la superficie: se quitan las líneas y se pasa a sólido. */
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

/** Lleva el estado del patrón a todos los controles. */
function syncPatternControls() {
  PIG_PARAMS.forEach((d) => pigControls[d.id].set(pattern[d.key]));
  Object.values(pigControls).forEach((c) => c.relabel());
  pigControls.pglobal.el.hidden = pattern.model !== 'AS'; // el control global solo existe con sustrato
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

// Vista simple o avanzada: la avanzada muestra también las constantes del modelo
function setPigMode(mode) {
  $('tab-pigment').dataset.pmode = mode;
  document.querySelectorAll('#pigMode [data-pmode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.pmode === mode)));
  drawSpacetime(); // la marca del instante y el perfil solo existen en la vista avanzada
}
document.querySelectorAll('#pigMode [data-pmode]').forEach((b) => b.addEventListener('click', () => setPigMode(b.dataset.pmode)));

// Al cambiar de modelo se cargan las constantes de su preset de referencia: las del
// otro modelo no tienen sentido aquí (p. ej. sin producción de sustrato no hay patrón)
$('patternModel').addEventListener('change', (e) => {
  const { base, pigment, size, amount } = pattern;
  Object.assign(pattern, pickPattern(PATTERN_PRESETS[MODEL_REFERENCE[e.target.value]]), { base, pigment, size, amount });
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
    paintPattern(); // cambiar el color no requiere volver a simular
    writeHash();
  });
}

$('pigTheory').addEventListener('click', () => openInfo('meinhardt'));

$('savePattern').addEventListener('click', () => {
  if (patternValues) download(patternCanvas.toDataURL('image/png'), `meinhardt_${pattern.preset}_seed${pattern.seed}.png`);
});

// Pestañas Forma | Pigmento. Al entrar en Pigmento la concha pasa a sólido, en
// color liso: el patrón lo elige el usuario en la galería.
function showTab(name) {
  document.querySelectorAll('.tabs [data-tab]').forEach((b) => {
    const on = b.dataset.tab === name;
    b.setAttribute('aria-selected', String(on));
    b.tabIndex = on ? 0 : -1;
  });
  $('tab-shape').hidden = name !== 'shape';
  $('tab-pigment').hidden = name !== 'pigment';
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
    const next = b.dataset.tab === 'shape' ? 'pigment' : 'shape';
    showTab(next);
    document.querySelector(`.tabs [data-tab="${next}"]`).focus();
  });
});

buildGallery();
syncPatternControls();
if (pattern.on) computePattern();

// ---------------------------------------------------------------------------
// Gráficos superpuestos en el visor 3D (desactivados por defecto)
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
document.addEventListener('pointerdown', (e) => {
  if (graphsMenu.open && !graphsMenu.contains(e.target)) graphsMenu.open = false;
});
graphsMenu.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    graphsMenu.open = false;
    graphsMenu.querySelector('summary').focus();
  }
});
new ResizeObserver(() => {
  if (!$('ovMorpho').hidden) drawMorphoOn(morphoOv);
  if (!$('ovProfile').hidden) drawProfile();
}).observe($('overlays'));

// ---------------------------------------------------------------------------
// Idioma
// ---------------------------------------------------------------------------

function applyLanguage(lang) {
  setLang(lang);
  applyStatic();
  Object.values(controlsByKey).forEach((c) => c.relabel());
  buildPresetOptions();
  updateGrowButton();
  updateFullscreenButton();
  drawMorpho();
  document.querySelectorAll('.lang button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === getLang())));
  // applyStatic reemplaza el HTML con TeX sin componer
  infoBody.querySelectorAll('.info-page').forEach((el) => delete el.dataset.typeset);
  if (infoDialog.open) openInfo();
  updateGalleryLabels();
  updatePatternMessage();
  setSecondLabel();
  Object.values(pigControls).forEach((c) => c.relabel());
  drawSpacetime();
  if (!formulaPanel.hidden) setFormulaOpen(true);
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
  axisMat.resolution.set(w, h);
}
new ResizeObserver(resize).observe(viewport);
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

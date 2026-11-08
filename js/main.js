import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { buildShell } from './raup.js';
import { hasOrnament, ornamentResolution, ORNAMENT_DEFAULTS } from './ornament.js';
import { criticalWaves, lambdaForWaves, loadRatio, firstMode, unstableBand, mechanicalCords } from './mechanics.js';
import { buildPrintMesh, toSTL, to3MF } from './export3d.js';
import { MORPHO_REGIONS } from './morphospace.js';
import { encodeTIFF, fitFrame, slugify, plateLayout, FIXED_SIZES, MAX_SIDE } from './imagefile.js';
import { PRESETS, DEFAULT_PRESET, PATTERN_PRESETS, DEFAULT_PATTERN, MODEL_DEFAULTS, ORNAMENT_PRESETS } from './presets.js';
import { simulatePattern, PROFILE_WIDTH } from './meinhardt.js';
import {
  setLang, getLang, t, tParam, tPreset, tPattern, applyStatic,
  GENERAL_TEX, DEFS_TEX, MIRROR_TEX, AI_TEX, AS_TEX, GLOBAL_TEX,
} from './i18n.js';

// ---------------------------------------------------------------------------
// Control definitions (the texts live in i18n.js)
// ---------------------------------------------------------------------------

const formatW = (v) => v.toFixed(v < 100 ? 2 : v < 1000 ? 1 : 0);

const RAUP_PARAMS = [
  // Linear scale 1–10 (gastropods, cephalopods) or logarithmic 1–10⁴ (bivalves)
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

// Ornament (relief): axial ribs along the growth direction, spiral cords around
// the margin, a keel, spines, and a change of strength with growth (ornament.js)
const ORN_PARAMS = [
  { key: 'ribN', min: 0, max: 60, step: 1, digits: 0, box: 'rib' },
  { key: 'ribH', min: 0, max: 0.4, step: 0.01, digits: 2, box: 'rib' },
  { key: 'ribW', min: 0.05, max: 1, step: 0.01, digits: 2, box: 'ribAdv' },
  { key: 'ribSkew', min: -0.8, max: 0.8, step: 0.05, digits: 2, box: 'ribAdv' },
  { key: 'cordN', min: 0, max: 48, step: 1, digits: 0, box: 'cord' },
  { key: 'cordH', min: 0, max: 0.4, step: 0.01, digits: 2, box: 'cord' },
  { key: 'cordW', min: 0.05, max: 1, step: 0.01, digits: 2, box: 'cordAdv' },
  { key: 'keelH', min: 0, max: 0.4, step: 0.01, digits: 2, box: 'keel' },
  { key: 'keelW', min: 0.02, max: 0.3, step: 0.01, digits: 2, box: 'keel' },
  { key: 'keelPos', min: -0.5, max: 0.5, step: 0.01, digits: 2, box: 'keel' },
  { key: 'spineN', min: 0, max: 40, step: 1, digits: 0, box: 'spine' },
  { key: 'spineH', min: 0, max: 1.5, step: 0.01, digits: 2, box: 'spine' },
  { key: 'spineW', min: 0.1, max: 1, step: 0.01, digits: 2, box: 'spineAdv' },
  { key: 'spinePos', min: -0.5, max: 0.5, step: 0.01, digits: 2, box: 'spineAdv' },
  { key: 'ornGrowth', min: -1, max: 1, step: 0.05, digits: 2, box: 'growth' },
];
const ORN_KEYS = Object.keys(ORNAMENT_DEFAULTS);
const ORN_BOOLS = ['nodules', 'spineBoth'];
const pickOrnament = (p) => Object.fromEntries(ORN_KEYS.map((k) => [k, p[k]]));

// Display orientation of the shell (presentation only: geometry and 3D files keep the model frame)
const ORIENTS = ['vertical', 'horizontal', 'free'];

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
  ...ORNAMENT_DEFAULTS,
  orient: 'vertical',
};

function pickShape(p) {
  return Object.fromEntries(SHAPE_KEYS.map((k) => [k, p[k]]));
}

// ---------------------------------------------------------------------------
// Shareable state in the URL: #W=2.4&D=0.08&T=1.6&S=1&N=4.5&h=1&v=0&m=lines
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
const ORN_HASH = {
  rn: 'ribN', rh: 'ribH', rw: 'ribW', rk: 'ribSkew', cn: 'cordN', ch: 'cordH', cw: 'cordW',
  kh: 'keelH', kw: 'keelW', kp: 'keelPos', sn: 'spineN', sh: 'spineH', sw: 'spineW', sp: 'spinePos', og: 'ornGrowth',
};
for (const [short, key] of Object.entries(ORN_HASH)) {
  const v = parseFloat(fromHash.get(short));
  if (Number.isFinite(v)) state[key] = v;
}
if (fromHash.has('nd')) state.nodules = fromHash.get('nd') === '1';
if (fromHash.has('sb')) state.spineBoth = fromHash.get('sb') === '1';
const ORIENT_HASH = { v: 'vertical', h: 'horizontal', f: 'free' };
if (ORIENT_HASH[fromHash.get('o')]) state.orient = ORIENT_HASH[fromHash.get('o')];

// Small wrapper around localStorage: it can be unavailable (private mode, blocked
// site data), and then the app simply does not remember anything
const storage = {
  get(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set(key, value) {
    try { localStorage.setItem(key, value); } catch { /* not remembered */ }
  },
};
const LANG_KEY = 'coiling-shells.lang';
const WELCOME_KEY = 'coiling-shells.welcome';

// Language: English by default; the visitor's choice is remembered for later visits
setLang(storage.get(LANG_KEY) ?? 'en');

let hashTimer = 0;
// Undo history (see "Undo" below); declared early because writeHash records the steps
const undoStack = [];
const UNDO_LIMIT = 50;
let committed = null;
let undoTimer = 0;
function writeHash() {
  noteChange();
  clearTimeout(hashTimer);
  hashTimer = setTimeout(writeHashNow, 250);
}

function writeHashNow() {
  clearTimeout(hashTimer);
  const q = new URLSearchParams();
  for (const [short, key] of Object.entries(HASH_KEYS)) q.set(short, String(+Number(state[key]).toFixed(3)));
  q.set('v', state.mirror ? '1' : '0');
  q.set('m', state.mode);
  if (hasOrnament(state)) {
    for (const [short, key] of Object.entries(ORN_HASH)) {
      if (state[key] !== ORNAMENT_DEFAULTS[key]) q.set(short, String(+Number(state[key]).toFixed(3)));
    }
    if (state.nodules) q.set('nd', '1');
    if (state.spineBoth) q.set('sb', '1');
  }
  if (state.orient !== 'vertical') q.set('o', state.orient[0]);
  patternHash(q);
  history.replaceState(null, '', `#${q}`);
}

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

const $ = (id) => document.getElementById(id);
const viewport = $('viewport');

const PALETTES = {
  light: { line: '#2b3a4a', shell: '#e8d3b0', bg: '#f4f0e6' }, // ink on paper
  dark: { line: '#d8c08c', shell: '#e4cfae', bg: '#111821' },  // old gold on night blue
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

// Materials
const solidMat = new THREE.MeshStandardMaterial({
  color: $('shellColor').value,
  roughness: 0.42,
  metalness: 0.0,
  envMapIntensity: 0.6,
  side: THREE.DoubleSide,
  vertexColors: true,
  // push the surface back so the lines stay on top
  polygonOffset: true,
  polygonOffsetFactor: 1,
  polygonOffsetUnits: 1,
});

// Invisible occluder: writes depth but no colour → hidden-line removal
const occluderMat = new THREE.MeshBasicMaterial({
  colorWrite: false,
  side: THREE.DoubleSide,
  polygonOffset: true,
  polygonOffsetFactor: 1,
  polygonOffsetUnits: 1,
});

// Lines with a width in pixels (native WebGL lines are always 1 px wide)
const lineMat = new LineMaterial({
  color: $('lineColor').value,
  linewidth: state.lineWidth,
  transparent: true,
  opacity: state.lineOpacity,
});

// Dashed axis with a width in pixels (1 px by default, like a plain WebGL line)
const axisMat = new LineMaterial({ color: 0x2a9d8f, linewidth: state.axisWidth, dashed: true, dashSize: 0.12, gapSize: 0.08 });

solidMat.side = THREE.FrontSide; // exterior (front faces point outwards)

// Inside of the shell: unpigmented, with a light pearly sheen
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
// The shell lives in a group whose rotation is only a display orientation:
// the geometry, the equation and the 3D files keep the model frame (z = coiling axis)
const shellGroup = new THREE.Group();
shellGroup.add(solid, inner, occluder, lines, axis);
scene.add(shellGroup);

// ---------------------------------------------------------------------------
// x, y, z axes gizmo (frame of the equation: z = coiling axis)
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

// The axes turn with the shell's display orientation
const gizmoAxes = new THREE.Group();
gizmo.scene.add(gizmoAxes);

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
  gizmoAxes.add(arrow);
  const sprite = makeLabel(label, color);
  sprite.position.copy(v).multiplyScalar(1.34);
  gizmoAxes.add(sprite);
}
gizmo.scene.add(new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 12), new THREE.MeshBasicMaterial({ color: 0x8a8f98, toneMapped: false })));

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

/** The aperture seam has duplicated vertices: their normals are averaged so the seam is invisible. */
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
// Formulas (MathJax). They are typeset only when their panel is visible.
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

/** Queues typesetting of `el`; `html` (a function) is evaluated just before, with the latest state. */
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
/** Two significant figures: for constants spanning several orders of magnitude. */
const sig = (v) => (v === 0 ? '0' : v >= 100 ? v.toFixed(0) : String(+Number(v).toPrecision(2)));

let formulaView = 'raup';

const SOURCE_TEX = String.raw`\[ s_i = r_a\,(1 + \sigma\,\xi_i),\quad \xi_i \in [-1,\,1],\quad x = 1,\dots,N \]`;

function generalTeX(view = formulaView) {
  if (view === 'meinhardt') {
    const isAS = pattern.model === 'AS';
    return (isAS ? AS_TEX : AI_TEX) + (isAS && pattern.globalCtl > 0 ? GLOBAL_TEX : '') + SOURCE_TEX;
  }
  return GENERAL_TEX + DEFS_TEX + (state.mirror ? MIRROR_TEX : '') + (hasOrnament(state) ? ORNAMENT_TEX : '');
}

/** Relief added along the outward normal of the aperture (descriptive model of ornament). */
const ORNAMENT_TEX = String.raw`\[
  \mathbf{P}^{*} = \mathbf{P} + W^{\theta/2\pi}\,a\,\delta(\theta,\varphi)\,\mathbf{n}(\varphi)
\]
\[
  \delta = f(s)\,\bigl[\,h_r R(\theta) + h_c C(u) + h_k K(u) + h_s \Sigma(\theta,u)\,\bigr],\qquad
  f(s) = 1 + c\,(2s - 1)
\]
\[
  R = \beta\!\left(\tfrac{n_r\theta}{2\pi},\,w_r,\,k\right),\quad
  C = \beta(n_c u,\,w_c),\quad
  K = \beta(u - u_k,\,w_k),\quad
  \beta(t,w) = \cos^2\!\left(\tfrac{\pi d}{w}\right)\ (d < \tfrac{w}{2}),\quad d = \left|t - \operatorname{round}(t)\right|
\]`;

/** Rows of the PDF parameter table for the ornament terms in use. */
function ornamentRows() {
  const s = state, rows = [];
  if (!hasOrnament(s)) return rows;
  if (s.ribN > 0 && s.ribH > 0) rows.push([`${t('orn.ribs')} (n, h, w)`, `${s.ribN}, ${f(s.ribH, 2)}, ${f(s.ribW, 2)}`]);
  if (s.cordN > 0 && s.cordH > 0) rows.push([`${t('orn.cords')} (n, h, w)`, `${s.cordN}, ${f(s.cordH, 2)}, ${f(s.cordW, 2)}`]);
  if (s.nodules) rows.push([t('orn.nodules.short'), t('ex.yes')]);
  if (s.keelH > 0) rows.push([`${t('orn.keel')} (h, w, u)`, `${f(s.keelH, 2)}, ${f(s.keelW, 2)}, ${f(s.keelPos, 2)}`]);
  if (s.spineN > 0 && s.spineH > 0) rows.push([`${t('orn.spines')} (n, h, w)`, `${s.spineN}, ${f(s.spineH, 2)}, ${f(s.spineW, 2)}`]);
  if (s.ornGrowth) rows.push([t('orn.growth'), f(s.ornGrowth, 2)]);
  return rows;
}

/** Values of the ornament terms in use (terms that are off are left out). */
function ornamentLiveTeX() {
  const s = state, parts = [];
  if (s.ribN > 0 && s.ribH > 0) parts.push(String.raw`n_r = ${s.ribN},\; h_r = ${f(s.ribH, 2)},\; w_r = ${f(s.ribW, 2)}${s.ribSkew ? String.raw`,\; k = ${f(s.ribSkew, 2)}` : ''}`);
  if (s.cordN > 0 && s.cordH > 0) parts.push(String.raw`n_c = ${s.cordN},\; h_c = ${f(s.cordH, 2)},\; w_c = ${f(s.cordW, 2)}`);
  if (s.nodules) parts.push(String.raw`h_r R + h_c C \;\to\; (h_r + h_c)\,R\,C`);
  if (s.keelH > 0) parts.push(String.raw`h_k = ${f(s.keelH, 2)},\; w_k = ${f(s.keelW, 2)},\; u_k = ${f(s.keelPos, 2)}`);
  if (s.spineN > 0 && s.spineH > 0) parts.push(String.raw`n_s = ${s.spineN},\; h_s = ${f(s.spineH, 2)},\; w_s = ${f(s.spineW, 2)},\; u_s = ${s.spineBoth ? '\\pm' : ''}${f(s.spinePos, 2)}`);
  if (s.ornGrowth) parts.push(String.raw`c = ${f(s.ornGrowth, 2)}`);
  return parts.map((p) => String.raw`\[ ${p} \]`).join('');
}

function meinhardtLiveTeX() {
  const { model, Da, D2, ra, r2, kappa, ba, b2, noise, globalCtl, T } = pattern;
  // Optional terms: omitted when their coefficient is 0
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
    (state.mirror ? `\\[ \\mathbf{P}' = (x,\\,-y,\\,z) \\]` : '') +
    (hasOrnament(state) ? ornamentLiveTeX() : '')
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
    // From the pigment tab, Meinhardt's equations open directly
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
    // Each page is typeset with MathJax the first time it is shown
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
// Sidebar controls
// ---------------------------------------------------------------------------

const controlsByKey = {};
let dirty = true;

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
    return;
  }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
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

// ---------------------------------------------------------------------------
// W – D morphospace (a section of Raup's cube)
// ---------------------------------------------------------------------------

const morpho = $('morpho');
const morphoOv = $('morphoOv');
const morphoDrawer = $('morphoDrawer');
const MORPHO = { l: 34, r: 10, t: 10, b: 26, logMax: 4 };
// W axis range: 1–10⁴ (all groups) or 1–10 (snails and cephalopods in more detail)
const MORPHO_TICKS = {
  4: [[0, '1'], [1, '10'], [2, '10²'], [3, '10³'], [4, '10⁴']],
  1: [[0, '1'], [Math.log10(2), '2'], [Math.log10(3), '3'], [Math.log10(5), '5'], [1, '10']],
};
// On the 3D view the height adapts to the panel width (narrower on mobile)
const morphoHeight = (canvas) => (canvas === morpho ? 210 : Math.round(THREE.MathUtils.clamp(canvas.clientWidth * 0.68, 130, 200)));

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

/** Draws the morphospace in the sidebar and on the 3D view, where visible. */
function drawMorpho() {
  if (morphoDrawer.open) drawMorphoOn(morpho);
  if (!$('ovMorpho').hidden) drawMorphoOn(morphoOv);
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {object} [off] for off-screen drawing (PDF): { width, height, scale, colors }
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

  // Region above D = 1/W: whorls do not touch (for T = 0)
  ctx.beginPath();
  ctx.moveTo(x(0), y(1));
  for (let lw = 0; lw <= X1 + 1e-4; lw += X1 / 200) ctx.lineTo(x(lw), y(10 ** -lw));
  ctx.lineTo(x(X1), y(1));
  ctx.closePath();
  ctx.fillStyle = muted;
  ctx.globalAlpha = 0.08;
  ctx.fill();
  ctx.globalAlpha = 1;

  // Occupied regions (approximate), clipped to the frame. Regions of groups that
  // do not exist at the current T are faded and drawn with a dashed outline.
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
  // Group names: they can be clicked to load a typical shell
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
    ctx.fillRect(x0, y(d) + 7, tw, 1); // underline: it is a link
    canvas.labelBoxes.push({ x0: x0 - 3, x1: x0 + tw + 3, y0: y(d) - 9, y1: y(d) + 10, preset: r.preset });
  }
  ctx.textBaseline = 'alphabetic';

  // Curve D = 1/W
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
  // The plane is a section of Raup's cube at the current T
  ctx.fillStyle = accent;
  ctx.font = '600 10.5px Inter, system-ui, sans-serif';
  ctx.fillText(t('morpho.section', f(state.T, 2)), x(X1 * 0.9875), y(0.78));

  // Axes
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

  // Current shell
  ctx.beginPath();
  ctx.arc(x(Math.min(X1, Math.log10(Math.max(1, state.W)))), y(state.D), 5.5, 0, Math.PI * 2);
  ctx.fillStyle = accent;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = v('--surface');
  ctx.stroke();
}

/** Group name under the pointer, if any. */
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
    // Clicking a group name loads a typical shell (W, D, T, S and N at once)
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

// W axis range (shared by the sidebar panel and the overlaid chart)
function setMorphoScale(logMax) {
  MORPHO.logMax = logMax;
  document.querySelectorAll('[data-wscale]').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.wscale) === logMax)));
  drawMorpho();
}
document.querySelectorAll('[data-wscale]').forEach((b) => b.addEventListener('click', () => setMorphoScale(Number(b.dataset.wscale))));

// ---------------------------------------------------------------------------
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

const luminance = (hex) => {
  const [r, g, b] = hexRgb(hex).map((c) => c / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

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

/**
 * Colours of the PDF sheet for a given page colour: the usual light palette on
 * light pages, light ink on dark ones. Graphs drawn on canvas use the same keys.
 */
function pdfPalette(page) {
  if (luminance(page) >= 0.5) {
    const white = page.toLowerCase() === '#ffffff';
    return { ...LIGHT_COLORS, '--surface': page, '--surface-2': white ? LIGHT_COLORS['--surface-2'] : mixHex(page, '#000000', 0.05) };
  }
  return {
    '--surface': page, '--surface-2': mixHex(page, '#ffffff', 0.07), '--border': mixHex(page, '#ffffff', 0.22),
    '--text': '#e8eaee', '--muted': '#a3abb5', '--accent': '#6cc7bb',
  };
}

const mixHex = (a, b, k) => '#' + hexRgb(a).map((c, i) => Math.round(c + (hexRgb(b)[i] - c) * k).toString(16).padStart(2, '0')).join('');

/** Standard PDF fonts only cover Latin-1: arrows, dashes and Greek letters are replaced. */
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
  // Background: white, the shell images on the current colour, or the whole sheet
  const bgMode = $('exPdfBg').value;
  const bgHex = $('bgColor').value;
  const imgBg = bgMode === 'white' ? '#ffffff' : bgHex;
  const pageBg = bgMode === 'page' ? hexRgb(bgHex) : null;
  const pal = pdfPalette(bgMode === 'page' ? bgHex : '#ffffff');
  const dark = hexRgb(pal['--text']), muted = hexRgb(pal['--muted']), accent = hexRgb(pal['--accent']);
  const rule = hexRgb(pal['--border']);

  const header = () => {
    if (pageBg) doc.setFillColor(...pageBg).rect(0, 0, 210, 297, 'F');
    doc.setFont('helvetica', 'normal').setFontSize(8.5).setTextColor(...muted);
    doc.text(t('doc.title'), M, 11);
    doc.text(new Date().toLocaleDateString(lang), 210 - M, 11, { align: 'right' });
    doc.setDrawColor(...rule).line(M, 13, 210 - M, 13);
  };
  const footer = () => {
    doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...muted);
    doc.text(t('ex.pdf.cite'), M, 284, { maxWidth: W - 30 });
    doc.text('MIT · CC BY 4.0', 210 - M, 284, { align: 'right' });
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

  // Page 1: shape
  header();
  doc.setFont('helvetica', 'bold').setFontSize(17).setTextColor(...dark);
  doc.text(shellName(), M, 24);
  doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...muted);
  doc.text(`W = ${formatW(state.W)}   D = ${f(state.D, 3)}   T = ${f(state.T, 2)}   S = ${f(state.S, 2)}   N = ${f(state.turns, 2)}   ·   ${t(state.hand > 0 ? 'geo.dextral' : 'geo.sinistral')}`, M, 30.5);

  heading(t('ex.pdf.views'), 39);
  const plate = renderPlate({ tile: 560, background: imgBg, labels: true });
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
    ...ornamentRows(),
  ], M, y + 6.5, colW - 24, 24);
  doc.setFont('helvetica', 'normal').setFontSize(8.5).setTextColor(...muted);
  doc.text(`${t('ex.pdf.derived')}: rc = ${f(rc, 3)}   a = ${f(a, 3)}   b = ${f(b, 3)}`, M, yL + 1.5);
  yL += 4;

  const mx = M + colW + 10, mw = W - colW - 10;
  heading(t('morpho.title'), y, mx);
  const mc = document.createElement('canvas');
  const mh = Math.round(mw * 0.68 * 4);
  drawMorphoOn(mc, { width: Math.round(mw * 4), height: mh, scale: 2, colors: pal });
  // drawMorphoOn works in CSS pixels: drawn at 4 px per mm with scale 2
  doc.addImage(mc.toDataURL('image/png'), 'PNG', mx, y + 3, mw, mw * 0.68);
  y = Math.max(yL, y + 3 + mw * 0.68) + 8;

  // Link that reopens this shell
  writeHashNow();
  doc.setFont('helvetica', 'normal').setFontSize(8.5).setTextColor(...muted);
  doc.text(t('ex.pdf.link'), M, y);
  doc.setTextColor(...accent);
  const url = location.href;
  const lines = doc.splitTextToSize(url, W);
  doc.textWithLink(lines[0] + (lines.length > 1 ? '...' : ''), M, y + 4.5, { url });
  footer();

  // Page 2: pigmentation (if a pattern is shown)
  if (colourShown()) {
    doc.addPage();
    header();
    doc.setFont('helvetica', 'bold').setFontSize(17).setTextColor(...dark);
    doc.text(t('ex.pdf.pattern'), M, 24);
    doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...muted);
    const pname = PATTERN_PRESETS[pattern.preset] ? tPattern(pattern.preset) : t('pig.custom');
    doc.text(`${pname}   ·   ${t(`pig.model.${pattern.model}`)}`, M, 30.5);

    // Space–time record with its axes
    heading(t('pig.spacetime'), 39);
    const ax = M + 7;               // leave room for the vertical axis
    const stW = 64, stH = 118, stY = 51;
    const st = document.createElement('canvas');
    st.width = 512;
    st.height = Math.round((512 * stH) / stW);
    st.getContext('2d').drawImage(patternCanvas, 0, 0, st.width, st.height);
    doc.addImage(st.toDataURL('image/jpeg', 0.92), 'JPEG', ax, stY, stW, stH);
    doc.setDrawColor(...rule).setLineWidth(0.2).rect(ax, stY, stW, stH);

    const arrow = (x1, y1, x2, y2) => {
      doc.setDrawColor(...dark).setFillColor(...dark).setLineWidth(0.3);
      doc.line(x1, y1, x2, y2);
      const a = Math.atan2(y2 - y1, x2 - x1), L = 1.8, s = 0.8;
      doc.triangle(
        x2, y2,
        x2 - L * Math.cos(a) + s * Math.sin(a), y2 - L * Math.sin(a) - s * Math.cos(a),
        x2 - L * Math.cos(a) - s * Math.sin(a), y2 - L * Math.sin(a) + s * Math.cos(a), 'F');
    };
    // Horizontal axis: position along the margin (the margin goes around the aperture)
    doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...dark);
    doc.text(t('ex.pdf.axis.x'), ax + stW / 2, 44.5, { align: 'center', maxWidth: stW + 6 });
    arrow(ax + stW / 2, 47.5, ax + stW, 47.5);
    arrow(ax + stW / 2, 47.5, ax, 47.5);
    // Vertical axis: time, from the apex to the aperture
    arrow(M + 4.5, stY, M + 4.5, stY + stH);
    const tLabel = t('ex.pdf.axis.t');
    // Rotated 90° clockwise: the glyphs lie to the right of the anchor point
    doc.text(tLabel, M - 0.8, stY + stH / 2 - doc.getTextWidth(pdfSafe(tLabel)) / 2, { angle: -90 });
    doc.setFontSize(7).setTextColor(...muted);
    doc.text(t('ex.pdf.apex'), ax + stW + 1.5, stY + 2.5);
    doc.text(t('ex.pdf.aperture'), ax + stW + 1.5, stY + stH);
    // Moment of the profile, marked on the record
    const row = profileRow ?? PATTERN_ROWS - 1;
    const ry = stY + (stH * (row + 0.5)) / PATTERN_ROWS;
    doc.setDrawColor(...accent).setLineWidth(0.5).line(ax - 1, ry, ax + stW + 1, ry);
    doc.setFontSize(7.5).setTextColor(...muted);
    doc.text(t('ex.pdf.st.caption'), M, stY + stH + 5, { maxWidth: stW + 7 });

    // Pigmented shell in apertural and 3/4 views
    const sx = M + 7 + stW + 17, sw = W - (sx - M);
    const two = renderPlateSubset(['apertural', 'iso'], 520, imgBg);
    doc.addImage(two.toDataURL('image/jpeg', 0.92), 'JPEG', sx, 39, sw, sw / 2);

    // Margin profile: activator and inhibitor (or substrate) at that moment
    let yy = 39 + sw / 2 + 7;
    heading(t('pig.profile'), yy, sx);
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...muted);
    const atLines = doc.splitTextToSize(pdfSafe(t('ex.pdf.profile.at', Math.round((100 * row) / (PATTERN_ROWS - 1)))), sw);
    doc.text(atLines, sx, yy + 4.5);
    const ph = 36, py = yy + 4.5 + atLines.length * 3.4;
    const pc = document.createElement('canvas');
    drawProfileOn(pc, row, getComputedStyle(document.documentElement), { width: Math.round(sw * 4), height: ph * 4, scale: 2, colors: pal });
    doc.setFillColor(...hexRgb(pal['--surface-2'])).rect(sx, py, sw, ph, 'F');
    doc.addImage(pc.toDataURL('image/png'), 'PNG', sx, py, sw, ph);
    // Legend
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

  // Equations page (optional): general form and with the current values
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
            const img = await texToImage(MJ, piece, EX_MM * 12, pal['--text']);
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

/** Splits a TeX block with several \[ … \] displays into its pieces. */
function displayPieces(tex) {
  return [...tex.matchAll(/\\\[([\s\S]*?)\\\]/g)].map((m) => m[1].trim());
}

// MathJax with SVG output in a separate iframe (the page uses CHTML output, which
// cannot be turned into an image); loaded only when exporting the equations
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

/** Typesets a formula as SVG and rasterises it to PNG. Also returns its size in ex. */
async function texToImage(MJ, tex, exPx, ink = '#1c2430') {
  const node = await MJ.tex2svgPromise(tex, { display: true });
  const svg = node.querySelector('svg');
  const wEx = parseFloat(svg.getAttribute('width'));
  const hEx = parseFloat(svg.getAttribute('height'));
  svg.setAttribute('width', `${wEx * exPx}px`);
  svg.setAttribute('height', `${hEx * exPx}px`);
  svg.setAttribute('style', `color:${ink}`);
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

function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

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

// ---------------------------------------------------------------------------
// Welcome guide: an interactive shell generated by the model, with its parts
// labelled, and a short tutorial. Shown on the first visit only (not when a
// shared link is opened) and available again from the Guide button.
// ---------------------------------------------------------------------------

const welcomeDlg = $('welcome');
let welcome = null; // scene, built the first time the guide opens

/** Grid vertex of a buildShell result (first copy) as a Vector3. */
function gridPoint(shell, row, col) {
  const k = (row * shell.grid.cols + col) * 3;
  const P = shell.positions;
  return new THREE.Vector3(P[k], P[k + 1], P[k + 2]);
}

/**
 * Anchor points of the shell parts, taken from the generated mesh so that the
 * labels always sit on the right place of the model. Parts that extend along a
 * whorl (spire, suture, body whorl) have several candidate points; each frame the
 * label goes to the closest one that is in view, so it follows the shell as it turns.
 */
function shellAnchors(shell, turns) {
  const { rows, cols } = shell.grid;
  const nTheta = rows - 1;
  const seg = cols - 1;
  const rowAt = (theta) => Math.max(0, Math.min(nTheta, Math.round(((theta + 2 * Math.PI * turns) / (2 * Math.PI * turns)) * nTheta)));
  const colAt = (phi) => ((Math.round((phi / (2 * Math.PI)) * seg) % seg) + seg) % seg;
  const along = (from, to, n, fn) => Array.from({ length: n }, (_, i) => fn(from + ((to - from) * i) / (n - 1)));
  const TAU = 2 * Math.PI;
  const { x, z, yTop } = shell.axis;
  // Suture: the line where a whorl meets the previous one. Two rings one turn apart
  // lie in the same meridian plane; in that plane (distance to the axis, height)
  // the outline of the later whorl crosses the outline of the earlier one, and the
  // crossing farther from the axis is the suture seen on the outside of the shell.
  const toPlane = (v) => [Math.hypot(v.x - x, v.z - z), v.y];
  const inside = (poly, [px, py]) => {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  const sutureAt = (theta) => {
    const a = rowAt(theta), b = rowAt(theta - TAU);
    const ringA = Array.from({ length: seg }, (_, j) => gridPoint(shell, a, j));
    const polyB = Array.from({ length: seg }, (_, j) => toPlane(gridPoint(shell, b, j)));
    let best = null, bestR = -Infinity;
    for (let j = 0; j < seg; j++) {
      const p = ringA[j], q = ringA[(j + 1) % seg];
      const inP = inside(polyB, toPlane(p));
      if (inP === inside(polyB, toPlane(q))) continue;
      // Bisection along the segment to the crossing point
      let lo = 0, hi = 1;
      for (let k = 0; k < 20; k++) {
        const mid = (lo + hi) / 2;
        if (inside(polyB, toPlane(p.clone().lerp(q, mid))) === inP) lo = mid; else hi = mid;
      }
      const c = p.clone().lerp(q, (lo + hi) / 2);
      const r = toPlane(c)[0];
      if (r > bestR) { bestR = r; best = c; }
    }
    return best;
  };
  // Aperture: centre of the last ring, inside the opening
  const ap = new THREE.Vector3();
  for (let j = 0; j < seg; j++) ap.add(gridPoint(shell, nTheta, j));
  ap.multiplyScalar(1 / seg);
  return [
    { key: 'wel.apex', cands: [gridPoint(shell, 0, 0)], free: true },
    { key: 'wel.spire', cands: along(-TAU * 2.6, -TAU * 1.4, 13, (t) => gridPoint(shell, rowAt(t), colAt(0.5))) },
    // The suture lies where two whorls meet, so a ray always grazes the neighbour:
    // it simply uses the candidate closest to the camera
    { key: 'wel.suture', cands: along(-TAU * 0.95, -TAU * 0.05, 19, sutureAt).filter(Boolean), free: true },
    { key: 'wel.body', cands: along(-TAU * 0.9, -TAU * 0.15, 13, (t) => gridPoint(shell, rowAt(t), colAt(0))) },
    { key: 'wel.aperture', cands: [ap] },
    { key: 'wel.axis', cands: [new THREE.Vector3(x, yTop + 0.35, z)], free: true },
  ];
}

function buildWelcome() {
  const view = $('welcomeView');
  const canvas = $('welcomeCanvas');
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  r.toneMapping = THREE.ACESFilmicToneMapping;
  const sc = new THREE.Scene();
  sc.environment = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(r), 0.04).texture;
  sc.add(new THREE.HemisphereLight(0xffffff, 0x8a7f70, 0.55));
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.1);
  keyLight.position.set(4, 8, 5);
  sc.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0xdfe8ff, 0.5);
  fillLight.position.set(-5, 2, -4);
  sc.add(fillLight);

  const cam = new THREE.PerspectiveCamera(30, 1, 0.05, 100);
  cam.position.set(5.9, 2.5, 6.9);
  const ctl = new OrbitControls(cam, canvas);
  Object.assign(ctl, { enableDamping: true, dampingFactor: 0.08, enablePan: false, enableZoom: false });

  // Garden snail generated by Raup's model, in a plain shell colour
  const shape = pickShape(PRESETS.caracol);
  const shell = buildShell({ ...shape, grow: 1, segPerTurn: 96, segPhi: 64, spiralLines: 0, ringsPerTurn: 0, size: 4 });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(shell.positions, 3));
  geo.setIndex(new THREE.BufferAttribute(shell.indices, 1));
  geo.computeVertexNormals();
  fixSeamNormals(geo.attributes.normal.array, shell.grid);
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    color: '#d9b37c', roughness: 0.42, metalness: 0, envMapIntensity: 0.55, side: THREE.DoubleSide,
  }));
  sc.add(mesh);
  // Coarse copy of the same shell, only for the visibility tests of the labels
  const coarse = buildShell({ ...shape, grow: 1, segPerTurn: 40, segPhi: 24, spiralLines: 0, ringsPerTurn: 0, size: 4 });
  const proxyGeo = new THREE.BufferGeometry();
  proxyGeo.setAttribute('position', new THREE.BufferAttribute(coarse.positions, 3));
  proxyGeo.setIndex(new THREE.BufferAttribute(coarse.indices, 1));
  const proxy = new THREE.Mesh(proxyGeo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  proxy.updateMatrixWorld();
  const { x, z, yTop, yBottom } = shell.axis;
  const axisLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, yBottom - 0.3, z), new THREE.Vector3(x, yTop + 0.3, z)]),
    new THREE.LineDashedMaterial({ color: 0x2a9d8f, dashSize: 0.12, gapSize: 0.08 })
  );
  axisLine.computeLineDistances();
  sc.add(axisLine);

  // Labels: an HTML tag per part, joined to its anchor by a line drawn in SVG
  const anchors = shellAnchors(shell, shape.turns);
  const labelBox = $('welcomeLabels');
  const svg = $('welcomeLines');
  labelBox.innerHTML = '';
  svg.innerHTML = '';
  for (const a of anchors) {
    a.el = document.createElement('span');
    a.el.className = 'wlabel';
    labelBox.append(a.el);
    a.line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    a.dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    a.dot.setAttribute('r', '3');
    svg.append(a.line, a.dot);
  }

  const resizeView = () => {
    const w = view.clientWidth, h = view.clientHeight;
    if (!w || !h) return;
    r.setSize(w, h, false);
    cam.aspect = w / h;
    cam.updateProjectionMatrix();
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  };
  new ResizeObserver(resizeView).observe(view);

  const ray = new THREE.Raycaster();
  const centre = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  let frame = 0;
  const placeLabels = () => {
    const w = view.clientWidth, h = view.clientHeight;
    const recheck = frame++ % 4 === 0; // visibility is re-evaluated every few frames
    const toScreen = (v) => { tmp.copy(v).project(cam); return [(tmp.x + 1) * w / 2, (1 - tmp.y) * h / 2]; };
    const [cx, cy] = toScreen(centre.set(0, 0, 0));
    const placed = [];
    for (const a of anchors) {
      // The closest candidate point that is not hidden behind the shell
      const visible = (p) => {
        if (a.free) return true;
        const dir = p.clone().sub(cam.position);
        const dist = dir.length();
        ray.set(cam.position, dir.normalize());
        const hit = ray.intersectObject(proxy, false)[0];
        return !hit || hit.distance > dist - (a.tolerance ?? 0.08);
      };
      if (recheck || !a.point) {
        const byDistance = a.cands.slice().sort((u, v) => u.distanceToSquared(cam.position) - v.distanceToSquared(cam.position));
        const chosen = byDistance.find(visible);
        a.hidden = !chosen; // hidden parts are faded, not removed
        a.point = chosen ?? byDistance[0];
      }
      const hidden = a.hidden;
      const [px, py] = toScreen(a.point);
      // Each label goes to the left or right of its point, away from the centre
      const side = px < cx ? -1 : 1;
      placed.push({ a, px, py, hidden, side, lx: px + side * 56, ly: py + (py - cy) * 0.15 });
    }
    // On each side, spread the labels vertically so they never overlap
    const gap = 24;
    for (const side of [-1, 1]) {
      const col = placed.filter((q) => q.side === side).sort((u, v) => u.ly - v.ly);
      for (let i = 1; i < col.length; i++) col[i].ly = Math.max(col[i].ly, col[i - 1].ly + gap);
      const overflow = col.length ? col[col.length - 1].ly - (h - 14) : 0;
      if (overflow > 0) for (const q of col) q.ly -= overflow;
      for (let i = col.length - 2; i >= 0; i--) col[i].ly = Math.min(col[i].ly, col[i + 1].ly - gap);
      for (const q of col) q.ly = Math.max(14, q.ly);
    }
    for (const { a, px, py, hidden, side, lx, ly } of placed) {
      const lw = a.el.offsetWidth;
      const x = side < 0 ? Math.max(lw + 8, lx) : Math.min(w - lw - 8, lx);
      a.el.style.left = `${x}px`;
      a.el.style.top = `${ly}px`;
      a.el.style.transform = `translate(${side < 0 ? '-100%' : '0'}, -50%)`;
      a.el.classList.toggle('behind', hidden);
      a.line.setAttribute('x1', px); a.line.setAttribute('y1', py);
      a.line.setAttribute('x2', x); a.line.setAttribute('y2', ly);
      a.line.classList.toggle('behind', hidden);
      a.dot.setAttribute('cx', px); a.dot.setAttribute('cy', py);
      a.dot.classList.toggle('behind', hidden);
    }
  };

  welcome = { r, sc, cam, ctl, anchors, placeLabels, resizeView, running: false };
  updateWelcomeText();
}

/** Texts that depend on the language: the part labels and the hidden list for screen readers. */
function updateWelcomeText() {
  if (welcome) for (const a of welcome.anchors) a.el.textContent = t(a.key);
  $('welcomeParts').innerHTML = ['wel.apex', 'wel.spire', 'wel.suture', 'wel.body', 'wel.aperture', 'wel.axis']
    .map((k) => `<li>${t(k)}</li>`).join('');
}

function welcomeLoop() {
  if (!welcomeDlg.open) {
    welcome.running = false; // the scene only renders while the guide is open
    return;
  }
  welcome.ctl.update();
  welcome.r.render(welcome.sc, welcome.cam);
  welcome.placeLabels();
  requestAnimationFrame(welcomeLoop);
}

function openWelcome() {
  if (!welcomeDlg.open) welcomeDlg.showModal();
  if (!welcome) buildWelcome();
  welcome.resizeView();
  if (!welcome.running) {
    welcome.running = true;
    requestAnimationFrame(welcomeLoop);
  }
}

$('openWelcome').addEventListener('click', openWelcome);
$('closeWelcome').addEventListener('click', () => welcomeDlg.close());
$('welcomeStart').addEventListener('click', () => welcomeDlg.close());
$('welcomeTheory').addEventListener('click', () => {
  welcomeDlg.close();
  openInfo('raup');
});
welcomeDlg.addEventListener('click', (e) => {
  if (e.target === welcomeDlg) welcomeDlg.close();
});
// Once seen (closed in any way), the guide does not open by itself again
welcomeDlg.addEventListener('close', () => storage.set(WELCOME_KEY, '1'));

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

// ---------------------------------------------------------------------------
// Undo: each step is a snapshot of the shape, the ornament, the render mode and
// the pattern. Changes that follow one another quickly (dragging a slider) make
// a single step. The view (camera, orientation) is not a step.
// ---------------------------------------------------------------------------

function takeSnapshot() {
  return JSON.stringify({
    shape: pickShape(state),
    orn: pickOrnament(state),
    mode: state.mode,
    pattern: { ...pattern },
  });
}

/** Called on every change (through writeHash): closes the step once changes stop. */
function noteChange() {
  if (committed === null) return; // not started yet
  clearTimeout(undoTimer);
  undoTimer = setTimeout(commitStep, 450);
}

function commitStep() {
  clearTimeout(undoTimer);
  const now = takeSnapshot();
  if (now === committed) return;
  undoStack.push(committed);
  if (undoStack.length > UNDO_LIMIT) undoStack.shift();
  committed = now;
  $('undo').disabled = false;
}

function undo() {
  commitStep(); // a change still in progress becomes a step of its own
  const prev = undoStack.pop();
  $('undo').disabled = undoStack.length === 0;
  if (!prev) return;
  committed = prev;
  restoreSnapshot(JSON.parse(prev));
}

function restoreSnapshot({ shape, orn, mode, pattern: pat }) {
  for (const k of ['W', 'D', 'T', 'S', 'turns']) controlsByKey[k].set(shape[k], { fitScale: true });
  state.hand = shape.hand;
  $('hand').value = String(shape.hand);
  setMirror(shape.mirror);
  presetSel.value = Object.keys(PRESETS).find((k) => SHAPE_KEYS.every((key) => pickShape(PRESETS[k])[key] === shape[key])) ?? 'custom';
  Object.assign(state, orn);
  syncOrnamentControls();
  state.mode = mode;
  applyMode();
  const patternChanged = JSON.stringify({ ...pattern }) !== JSON.stringify(pat);
  if (patternChanged) {
    Object.assign(pattern, pat);
    syncPatternControls();
    if (pattern.on) computePattern();
    setPatternOn(pattern.on);
  }
  dirty = true;
}

$('undo').addEventListener('click', undo);

// ---------------------------------------------------------------------------
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
committed = takeSnapshot(); // undo history starts from the state the page opened with

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

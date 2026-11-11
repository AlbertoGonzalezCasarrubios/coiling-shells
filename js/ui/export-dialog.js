/**
 * The export window and the image exports: the current view at any size (drawn
 * in tiles), the plate of standard views, the space–time record, PNG / JPEG /
 * TIFF encoding, the 3D files (STL, 3MF, GLB) and the PDF sheet (ui/pdf.js).
 */
import * as THREE from 'three';
import { buildPrintMesh, to3MF, toSTL } from '../export/export3d.js';
import { FIXED_SIZES, MAX_SIDE, encodeTIFF, fitFrame, plateLayout, slugify } from '../export/imagefile.js';
import { t, tPreset } from '../i18n/i18n.js';
import { hasOrnament } from '../model/ornament.js';
import { PRESETS } from '../model/presets.js';
import { generalTeX, liveTeX } from './formulas.js';
import { drawMorphoOn } from './morphospace-chart.js';
import { exportPDF as makePDF } from './pdf.js';
import { axis, axisMat, camera, ground, lineMat, renderer, scene, shellGroup, solid, solidMat, sun, viewport } from './scene.js';
import { pickOrnament, pickShape, state, writeHashNow } from './state.js';
import { $, f, formatW, luminance, qsa } from './util.js';

// Provided by main.js through init()
let PATTERN_CELLS, PATTERN_ROWS, VIEWS, drawProfileOn, pattern, patternCanvas, presetSel, resize;
// Values that main.js reassigns, read through getters
let live;

// Export: dialog with image, plate of views, PDF, 3D printing and GLB
// ---------------------------------------------------------------------------

const exportDlg = $('exportDlg');

export function download(href, name) {
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

export function fileStem() {
  const own = slugify(customName());
  if (own) return own;
  const preset = PRESETS[presetSel.value] ? `${presetSel.value}_` : '';
  return `shell_${preset}W${formatW(state.W)}_D${f(state.D, 3)}_T${f(state.T, 2)}_S${f(state.S, 2)}${state.mirror ? '_mirror' : ''}`;
}

/** Readable name of the current shell: the user's own name, the preset's name or "custom". */
function shellName() {
  return customName() || defaultShellName();
}
export const defaultShellName = () => (PRESETS[presetSel.value] ? tPreset(presetSel.value) : t('ex.customShell'));

/** Encodes a canvas in the format chosen in the export dialog and downloads it. */
export async function downloadImage(canvas, stem, fmt = 'png') {
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
    src.toBlob((b) => (b ? resolve(b) : reject(new Error('encoding failed'))), type, 0.95),
  );
  downloadBlob(blob, type, `${stem}.${fmt}`);
}

/** Runs `fn` with the button in a "Preparing…" state and reports failures. */
export async function busy(btn, fn) {
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
const colourShown = () => state.mode !== 'lines' && pattern.on && !!live.patternValues();

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
export function chosenSize(value, customW, customH) {
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
const plateImageSize = () =>
  $('exPlateRes').value === 'std' ? null : chosenSize($('exPlateRes').value, $('exPlateW').value, $('exPlateH').value);

const PLATE_TILE = 900; // view size of the standard plate

function updateViewImageSize() {
  const { W, H } = viewImageSize();
  $('exResDims').textContent = `${W} × ${H} px`;
  $('exCustomRow').hidden = $('exRes').value !== 'custom';
  const p = plateImageSize();
  const labelH = $('exLabels').checked ? Math.round(PLATE_TILE * 0.1) : 0;
  const [pw, ph] = p ? [p.W, p.H] : [3 * PLATE_TILE, 2 * (PLATE_TILE + labelH)];
  $('exPlateDims').textContent = `${pw} × ${ph} px`;
  qsa('[data-plate-custom]').forEach((el) => (el.hidden = $('exPlateRes').value !== 'custom'));
}

/**
 * Renders the current view at any size. The image is drawn in tiles (pieces of
 * the same camera frustum), so it does not depend on how large a drawing buffer
 * the browser grants. A different aspect ratio widens or narrows the framing so
 * that everything seen on screen stays in the image.
 * @returns {HTMLCanvasElement}
 */
export function renderViewImage(W, H) {
  return withExportAxis(() => renderViewImageRaw(W, H));
}

function renderViewImageRaw(W, H) {
  const { clientHeight: h } = viewport;
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
        const tw = Math.min(tile, W - x),
          th = Math.min(tile, H - y);
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
  const up =
    name === 'apical' || name === 'umbilical'
      ? new THREE.Vector3(0, 0, -state.hand) // the aperture ends up at the bottom
      : new THREE.Vector3(0, 1, 0); // the apex ends up at the top
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  cam.up.copy(up);
  cam.position.copy(dir).multiplyScalar(30);
  cam.lookAt(0, 0, 0);
  cam.updateMatrixWorld();
  // Tight framing: vertices are projected onto the camera plane
  const P = solid.geometry.attributes.position.array;
  const inv = cam.matrixWorldInverse.elements;
  let x0 = Infinity,
    x1 = -Infinity,
    y0 = Infinity,
    y1 = -Infinity;
  for (let k = 0; k < P.length; k += 3) {
    const x = inv[0] * P[k] + inv[4] * P[k + 1] + inv[8] * P[k + 2] + inv[12];
    const y = inv[1] * P[k] + inv[5] * P[k + 1] + inv[9] * P[k + 2] + inv[13];
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  const half = (Math.max(x1 - x0, y1 - y0) / 2) * 1.08;
  const cx = (x0 + x1) / 2,
    cy = (y0 + y1) / 2;
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
  let cols = Math.min(3, n),
    rowsN = Math.ceil(n / cols),
    x0 = 0,
    y0 = 0;
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
    bg: /** @type {THREE.Color} */ (scene.background).clone(),
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
  const c = renderPlate({
    tile: 220,
    background: plateBackground(),
    labels: $('exLabels').checked,
    width: size ? Math.round(size.W * k) : 0,
    height: size ? Math.round(size.H * k) : 0,
  });
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
    const { dims, spine } = printMesh();
    const [x, y, z] = dims.map((d) => d.toFixed(0));
    $('exDims').textContent = t('ex.dims', x, y, z);
    // Only with spines: warn when the largest ones are narrow or slender
    const { wall } = printOptions();
    const thin = spine && spine.height > 0 && (spine.base < Math.max(2, 2 * wall) || spine.height > 2.5 * spine.base);
    $('exSpineWarn').hidden = !thin;
    if (thin) $('exSpineWarn').textContent = t('ex.spineWarn', spine.height.toFixed(1), spine.base.toFixed(1));
  }, 120);
}

// --- GLB with colour ----------------------------------------------------------

async function exportGLB() {
  const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
  const group = new THREE.Group();
  // Lines ("Lines" and "Both" modes): plain segments with the line colour
  if (state.mode !== 'solid' && live.lastBuild().lineIndices.length) {
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.BufferAttribute(live.lastBuild().positions.slice(), 3));
    lg.setIndex(new THREE.BufferAttribute(live.lastBuild().lineIndices.slice(), 1));
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

let pdfContext;
export const exportPDF = () => makePDF(pdfContext());

/** Some views of the plate, in one row (for the pattern page). */
export function renderPlateSubset(names, tile, background = '#ffffff') {
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

export function openExport() {
  // By default the axis is exported if it is visible in the 3D view
  $('exAxis').checked = $('showAxis').checked;
  $('exLinesNote').hidden = state.mode !== 'lines';
  $('exPatternCard').classList.toggle('disabled', !(pattern.on && live.patternValues()));
  $('exPattern').disabled = !(pattern.on && live.patternValues());
  $('exPatternNone').hidden = pattern.on && !!live.patternValues();
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
  const sw = Math.round(screen.width * dpr),
    sh = Math.round(screen.height * dpr);
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

// ---------------------------------------------------------------------------

/** Connects this part of the interface to the rest of the app. */
export function initExport(ctx) {
  ({ PATTERN_CELLS, PATTERN_ROWS, VIEWS, drawProfileOn, pattern, patternCanvas, presetSel, resize } = ctx);
  live = ctx.live;
  // --- PDF (js/ui/pdf.js) ------------------------------------------------------
  // The sheet reads the app through this context, built when the PDF is made
  pdfContext = () => ({
    state,
    pattern,
    lastBuild: live.lastBuild(),
    patternCanvas,
    profileRow: live.profileRow(),
    PATTERN_CELLS,
    PATTERN_ROWS,
    colourShown,
    drawMorphoOn,
    drawProfileOn,
    fileStem,
    generalTeX,
    liveTeX,
    renderPlate,
    renderPlateSubset,
    shellName,
    writeHashNow,
  });
  $('openExport').addEventListener('click', openExport);
  $('closeExport').addEventListener('click', () => exportDlg.close());
  exportDlg.addEventListener('click', (e) => {
    if (e.target === exportDlg) exportDlg.close();
  });
  $('exBg').addEventListener('change', updatePlatePreview);
  $('exAxis').addEventListener('change', updatePlatePreview);
  $('exLabels').addEventListener('change', () => {
    updateViewImageSize();
    updatePlatePreview();
  });
  for (const id of ['exSize', 'exWall']) $(id).addEventListener('input', updatePrintDims);

  $('exRes').addEventListener('change', updateViewImageSize);
  for (const id of ['exW', 'exH']) $(id).addEventListener('input', updateViewImageSize);
  $('exPlateRes').addEventListener('change', () => {
    updateViewImageSize();
    updatePlatePreview();
  });
  for (const id of ['exPlateW', 'exPlateH'])
    $(id).addEventListener('change', () => {
      updateViewImageSize();
      updatePlatePreview();
    });
  $('exPng').addEventListener('click', (e) =>
    busy(e.currentTarget, async () => {
      const { W, H } = viewImageSize();
      await downloadImage(renderViewImage(W, H), `${fileStem()}_${W}x${H}`, $('exFormat').value);
    }),
  );
  $('exPlate').addEventListener('click', (e) =>
    busy(e.currentTarget, async () => {
      const size = plateImageSize();
      const c = renderPlate({
        tile: PLATE_TILE,
        background: plateBackground(),
        labels: $('exLabels').checked,
        width: size?.W,
        height: size?.H,
      });
      await downloadImage(c, `${fileStem()}_views${size ? `_${size.W}x${size.H}` : ''}`, $('exPlateFormat').value);
    }),
  );
  $('exPdf').addEventListener('click', (e) => busy(e.currentTarget, exportPDF));
  $('exStl').addEventListener('click', (e) =>
    busy(e.currentTarget, () => {
      downloadBlob(toSTL(printMesh(), shellName()), 'model/stl', `${fileStem()}_${printOptions().size}mm.stl`);
    }),
  );
  $('ex3mf').addEventListener('click', (e) =>
    busy(e.currentTarget, async () => {
      downloadBlob(await to3MF(printMesh(), shellName()), 'model/3mf', `${fileStem()}_${printOptions().size}mm.3mf`);
    }),
  );
  $('exGlb').addEventListener('click', (e) => busy(e.currentTarget, exportGLB));
  $('exPattern').addEventListener('click', (e) => {
    if (!live.patternValues()) return;
    const own = slugify(customName());
    busy(e.currentTarget, () =>
      downloadImage(patternCanvas, own ? `${own}_pattern` : `meinhardt_${pattern.preset}_seed${pattern.seed}`, $('exPatternFormat').value),
    );
  });
}

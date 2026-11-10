/**
 * The W–D morphospace chart (a section of Raup's cube at the current T), in the
 * sidebar and over the 3D view. Clicking moves the shell to that point, or loads
 * a typical shell of a group when its name is clicked. Also drawn into the PDF.
 */
import * as THREE from 'three';
import { t } from '../i18n/i18n.js';
import { MORPHO_REGIONS } from '../model/morphospace.js';
import { state } from './state.js';
import { $, f } from './util.js';

// Provided by main.js through init()
let capturePointer, controlsByKey, onShapeChange, presetSel;

const morpho = $('morpho');
export const morphoOv = $('morphoOv');
const morphoDrawer = $('morphoDrawer');
const MORPHO = { l: 34, r: 10, t: 10, b: 26, logMax: 4 };
// W axis range: 1–10⁴ (all groups) or 1–10 (snails and cephalopods in more detail)
const MORPHO_TICKS = {
  4: [
    [0, '1'],
    [1, '10'],
    [2, '10²'],
    [3, '10³'],
    [4, '10⁴'],
  ],
  1: [
    [0, '1'],
    [Math.log10(2), '2'],
    [Math.log10(3), '3'],
    [Math.log10(5), '5'],
    [1, '10'],
  ],
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
export function drawMorpho() {
  if (morphoDrawer.open) drawMorphoOn(morpho);
  if (!$('ovMorpho').hidden) drawMorphoOn(morphoOv);
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {object} [off] for off-screen drawing (PDF): { width, height, scale, colors }
 */
export function drawMorphoOn(canvas, off) {
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
  const px = e.clientX - rect.left,
    py = e.clientY - rect.top;
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
// W axis range (shared by the sidebar panel and the overlaid chart)
function setMorphoScale(logMax) {
  MORPHO.logMax = logMax;
  document.querySelectorAll('[data-wscale]').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.wscale) === logMax)));
  drawMorpho();
}
// ---------------------------------------------------------------------------

/** Connects this part of the interface to the rest of the app. */
export function initMorphospace(ctx) {
  ({ capturePointer, controlsByKey, onShapeChange, presetSel } = ctx);
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

  document.querySelectorAll('[data-wscale]').forEach((b) => b.addEventListener('click', () => setMorphoScale(Number(b.dataset.wscale))));
}

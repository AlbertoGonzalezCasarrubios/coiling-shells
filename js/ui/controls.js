/**
 * Slider controls of the sidebar: createParam() builds a labelled slider with
 * its number box (linear or logarithmic scale), bound to a key of a state
 * object. It also creates the shape, geometry and line controls.
 */
import { t, tParam } from '../i18n/i18n.js';
import { ornPresetKey, ornPresetSel } from './ornament-tab.js';
import { lineMat } from './scene.js';
import { GEO_PARAMS, RAUP_PARAMS, VIS_PARAMS, state } from './state.js';
import { $, f } from './util.js';

// Provided by main.js through init()
let markDirty;

// Sidebar controls
// ---------------------------------------------------------------------------

export const controlsByKey = {};

/** Captures the pointer if it is still active (a cancelled touch cannot be captured). */
export function capturePointer(el, e) {
  try {
    el.setPointerCapture(e.pointerId);
  } catch {
    /* no capture: dragging still works while the pointer stays over the element */
  }
}

export function setFill(range) {
  const pct = ((range.value - range.min) / (range.max - range.min)) * 100;
  range.style.setProperty('--pct', `${pct}%`);
}

export function createParam(def, container, { compact = false, onChange, target = state }) {
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

export function markCustom() {
  $('preset').value = 'custom';
}

export function onShapeChange() {
  markCustom();
  ornPresetSel.value = ornPresetKey();
  markDirty();
}

/** Connects this part of the interface to the rest of the app. */
export function initControls(ctx) {
  ({ markDirty } = ctx);
  RAUP_PARAMS.forEach((d) => createParam(d, $('raup-params'), { onChange: onShapeChange }));
  GEO_PARAMS.forEach((d) => createParam(d, $('geo-params'), { onChange: onShapeChange }));
  VIS_PARAMS.forEach((d) =>
    createParam(d, $('vis-params'), {
      compact: true,
      onChange: (key) => {
        if (key === 'lineOpacity') lineMat.opacity = state.lineOpacity;
        else if (key === 'lineWidth') lineMat.linewidth = state.lineWidth;
        else markDirty();
      },
    })
  );

}

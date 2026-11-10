/**
 * Shell creator: a window that walks through shape → ornament → colour → look
 * → export with simplified controls. It is not a separate program: the 3D
 * canvas of the app moves into the window (setViewport), and every control
 * acts on the same state through the handlers of the sidebar, so undo, the
 * page address and every export keep working.
 */
import { t, tPattern } from '../i18n/i18n.js';
import { MODEL_DEFAULTS, ORNAMENT_PRESETS, PATTERN_PRESETS, PRESETS } from '../model/presets.js';
import { welcomeDlg } from './guide.js';
import { setViewport } from './scene.js';
import { GEO_PARAMS, ORN_PARAMS, RAUP_PARAMS, state, writeHash } from './state.js';
import { $, qsa } from './util.js';

// Provided by main.js through init()
let PIG_SIMPLE,
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
  syncPatternControls;

export const wizardDlg = $('wizard');
const WZ_STEPS = 5;
let wzStep = 0;

// Plain-language names for the creator (wzW, wzD…), the symbols stay in brackets
const WZ_SHAPE = ['W', 'D', 'T', 'S', 'turns'].map((k) => ({
  ...[...RAUP_PARAMS, ...GEO_PARAMS].find((d) => d.key === k),
  id: `wz-${k}`,
  i18n: `wz${k}`,
}));
const WZ_ORN = ['ribN', 'ribH', 'cordN', 'cordH', 'spineN', 'spineH'].map((k) => ({
  ...ORN_PARAMS.find((d) => d.key === k),
  id: `wz-${k}`,
  i18n: k,
}));

/** Copies the options of a sidebar menu (already translated) into a wizard menu. */
function copyOptions(from, to, { showHidden = [] } = {}) {
  to.innerHTML = from.innerHTML;
  for (const o of qsa('option', to)) if (showHidden.includes(o.value)) o.hidden = false;
  to.value = from.value;
}

let WZ_PIG;
function buildWzPatterns() {
  const box = $('wzPatterns');
  box.innerHTML = '';
  for (const key of ['none', ...Object.keys(PATTERN_PRESETS), 'waves']) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.key = key;
    b.textContent = key === 'none' ? t('pig.none') : key === 'waves' ? t('wz.p.waves') : tPattern(key);
    b.addEventListener('click', () => {
      if (key === 'waves') {
        Object.assign(pattern, pickPattern(MODEL_DEFAULTS.AS));
        pattern.preset = 'custom';
        syncPatternControls();
        setPatternOn(true);
        computePattern();
      } else {
        selectPattern(key);
      }
      syncWizard();
    });
    box.append(b);
  }
}

/** Brings the wizard controls in line with the state (the sidebar may have changed it). */
export function syncWizard() {
  copyOptions(presetSel, $('wzPreset'));
  copyOptions(ornPresetSel, $('wzOrn'), { showHidden: ['smooth'] });
  for (const d of [...WZ_SHAPE, ...WZ_ORN]) controlsByKey[d.id].set(state[d.key]);
  $('wzNodules').checked = state.nodules;
  qsa('#wzHand [data-hand]').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.hand === state.hand)));
  const sel = !pattern.on ? 'none' : PATTERN_PRESETS[pattern.preset] ? pattern.preset : pattern.model === 'AS' ? 'waves' : '';
  $('wzPatterns')
    .querySelectorAll('button')
    .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.key === sel)));
  for (const d of WZ_PIG) controlsByKey[d.id].set(pattern[d.key]);
  qsa('.wz-pig').forEach((el) => (el.hidden = !pattern.on));
  $('wzBase').value = pattern.base;
  $('wzPigment').value = pattern.pigment;
  $('wzBase').disabled = $('wzPigment').disabled = !pattern.on;
  qsa('#wzMode [data-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === state.mode)));
  $('wzBg').value = $('bgColor').value;
  $('wzShell').value = $('shellColor').value;
  $('wzLine').value = $('lineColor').value;
  $('wzQuality').value = state.quality;
  $('wzAxis').checked = $('showAxis').checked;
  $('wzName').value = $('exName').value;
  $('wzName').placeholder = defaultShellName();
}

function showWizardStep(i) {
  wzStep = Math.max(0, Math.min(WZ_STEPS - 1, i));
  qsa('.wizard-panel').forEach((p) => (p.hidden = +p.dataset.step !== wzStep));
  qsa('#wizSteps [data-step]').forEach((b) => {
    const k = +b.dataset.step;
    b.setAttribute('aria-current', k === wzStep ? 'step' : 'false');
    b.classList.toggle('done', k < wzStep);
  });
  $('wzBack').disabled = wzStep === 0;
  $('wzNext').textContent = t(wzStep === WZ_STEPS - 1 ? 'wz.finish' : 'wz.next');
  // Relief and colour are read on the surface
  if ((wzStep === 1 || wzStep === 2) && state.mode === 'lines') {
    state.mode = 'solid';
    applyMode();
    writeHash();
  }
  syncWizard();
}

function openWizard() {
  if (welcomeDlg.open) welcomeDlg.close();
  buildWzPatterns();
  wizardDlg.showModal();
  // The app's own 3D canvas moves into the window
  setViewport($('wizView'));
  resize();
  showWizardStep(0);
}

function closeWizardView() {
  setViewport($('viewport'));
  resize();
}

// Colours and appearance: the wizard sets the sidebar inputs and lets their own handlers act
const relay = (fromId, toId, type = 'input') =>
  $(fromId).addEventListener(type, (e) => {
    $(toId).value = e.target.value;
    $(toId).dispatchEvent(new Event(type));
  });
// ---------------------------------------------------------------------------

/** Connects this part of the interface to the rest of the app. */
export function initWizard(ctx) {
  ({
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
    syncPatternControls,
  } = ctx);
  WZ_SHAPE.forEach((d) =>
    createParam(d, $('wz-shape'), {
      compact: true,
      onChange: (key) => {
        controlsByKey[key].set(state[key]);
        onShapeChange();
        $('wzPreset').value = 'custom';
      },
    }),
  );
  WZ_ORN.forEach((d) =>
    createParam(d, $('wz-orn'), {
      compact: true,
      onChange: (key) => {
        controlsByKey[key].set(state[key]);
        onOrnamentChange();
        $('wzOrn').value = ornPresetSel.value;
      },
    }),
  );

  // Colour step: solid colour, the pattern presets and the travelling waves of the
  // activator–substrate model (its default constants), plus the simple sliders
  WZ_PIG = PIG_SIMPLE.map((d) => ({ ...d, id: `wz-${d.id}` }));
  WZ_PIG.forEach((d) =>
    createParam(d, $('wz-pig'), {
      compact: true,
      target: pattern,
      onChange: (key) => {
        pigControls[d.id.slice(3)].set(pattern[key]);
        if (key === 'amount') {
          paintPattern();
          writeHash();
          return;
        }
        markPatternCustom();
        schedulePattern();
        syncWizard();
      },
    }),
  );

  $('openWizard').addEventListener('click', openWizard);
  $('closeWizard').addEventListener('click', () => wizardDlg.close());
  wizardDlg.addEventListener('close', closeWizardView);
  $('wzBack').addEventListener('click', () => showWizardStep(wzStep - 1));
  $('wzNext').addEventListener('click', () => (wzStep === WZ_STEPS - 1 ? wizardDlg.close() : showWizardStep(wzStep + 1)));
  qsa('#wizSteps [data-step]').forEach((b) => b.addEventListener('click', () => showWizardStep(+b.dataset.step)));

  $('wzPreset').addEventListener('change', (e) => {
    if (!PRESETS[e.target.value]) return;
    presetSel.value = e.target.value;
    presetSel.dispatchEvent(new Event('change'));
    syncWizard();
  });
  qsa('#wzHand [data-hand]').forEach((b) =>
    b.addEventListener('click', () => {
      $('hand').value = b.dataset.hand;
      $('hand').dispatchEvent(new Event('change'));
      syncWizard();
    }),
  );
  $('wzOrn').addEventListener('change', (e) => {
    if (e.target.value === 'smooth') {
      $('ornClear').click();
    } else if (ORNAMENT_PRESETS[e.target.value]) {
      ornPresetSel.value = e.target.value;
      ornPresetSel.dispatchEvent(new Event('change'));
    }
    syncWizard();
  });
  $('wzNodules').addEventListener('change', (e) => {
    $('nodules').checked = e.target.checked;
    $('nodules').dispatchEvent(new Event('change'));
  });
  relay('wzBase', 'pigBase');
  relay('wzPigment', 'pigColor');
  relay('wzBg', 'bgColor');
  relay('wzShell', 'shellColor');
  relay('wzLine', 'lineColor');
  relay('wzQuality', 'quality', 'change');
  $('wzAxis').addEventListener('change', (e) => {
    $('showAxis').checked = e.target.checked;
    $('showAxis').dispatchEvent(new Event('change'));
  });
  qsa('#wzMode [data-mode]').forEach((b) =>
    b.addEventListener('click', () => {
      /** @type {HTMLElement} */ (document.querySelector(`#mode [data-mode="${b.dataset.mode}"]`)).click();
      syncWizard();
    }),
  );
  // The palette buttons share the sidebar handler (they carry data-palette); then resync
  qsa('#wzPalettes [data-palette]').forEach((b) => b.addEventListener('click', syncWizard));
  $('wzName').addEventListener('input', (e) => ($('exName').value = e.target.value));
  $('wzSeed').addEventListener('click', () => $('newSeed').click());

  // Export: the same functions as the export window
  $('wzWallpaper').addEventListener('click', (e) =>
    busy(e.currentTarget, async () => {
      const { W, H } = chosenSize('screen');
      await downloadImage(renderViewImage(W, H), `${fileStem()}_${W}x${H}`, 'png');
    }),
  );
  $('wzPdf').addEventListener('click', (e) => busy(e.currentTarget, exportPDF));
  $('wzMore').addEventListener('click', () => {
    wizardDlg.close();
    openExport();
  });
}

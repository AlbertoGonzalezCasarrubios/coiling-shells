/**
 * The "match the shell" challenge: a window with a target shell (a picture, its
 * name hidden) and the player's shell in 3D, with the sliders of the level.
 * "Check" gives the likeness and a hint; passing reveals the shell. The score,
 * hints, levels and targets live in model/challenge.js.
 *
 * Like the shell creator, the window borrows the app's 3D canvas. The player's
 * shell is the app's state, so on opening the state is saved (undo's snapshot)
 * and the page address and the undo history are paused; on closing everything
 * comes back as it was.
 */
import { t, tParam, tPreset } from '../i18n/i18n.js';
import { LEVELS, PASS, bestHint, levelScore, makeTarget, silhouettes, startShell } from '../model/challenge.js';
import { ORNAMENT_DEFAULTS } from '../model/ornament.js';
import { PRESETS } from '../model/presets.js';
import { welcomeDlg } from './guide.js';
import { setViewport } from './scene.js';
import { GEO_PARAMS, ORN_PARAMS, RAUP_PARAMS, pauseAddress, state, storage } from './state.js';
import { loadState, saveState } from './undo.js';
import { $, qsa } from './util.js';

// Provided by main.js through init()
let applyMode, controlsByKey, createParam, markDirty, rebuildNow, renderPlateSubset, resize, setPatternOn;

export const challengeDlg = $('challenge');
const PROGRESS_KEY = 'coiling-shells.challenge';

// One slider per parameter that a level can free (plain names, as in the shell creator)
const SLIDERS = [
  ...['W', 'D', 'T', 'S', 'turns'].map((k) => ({ ...[...RAUP_PARAMS, ...GEO_PARAMS].find((d) => d.key === k), i18n: `wz${k}` })),
  ...['ribN', 'ribH', 'cordN', 'cordH', 'spineN', 'spineH'].map((k) => ({ ...ORN_PARAMS.find((d) => d.key === k), i18n: k })),
].map((d) => ({ ...d, id: `ch-${d.key}` }));

let level = 1;
let target = null; // { name, shell, varied }
let targetSil = null;
let saved = null; // the player's own shell, to bring back on closing
let passed = false;

const best = () => +(storage.get(PROGRESS_KEY) ?? 0);

function paramName(key) {
  if (key === 'hand') return t('geo.hand');
  const d = SLIDERS.find((s) => s.key === key);
  return tParam(d.i18n).name || key;
}

function shellName() {
  const n = target.name;
  return PRESETS[n] ? tPreset(n) : t(`orn.p.${n}`);
}

/** The relief and the shape of a target go to the state; colour is left plain. */
function applyShell(shell) {
  Object.assign(state, ORNAMENT_DEFAULTS, shell);
  $('hand').value = String(state.hand);
}

/** A picture of the target, drawn by the same renderer as the plate of views. */
function drawTarget() {
  applyShell(target.shell);
  rebuildNow();
  const bg = $('bgColor').value;
  const img = renderPlateSubset(['iso', 'apertural'], 360, bg);
  $('chTarget').src = img.toDataURL('image/png');
}

function syncControls() {
  const free = LEVELS[level - 1].keys;
  for (const d of SLIDERS) {
    controlsByKey[d.id].set(state[d.key]);
    controlsByKey[d.id].el.hidden = !free.includes(d.key);
  }
  $('chHand').hidden = !free.includes('hand');
  qsa('#chHand [data-hand]').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.hand === state.hand)));
  qsa('#chLevels [data-level]').forEach((b) => {
    const k = +b.dataset.level;
    b.setAttribute('aria-current', k === level ? 'step' : 'false');
    b.classList.toggle('done', k <= best());
  });
  $('chIntro').textContent = t(`ch.level${level}`);
  // The note about outlines does not apply to the relief level, whose text explains its score
  /** @type {HTMLElement} */ (document.querySelector('.ch-how')).hidden = !!LEVELS[level - 1].ornament;
}

function newRound() {
  target = makeTarget(level);
  targetSil = LEVELS[level - 1].ornament ? null : silhouettes(target.shell);
  passed = false;
  drawTarget();
  applyShell(startShell(level, target.shell));
  markDirty();
  syncControls();
  $('chResult').hidden = true;
  $('chNext').hidden = true;
  $('chCheck').hidden = false;
  /** @type {HTMLElement} */ (document.querySelector('[data-view=iso]')).click();
}

function check() {
  const guess = { ...target.shell };
  for (const k of LEVELS[level - 1].keys) guess[k] = state[k];
  const score = levelScore(level, guess, target.shell, targetSil ?? undefined);
  const hint = bestHint(guess, target.shell, LEVELS[level - 1].keys);
  passed = score >= PASS || !hint;
  $('chScore').textContent = t('ch.score', score);
  $('chBar').style.setProperty('--pct', `${score}%`);
  if (passed) {
    $('chMessage').textContent = t(target.varied ? 'ch.passed.varied' : 'ch.passed', shellName());
    if (level > best()) storage.set(PROGRESS_KEY, String(level));
    $('chNext').hidden = level === LEVELS.length;
    $('chNext').textContent = t('ch.next');
  } else {
    const dir =
      hint.dir === 'flip'
        ? t('ch.flip')
        : t(hint.dir === 'up' ? (hint.far ? 'ch.upFar' : 'ch.up') : hint.far ? 'ch.downFar' : 'ch.down', paramName(hint.key));
    $('chMessage').textContent = dir;
  }
  $('chResult').hidden = false;
  $('chResult').classList.toggle('passed', passed);
  syncControls();
}

function setLevel(k) {
  level = Math.min(LEVELS.length, Math.max(1, k));
  newRound();
}

function openChallenge() {
  if (welcomeDlg.open) welcomeDlg.close();
  saved = saveState();
  pauseAddress(true);
  setPatternOn(false);
  state.mode = 'solid';
  applyMode();
  challengeDlg.showModal();
  setViewport($('chView'));
  resize();
  setLevel(Math.min(LEVELS.length, best() + 1));
}

function closeChallenge() {
  setViewport($('viewport'));
  resize();
  pauseAddress(false);
  if (saved) loadState(saved);
  saved = null;
}

/** Connects this part of the interface to the rest of the app. */
export function initChallenge(ctx) {
  ({ applyMode, controlsByKey, createParam, markDirty, rebuildNow, renderPlateSubset, resize, setPatternOn } = ctx);
  SLIDERS.forEach((d) =>
    createParam(d, $('ch-params'), {
      compact: true,
      onChange: () => {
        markDirty();
        $('chResult').hidden = true;
      },
    }),
  );
  qsa('#chHand [data-hand]').forEach((b) =>
    b.addEventListener('click', () => {
      state.hand = +b.dataset.hand;
      $('hand').value = b.dataset.hand;
      markDirty();
      syncControls();
    }),
  );
  qsa('#chLevels [data-level]').forEach((b) => b.addEventListener('click', () => setLevel(+b.dataset.level)));
  $('openChallenge').addEventListener('click', openChallenge);
  $('closeChallenge').addEventListener('click', () => challengeDlg.close());
  challengeDlg.addEventListener('close', closeChallenge);
  $('chCheck').addEventListener('click', check);
  $('chNew').addEventListener('click', newRound);
  $('chNext').addEventListener('click', () => setLevel(level + 1));
}

/** For the browser test: the current target and whether the level was passed. */
export const challengeState = () => ({ level, target: target?.shell, passed });

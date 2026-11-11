/**
 * The "match the shell" challenge: a window split in two, the target shell (its
 * name hidden) and the player's shell, both in 3D and seen from the same camera,
 * so turning one turns the other; and the sliders of the level.
 * "Check" gives the likeness and a hint; passing reveals the shell. The score,
 * hints, levels and targets live in model/challenge.js.
 *
 * Like the shell creator, the window borrows the app's 3D canvas. The player's
 * shell is the app's state; the target is a second mesh in the same scene, and
 * each frame draws the scene twice, one half showing only the target and the
 * other only the player's shell (renderChallengeSplit). The player's shell so on opening the state is saved (undo's snapshot)
 * and the page address and the undo history are paused; on closing everything
 * comes back as it was.
 */
import * as THREE from 'three';
import { t, tParam, tPreset } from '../i18n/i18n.js';
import { LEVELS, PASS, bestHint, levelScore, makeTarget, silhouettes, startShell } from '../model/challenge.js';
import { ORNAMENT_DEFAULTS } from '../model/ornament.js';
import { PRESETS } from '../model/presets.js';
import { welcomeDlg } from './guide.js';
import { camera, inner, innerMat, renderer, scene, setViewport, shellGroup, solid, solidMat } from './scene.js';
import { GEO_PARAMS, ORN_PARAMS, RAUP_PARAMS, pauseAddress, state, storage } from './state.js';
import { loadState, saveState } from './undo.js';
import { $, qsa } from './util.js';

// Provided by main.js through init()
let applyMode, controlsByKey, createParam, markDirty, resize, setPatternOn, targetGeometry;

export const challengeDlg = $('challenge');
const chView = $('chView');
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

// The target: a second mesh in the shell group, with the same materials as the player's shell
const targetSolid = new THREE.Mesh(new THREE.BufferGeometry(), solidMat);
targetSolid.castShadow = true;
targetSolid.receiveShadow = true;
const targetInner = new THREE.Mesh(targetSolid.geometry, innerMat);
targetInner.receiveShadow = true;
targetSolid.visible = targetInner.visible = false;
shellGroup.add(targetSolid, targetInner);

function drawTarget() {
  targetSolid.geometry.dispose();
  targetSolid.geometry = targetInner.geometry = targetGeometry(target.shell);
}

/**
 * Draws the scene twice, the target in one half and the player's shell in the
 * other (side by side, or one above the other on a portrait screen), with the
 * same camera so that both turn together.
 * @param {number} w
 * @param {number} h
 */
export function renderChallengeSplit(w, h) {
  const portrait = h > w;
  const hw = portrait ? w : w / 2,
    hh = portrait ? h / 2 : h;
  const { aspect, fov } = camera;
  camera.aspect = hw / hh;
  // On narrow halves the horizontal framing is kept, as in the full view
  camera.fov = camera.aspect >= 1 ? 35 : THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(17.5)) / camera.aspect));
  camera.updateProjectionMatrix();
  const own = [solid, inner];
  const halves = [
    { meshes: [targetSolid, targetInner], x: 0, y: portrait ? hh : 0 },
    { meshes: own, x: portrait ? 0 : hw, y: 0 },
  ];
  // The labels and the divider of the window follow the orientation of the split
  if (chView.classList.contains('portrait') !== portrait) chView.classList.toggle('portrait', portrait);
  renderer.setScissorTest(true);
  for (const half of halves) {
    for (const m of [targetSolid, targetInner, ...own]) m.visible = half.meshes.includes(m);
    renderer.setViewport(half.x, half.y, hw, hh);
    renderer.setScissor(half.x, half.y, hw, hh);
    renderer.render(scene, camera);
  }
  renderer.setScissorTest(false);
  targetSolid.visible = targetInner.visible = false;
  solid.visible = inner.visible = true;
  camera.aspect = aspect;
  camera.fov = fov;
  camera.updateProjectionMatrix();
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
  targetSolid.geometry.dispose();
  targetSolid.geometry = targetInner.geometry = new THREE.BufferGeometry();
  setViewport($('viewport'));
  resize();
  pauseAddress(false);
  if (saved) loadState(saved);
  saved = null;
}

/** Connects this part of the interface to the rest of the app. */
export function initChallenge(ctx) {
  ({ applyMode, controlsByKey, createParam, markDirty, resize, setPatternOn, targetGeometry } = ctx);
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

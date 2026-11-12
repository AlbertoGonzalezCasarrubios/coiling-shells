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
import { t, tParam, tPattern, tPreset } from '../i18n/i18n.js';
import { LEVELS, bestHint, levelScore, makeTarget, passScore, silhouettes, startShell } from '../model/challenge.js';
import { simulatePattern } from '../model/meinhardt.js';
import { ORNAMENT_DEFAULTS } from '../model/ornament.js';
import { ORNAMENT_PRESETS, PATTERN_PRESETS, PRESETS } from '../model/presets.js';
import { colorize } from './pigment.js';
import { welcomeDlg } from './guide.js';
import { camera, ground, inner, innerMat, renderer, scene, setViewport, shellGroup, solid, solidMat } from './scene.js';
import { GEO_PARAMS, ORN_PARAMS, RAUP_PARAMS, pauseAddress, state, storage } from './state.js';
import { loadState, saveState } from './undo.js';
import { lowestPoint } from './views.js';
import { $, qsa } from './util.js';

// Provided by main.js through init()
let PIG_SIMPLE,
  applyMode,
  computePattern,
  controlsByKey,
  createParam,
  markDirty,
  paintPattern,
  pattern,
  pigControls,
  resize,
  schedulePattern,
  selectPattern,
  setPatternOn,
  targetGeometry;

export const challengeDlg = $('challenge');
const chView = $('chView');
const PROGRESS_KEY = 'coiling-shells.challenge';

// One slider per parameter that a level can free (plain names, as in the shell creator)
// grouped as in the main interface: Raup parameters, geometry, and each kind of relief
const SLIDERS = [
  ...['W', 'D', 'T', 'S', 'turns'].map((k) => ({
    ...[...RAUP_PARAMS, ...GEO_PARAMS].find((d) => d.key === k),
    i18n: `wz${k}`,
    group: k === 'turns' ? 'geo' : 'raup',
  })),
  ...['ribN', 'ribH', 'cordN', 'cordH', 'spineN', 'spineH'].map((k) => ({
    ...ORN_PARAMS.find((d) => d.key === k),
    i18n: k,
    group: k.slice(0, -1),
  })),
].map((d) => ({ ...d, id: `ch-${d.key}` }));
/** The group of each parameter a level can free. */
const GROUP_OF = {
  ...Object.fromEntries(SLIDERS.map((d) => [d.key, d.group])),
  hand: 'geo',
  patternPreset: 'pattern',
  patternSize: 'pattern',
  patternT: 'pattern',
  patternNoise: 'pattern',
  patternAmount: 'pattern',
  patternBase: 'colours',
  patternPigment: 'colours',
};

// The colour level moves the simple pigment controls of the app's own pattern
const COLOUR = {
  patternSize: 'size',
  patternT: 'T',
  patternNoise: 'noise',
  patternAmount: 'amount',
  patternBase: 'base',
  patternPigment: 'pigment',
};
let PIG_SLIDERS = [];
let kind = null; // the kind of pattern the player has chosen (the app's preset name turns "custom" when a slider moves)

let level = 1;
let target = null; // { name, shell, varied }
let targetSil = null;
let saved = null; // the player's own shell, to bring back on closing
let passed = false;

const best = () => +(storage.get(PROGRESS_KEY) ?? 0);

function paramName(key) {
  if (key === 'hand') return t('geo.hand');
  if (key === 'patternBase') return t('pig.base');
  if (key === 'patternPigment') return t('pig.pigment');
  if (COLOUR[key]) return tParam(PIG_SLIDERS.find((d) => d.key === COLOUR[key]).i18n).name;
  const d = SLIDERS.find((s) => s.key === key);
  return tParam(d.i18n).name || key;
}

function shellName() {
  const { name, pattern: pat } = target;
  const shell = PRESETS[name] ? tPreset(name) : ORNAMENT_PRESETS[name] ? t(`orn.p.${name}`) : tPattern(name);
  return pat && pat !== name ? `${shell} + ${tPattern(pat)}` : shell;
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

// In the colour level the target has a pattern of its own, on its own copies of the materials
const targetTexture = new THREE.DataTexture(new Uint8Array(4), 1, 1, THREE.RGBAFormat);
targetTexture.colorSpace = THREE.SRGBColorSpace;
targetTexture.wrapS = THREE.RepeatWrapping;
targetTexture.magFilter = THREE.LinearFilter;
let targetMat = null,
  targetInnerMat = null;

/** The target's pattern, simulated with the same model and the same seed as the player's. */
function paintTarget() {
  const s = target.shell;
  const preset = PATTERN_PRESETS[s.patternPreset];
  const rows = 1024,
    width = 512;
  const p = {
    ...preset,
    T: s.patternT,
    noise: s.patternNoise,
    seed: pattern.seed,
    globalCtl: preset.model === 'AS' ? preset.globalCtl : 0,
  };
  const { values } = simulatePattern(p, { W: s.W, turns: s.turns, rows, width, nMax: Math.round(256 / s.patternSize) });
  const rgba = new Uint8Array(rows * width * 4);
  colorize(values, s.patternBase, s.patternPigment, s.patternAmount, rgba);
  targetTexture.image = /** @type {any} */ ({ data: rgba, width, height: rows });
  targetTexture.needsUpdate = true;
  targetMat ??= solidMat.clone();
  targetInnerMat ??= innerMat.clone();
  targetMat.map = targetTexture;
  targetMat.color.set('#ffffff');
  targetMat.vertexColors = false;
  targetMat.needsUpdate = true;
  targetInnerMat.color.set(s.patternBase).lerp(new THREE.Color('#ffffff'), 0.55);
  targetSolid.material = targetMat;
  targetInner.material = targetInnerMat;
}

function drawTarget() {
  targetSolid.geometry.dispose();
  targetSolid.geometry = targetInner.geometry = targetGeometry(target.shell);
  if (LEVELS[level - 1].parts.includes('colour')) paintTarget();
  else {
    targetSolid.material = solidMat;
    targetInner.material = innerMat;
  }
}

const LIGHT_BACKDROP = '#cfd8de';

// The height of the target's ground, measured again only when the shell is turned
let groundOf = { geometry: null, turn: new THREE.Quaternion(), y: 0 };
function targetGround() {
  const g = targetSolid.geometry;
  if (groundOf.geometry !== g || !groundOf.turn.equals(shellGroup.quaternion)) {
    groundOf = { geometry: g, turn: shellGroup.quaternion.clone(), y: (lowestPoint(g) ?? 0) - 0.002 };
  }
  return groundOf.y;
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
  // Each shell stands on its own ground, so its shadow does not move with the other one
  const halves = [
    { meshes: [targetSolid, targetInner], x: 0, y: portrait ? hh : 0, ground: targetGround() },
    { meshes: own, x: portrait ? 0 : hw, y: 0, ground: ground.position.y },
  ];
  const ownGround = ground.position.y;
  // On a light background the cream shell hardly stands out: a cooler, darker backdrop
  const bg = /** @type {THREE.Color} */ (scene.background);
  const userBg = bg.getHex();
  if (bg.getHSL({ h: 0, s: 0, l: 0 }).l > 0.6) bg.set(LIGHT_BACKDROP);
  // The labels and the divider of the window follow the orientation of the split
  if (chView.classList.contains('portrait') !== portrait) chView.classList.toggle('portrait', portrait);
  renderer.setScissorTest(true);
  for (const half of halves) {
    for (const m of [targetSolid, targetInner, ...own]) m.visible = half.meshes.includes(m);
    ground.position.y = half.ground;
    renderer.setViewport(half.x, half.y, hw, hh);
    renderer.setScissor(half.x, half.y, hw, hh);
    renderer.render(scene, camera);
  }
  renderer.setScissorTest(false);
  ground.position.y = ownGround;
  bg.setHex(userBg);
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
  const L = LEVELS[level - 1];
  const colour = L.parts.includes('colour');
  // A category shows when the level frees one of its parameters
  const groups = new Set(free.map((k) => GROUP_OF[k]));
  qsa('#challenge .ch-group').forEach((g) => (g.hidden = !groups.has(g.dataset.group)));
  $('chBase').value = pattern.base;
  $('chPigment').value = pattern.pigment;
  for (const d of PIG_SLIDERS) {
    controlsByKey[d.id].set(pattern[d.key]);
    controlsByKey[d.id].el.hidden = !colour;
  }
  qsa('#chKinds [data-kind]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.kind === kind)));
  qsa('#chHand [data-hand]').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.hand === state.hand)));
  qsa('#chLevels [data-level]').forEach((b) => {
    const k = +b.dataset.level;
    b.setAttribute('aria-current', k === level ? 'step' : 'false');
    b.classList.toggle('done', k <= best());
  });
  const inBlock = LEVELS.filter((x) => x.block === L.block);
  $('chLevelName').textContent = `${t(`ch.b.${L.block}`)} · ${inBlock.indexOf(L) + 1}/${inBlock.length} · ${t(`ch.l${level}`)}`;
  $('chIntro').textContent = t(`ch.level${level}`);
  // The note about outlines only applies to the shape levels; the others explain their score
  /** @type {HTMLElement} */ (document.querySelector('.ch-how')).hidden = L.parts.join() !== 'shape';
}

function newRound() {
  const L = LEVELS[level - 1];
  target = makeTarget(level);
  targetSil = L.parts.includes('shape') ? silhouettes(target.shell) : null;
  passed = false;
  drawTarget();
  const start = startShell(level, target.shell);
  applyShell(start);
  if (L.parts.includes('colour')) chooseKind(start.patternPreset);
  else setPatternOn(false);
  markDirty();
  syncControls();
  $('chResult').hidden = true;
  $('chNext').hidden = true;
  $('chRestart').hidden = true;
  $('chCheck').hidden = false;
  /** @type {HTMLElement} */ (document.querySelector('[data-view=iso]')).click();
}

function check() {
  const L = LEVELS[level - 1];
  const guess = { ...target.shell };
  for (const k of L.keys) guess[k] = k === 'patternPreset' ? kind : COLOUR[k] ? pattern[COLOUR[k]] : state[k];
  const score = levelScore(level, guess, target.shell, targetSil ?? undefined);
  const hint = bestHint(guess, target.shell, L.keys);
  passed = score >= passScore(level) || !hint;
  $('chScore').textContent = t('ch.score', score);
  $('chBar').style.setProperty('--pct', `${score}%`);
  if (passed) {
    $('chMessage').textContent = t(target.varied ? 'ch.passed.varied' : 'ch.passed', shellName());
    if (level > best()) storage.set(PROGRESS_KEY, String(level));
    const last = level === LEVELS.length;
    $('chNext').hidden = last;
    // The last level passed: the challenge is complete, and can be played again from the start
    $('chRestart').hidden = !last;
    if (last) $('chMessage').textContent += ' ' + t('ch.done');
  } else {
    // Harder levels name the parameter to look at, and only give the direction once it is close
    $('chMessage').textContent =
      hint.dir === 'flip'
        ? t('ch.flip')
        : hint.dir === 'change'
          ? t('ch.kind')
          : ['lighter', 'darker', 'hue'].includes(hint.dir)
            ? t(`ch.${hint.dir}`, paramName(hint.key))
            : L.vague && hint.far
              ? t('ch.look', paramName(hint.key))
              : t(hint.dir === 'up' ? (hint.far ? 'ch.upFar' : 'ch.up') : hint.far ? 'ch.downFar' : 'ch.down', paramName(hint.key));
  }
  $('chResult').hidden = false;
  $('chResult').classList.toggle('passed', passed);
  syncControls();
}

/** The player picks a kind of pattern: the app loads that preset (constants and colours). */
function chooseKind(key) {
  kind = key;
  selectPattern(key);
  pattern.seed = 7;
  computePattern();
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
  ({
    PIG_SIMPLE,
    applyMode,
    computePattern,
    controlsByKey,
    createParam,
    markDirty,
    pattern,
    pigControls,
    resize,
    schedulePattern,
    selectPattern,
    setPatternOn,
    targetGeometry,
    paintPattern,
  } = ctx);
  // Colour level: the two colours of the pattern, kept in step with the pigment tab
  for (const [id, key, side] of [
    ['chBase', 'base', 'pigBase'],
    ['chPigment', 'pigment', 'pigColor'],
  ]) {
    $(id).addEventListener('input', (e) => {
      pattern[key] = e.target.value;
      $(side).value = e.target.value;
      paintPattern();
      $('chResult').hidden = true;
    });
  }
  // Colour level: the kinds of pattern and the simple pigment sliders, bound to the app's pattern
  for (const key of Object.keys(PATTERN_PRESETS)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.kind = key;
    b.addEventListener('click', () => {
      chooseKind(key);
      $('chResult').hidden = true;
    });
    $('chKinds').append(b);
  }
  PIG_SLIDERS = PIG_SIMPLE.map((d) => ({ ...d, id: `ch-${d.id}` }));
  PIG_SLIDERS.forEach((d) =>
    createParam(d, $('ch-pig'), {
      compact: true,
      target: pattern,
      onChange: () => {
        pigControls[d.id.slice(3)].set(pattern[d.key]);
        schedulePattern();
        $('chResult').hidden = true;
      },
    }),
  );
  SLIDERS.forEach((d) =>
    createParam(d, $(`ch-g-${d.group}`), {
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
  // Starting again forgets the progress kept in the browser
  $('chRestart').addEventListener('click', () => {
    storage.remove(PROGRESS_KEY);
    setLevel(1);
  });
}

/** Names of the kinds of pattern (after a change of language). */
export function relabelChallenge() {
  qsa('#chKinds [data-kind]').forEach((b) => (b.textContent = tPattern(b.dataset.kind)));
}

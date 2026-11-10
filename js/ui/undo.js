/**
 * Undo: each step is a snapshot of the shape, the ornament, the render mode,
 * the pattern and the appearance (colours, resolution, bands, axis). Every change reaches noteChange() through writeHash(); a step is
 * closed when changes stop for a moment, so dragging a slider makes one step.
 * The view (camera, orientation) is not a step.
 */
import { PRESETS } from '../model/presets.js';
import { SHAPE_KEYS, pickOrnament, pickShape, state } from './state.js';
import { $ } from './util.js';
import { syncWizard } from './wizard.js';

// Provided by main.js through init()
let applyLook,
  applyMode,
  computePattern,
  controlsByKey,
  markDirty,
  pattern,
  presetSel,
  readLook,
  setMirror,
  setPatternOn,
  syncOrnamentControls,
  syncPatternControls;

// ---------------------------------------------------------------------------

const undoStack = [];
const UNDO_LIMIT = 50;
let committed = null; // snapshot of the last closed step (null until the app has started)
let undoTimer = 0;

/** Starts the history from the state the page opened with. */
export function startUndo() {
  committed = takeSnapshot();
}

function takeSnapshot() {
  return JSON.stringify({
    shape: pickShape(state),
    orn: pickOrnament(state),
    mode: state.mode,
    pattern: { ...pattern },
    look: readLook(),
  });
}

/** Called on every change (through writeHash): closes the step once changes stop. */
export function noteChange() {
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
  setUndoEnabled(true);
}

export function undo() {
  commitStep(); // a change still in progress becomes a step of its own
  const prev = undoStack.pop();
  setUndoEnabled(undoStack.length > 0);
  if (!prev) return;
  committed = prev;
  restoreSnapshot(JSON.parse(prev));
}

function restoreSnapshot({ shape, orn, mode, pattern: pat, look }) {
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
  applyLook(look);
  markDirty();
}

function setUndoEnabled(on) {
  $('undo').disabled = !on;
  $('wzUndo').disabled = !on;
}

// ---------------------------------------------------------------------------

/** Connects this part of the interface to the rest of the app. */
export function initUndo(ctx) {
  ({
    applyLook,
    applyMode,
    computePattern,
    controlsByKey,
    markDirty,
    pattern,
    presetSel,
    readLook,
    setMirror,
    setPatternOn,
    syncOrnamentControls,
    syncPatternControls,
  } = ctx);
  $('undo').addEventListener('click', undo);
  $('wzUndo').addEventListener('click', () => {
    undo();
    syncWizard();
  });
}

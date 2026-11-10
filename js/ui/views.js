/**
 * Standard views of malacology with a smooth camera transition, the display
 * orientation of the shell (coiling axis vertical, horizontal, or free rotation
 * by hand) and the ground that follows the lowest point of the shell. The
 * orientation is presentation only: the geometry and the 3D files keep the
 * model frame.
 */
import * as THREE from 'three';
import { CAMERA_HOME, camera, controls, ground, renderer, shellGroup, solid, viewport } from './scene.js';
import { state, writeHash } from './state.js';
import { qsa } from './util.js';

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
// With "reduce motion" in the system settings, camera and orientation changes are instantaneous
const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
/** Duration of an animation in ms (1 ms, i.e. instantaneous, under reduced motion). */
const motion = (ms) => (reducedMotion?.matches ? 1 : ms);

export let orientTween = null;

/** The ground (shadow) touches the lowest point of the shell in its current orientation. */
export function updateGround() {
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

export function setOrient(mode, { animate = true } = {}) {
  state.orient = mode;
  controls.enableRotate = mode !== 'free';
  qsa('.orient [data-orient]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.orient === mode)));
  if (mode !== 'free') {
    const to = ORIENT_BASE[mode];
    if (animate) orientTween = { t0: performance.now(), dur: motion(600), from: shellGroup.quaternion.clone(), to };
    else {
      orientTween = null;
      shellGroup.quaternion.copy(to);
      updateGround();
    }
  }
  writeHash();
}

export function stepOrient(now) {
  const u = Math.min(1, (now - orientTween.t0) / orientTween.dur);
  shellGroup.quaternion.slerpQuaternions(orientTween.from, orientTween.to, easeInOut(u));
  updateGround();
  if (u >= 1) orientTween = null;
}

// Free rotation: dragging turns the shell about the screen's vertical and
// horizontal axes, like turning it in the hand. Zoom and pan stay with the camera.
const freeDrag = { id: null, x: 0, y: 0, pointers: new Set() };
export const VIEWS = {
  iso: () => CAMERA_HOME.clone(),
  apertural: () => new THREE.Vector3(0, 0, state.hand), // the aperture faces +Z in dextral shells
  dorsal: () => new THREE.Vector3(0, 0, -state.hand),
  apical: () => new THREE.Vector3(0, 1, 0.001),
  umbilical: () => new THREE.Vector3(0, -1, 0.001),
  profile: () => new THREE.Vector3(1, 0, 0),
};

export let tween = null;
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
  if (state.orient === 'free')
    orientTween = { t0: performance.now(), dur: motion(700), from: shellGroup.quaternion.clone(), to: ORIENT_BASE.vertical };
  const base = ORIENT_BASE[state.orient] ?? ORIENT_BASE.vertical;
  const dir = name === 'iso' ? VIEWS.iso() : VIEWS[name]().applyQuaternion(base);
  const to = new THREE.Spherical().setFromVector3(dir.normalize().multiplyScalar(dist));
  // Azimuth along the shortest path
  let dTheta = to.theta - from.theta;
  dTheta = Math.atan2(Math.sin(dTheta), Math.cos(dTheta));
  tween = { t0: performance.now(), dur: motion(700), from, dTheta, to, fromTarget: controls.target.clone() };
  qsa('.views [data-view]').forEach((b) => b.classList.toggle('active', b.dataset.view === name));
}

export function stepTween(now) {
  const u = Math.min(1, (now - tween.t0) / tween.dur);
  const e = easeInOut(u);
  const { from, to } = tween;
  // Interpolating azimuth and elevation separately keeps the orientation
  // continuous, also when reaching the apical and umbilical views (on the vertical axis).
  const sph = new THREE.Spherical(
    THREE.MathUtils.lerp(from.radius, to.radius, e),
    THREE.MathUtils.lerp(from.phi, to.phi, e),
    from.theta + tween.dTheta * e,
  );
  const target = tween.fromTarget.clone().lerp(new THREE.Vector3(), e);
  camera.position.copy(target).add(new THREE.Vector3().setFromSpherical(sph));
  controls.target.copy(target);
  camera.lookAt(target);
  if (u >= 1) tween = null;
}

/** Connects this part of the interface to the rest of the app. */
export function initViews() {
  qsa('.orient [data-orient]').forEach((b) => b.addEventListener('click', () => setOrient(b.dataset.orient)));

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
    if (freeDrag.pointers.size > 1) {
      freeDrag.id = null;
      return;
    }
    const k = Math.PI / Math.max(200, viewport.clientHeight); // half a turn per viewport height
    const dx = (e.clientX - freeDrag.x) * k,
      dy = (e.clientY - freeDrag.y) * k;
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
      const { pointerId } = /** @type {PointerEvent} */ (e);
      freeDrag.pointers.delete(pointerId);
      if (pointerId === freeDrag.id) freeDrag.id = null;
    });
  }

  qsa('.views [data-view]').forEach((b) => b.addEventListener('click', () => flyTo(b.dataset.view)));
  controls.addEventListener('start', () => {
    tween = null;
    qsa('.views [data-view].active').forEach((b) => b.classList.remove('active'));
  });
}

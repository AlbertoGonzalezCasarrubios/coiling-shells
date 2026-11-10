/**
 * The 3D scene of the viewer: renderer, camera and orbit controls, lights and
 * ground, the materials and meshes of the shell (surface, inside, hidden-line
 * occluder, lines, coiling axis), the group that holds its display orientation,
 * and the small x, y, z gizmo. The meshes are filled by rebuild() in main.js.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { $ } from './util.js';
import { state } from './state.js';

// The 3D view; while the shell creator is open its canvas moves into the
// creator's window, and this binding follows it (see setViewport)
export let viewport = $('viewport');
export function setViewport(el) {
  viewport = el;
  viewport.prepend(renderer.domElement);
}

export const PALETTES = {
  light: { line: '#2b3a4a', shell: '#e8d3b0', bg: '#f4f0e6' }, // ink on paper
  dark: { line: '#d8c08c', shell: '#e4cfae', bg: '#111821' }, // old gold on night blue
};

export function setPaletteInputs({ line, shell, bg }) {
  $('lineColor').value = line;
  $('shellColor').value = shell;
  $('bgColor').value = bg;
}
setPaletteInputs(PALETTES[window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light']);

export const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.autoClear = false;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
viewport.prepend(renderer.domElement);

export const scene = new THREE.Scene();
scene.background = new THREE.Color($('bgColor').value);

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

export const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 200);
export const CAMERA_HOME = new THREE.Vector3(6.2, 3.6, 7.4);
camera.position.copy(CAMERA_HOME);

export const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 1.5;
controls.maxDistance = 40;
controls.autoRotateSpeed = 1.2;

scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7f70, 0.55));
export const sun = new THREE.DirectionalLight(0xffffff, 2.2);
sun.position.set(4, 8, 5);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 0.5, far: 25 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.03;
scene.add(sun);
export const fill = new THREE.DirectionalLight(0xdfe8ff, 0.5);
fill.position.set(-5, 2, -4);
scene.add(fill);

export const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: 0.18 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Materials
export const solidMat = new THREE.MeshStandardMaterial({
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
export const occluderMat = new THREE.MeshBasicMaterial({
  colorWrite: false,
  side: THREE.DoubleSide,
  polygonOffset: true,
  polygonOffsetFactor: 1,
  polygonOffsetUnits: 1,
});

// Lines with a width in pixels (native WebGL lines are always 1 px wide)
export const lineMat = new LineMaterial({
  color: $('lineColor').value,
  linewidth: state.lineWidth,
  transparent: true,
  opacity: state.lineOpacity,
});

// Dashed axis with a width in pixels (1 px by default, like a plain WebGL line)
export const axisMat = new LineMaterial({ color: 0x2a9d8f, linewidth: state.axisWidth, dashed: true, dashSize: 0.12, gapSize: 0.08 });

solidMat.side = THREE.FrontSide; // exterior (front faces point outwards)

// Inside of the shell: unpigmented, with a light pearly sheen
export const innerMat = new THREE.MeshPhysicalMaterial({
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

export const solid = new THREE.Mesh(new THREE.BufferGeometry(), solidMat);
solid.castShadow = true;
solid.receiveShadow = true;
export const inner = new THREE.Mesh(solid.geometry, innerMat);
inner.receiveShadow = true;
export const occluder = new THREE.Mesh(solid.geometry, occluderMat);
occluder.renderOrder = 0;
export const lines = new LineSegments2(new LineSegmentsGeometry(), lineMat);
lines.renderOrder = 1;
export const axis = new Line2(new LineGeometry(), axisMat);
axis.visible = false;
// The shell lives in a group whose rotation is only a display orientation:
// the geometry, the equation and the 3D files keep the model frame (z = coiling axis)
export const shellGroup = new THREE.Group();
shellGroup.add(solid, inner, occluder, lines, axis);
scene.add(shellGroup);

// ---------------------------------------------------------------------------
// x, y, z axes gizmo (frame of the equation: z = coiling axis)
// ---------------------------------------------------------------------------

export const gizmo = {
  scene: new THREE.Scene(),
  camera: new THREE.OrthographicCamera(-1.7, 1.7, 1.7, -1.7, 0.1, 10),
  size: 120,
  visible: true,
};

export function makeLabel(text, color) {
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
export const gizmoAxes = new THREE.Group();
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
gizmo.scene.add(
  new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 12), new THREE.MeshBasicMaterial({ color: 0x8a8f98, toneMapped: false })),
);

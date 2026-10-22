// Every surface in the house has two looks and one shader that blends them.
//
//   ink      flat paper colour, no light. With the black edge lines on top it
//            reads as a line drawing.
//   material the real thing: textured, lit, shadowed.
//
// Which look a pixel gets depends on the room it faces and how far that room's
// sweep has travelled. Insides of the wall solid are always solid ink, which
// is what makes the cut walls of the plan black.

import * as THREE from 'three';
import { PAPER, INK, ROOMS, CUT_PLAN } from './plan.js';

// ---- the cut -----------------------------------------------------------
// One clipping plane shared by everything. Keeps what is below `constant`.
export const CUT = new THREE.Plane(new THREE.Vector3(0, -1, 0), CUT_PLAN);

// ---- room sweeps -------------------------------------------------------
const raw = (hex) => new THREE.Color().setStyle(hex, THREE.LinearSRGBColorSpace); // keep sRGB numbers as they are
const IDLE = -1e4;
const SOFT = 1.1; // metres over which ink turns into material behind the front

const sweepOf = (r) => {
  const dx = r.dir[0], dz = -r.dir[1];
  const ox = dx > 0 ? r.x0 : dx < 0 ? r.x1 : (r.x0 + r.x1) / 2;
  const oz = dz < 0 ? -r.n0 : dz > 0 ? -r.n1 : -(r.n0 + r.n1) / 2;
  return { ox, oz, dx, dz, len: Math.abs(dx) * (r.x1 - r.x0) + Math.abs(dz) * (r.n1 - r.n0) };
};
const SW = ROOMS.map(sweepOf);

export const U = {
  uPaper: { value: raw(PAPER) },
  uInkCol: { value: raw(INK) },
  uRoomBox: { value: ROOMS.map((r) => new THREE.Vector4(r.x0, -r.n1, r.x1, -r.n0)) },
  uRoomSweep: { value: SW.map((s) => new THREE.Vector4(s.ox, s.oz, s.dx, s.dz)) },
  uRoomState: { value: ROOMS.map((r) => new THREE.Vector2(IDLE, r.ceil)) },
  uSoft: { value: SOFT },
  uInkTone: { value: 0.045 }, // a faint wash on upright faces so the drawing reads as solid
};

// Clipping planes that remove a room's ink lines behind its sweep front.
export const SWEEP_PLANES = {};
ROOMS.forEach((r, i) => {
  SWEEP_PLANES[r.key] = new THREE.Plane(new THREE.Vector3(SW[i].dx, 0, SW[i].dz), 1e4);
});

// t: 0 = line drawing, 1 = fully material
export function setRoomReveal(key, t) {
  const i = ROOMS.findIndex((r) => r.key === key);
  const s = SW[i];
  const front = t <= 0 ? IDLE : -0.4 + t * (s.len + SOFT + 0.8);
  U.uRoomState.value[i].x = front;
  SWEEP_PLANES[key].constant = -(s.ox * s.dx + s.oz * s.dz + front);
}

const NR = ROOMS.length;

const DECL = /* glsl */ `
#define NR ${NR}
varying vec3 vWp;
varying vec3 vWn;
uniform vec3 uPaper;
uniform vec3 uInkCol;
uniform vec4 uRoomBox[NR];
uniform vec4 uRoomSweep[NR];
uniform vec2 uRoomState[NR];
uniform float uSoft;
uniform float uInkTone;
uniform float uBackInk;
uniform float uGlass;
uniform float uSat;
uniform vec3 uTint;
uniform vec3 uMean;
uniform float uContrast;
uniform float uAO;

int roomOf(vec3 q) {
  for (int i = 0; i < NR; i++) {
    vec4 b = uRoomBox[i];
    if (q.x > b.x && q.x < b.z && q.z > b.y && q.z < b.w && q.y < uRoomState[i].y + 0.1) return i;
  }
  return -1;
}
// 1 = line drawing, 0 = material
float inkOf(vec3 q, int r) {
  if (r < 0) return 1.0;
  vec4 s = uRoomSweep[r];
  float d = dot(q.xz - s.xy, s.zw);
  float f = uRoomState[r].x;
  return smoothstep(f - uSoft, f, d);
}
// Cheap stand-in for bounced light: surfaces get a little darker where they
// come close to the walls, floor and ceiling of their room.
float roomAO(vec3 p, vec3 nn, int r) {
  if (r < 0) return 1.0;
  vec4 b = uRoomBox[r];
  float top = uRoomState[r].y;
  float R = 1.1;
  float occ = 0.0;
  occ += (1.0 - abs(nn.x)) * (exp(-max(p.x - b.x - 0.1, 0.0) / R) + exp(-max(b.z - 0.1 - p.x, 0.0) / R));
  occ += (1.0 - abs(nn.z)) * (exp(-max(p.z - b.y - 0.1, 0.0) / R) + exp(-max(b.w - 0.1 - p.z, 0.0) / R));
  occ += (1.0 - abs(nn.y)) * (exp(-max(p.y, 0.0) / R) + exp(-max(top - p.y, 0.0) / R));
  return clamp(1.0 - uAO * occ, 0.3, 1.0);
}
`;

const VERT_DECL = /* glsl */ `
varying vec3 vWp;
varying vec3 vWn;
`;
const VERT_MAIN = /* glsl */ `
vWp = (modelMatrix * vec4(transformed, 1.0)).xyz;
vWn = normalize(mat3(modelMatrix) * objectNormal);
`;

const GRADE = /* glsl */ `
{
  // texture grading: pull towards the map's average colour, desaturate, tint
  vec3 c = uMean + (diffuseColor.rgb - uMean) * uContrast;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  diffuseColor.rgb = max(mix(vec3(l), c, uSat), 0.0) * uTint;
}
`;

const AO = /* glsl */ `
{
  vec3 nnA = normalize(vWn) * (gl_FrontFacing ? 1.0 : -1.0);
  vec3 qA = vWp + nnA * 0.03;
  float rao = roomAO(vWp, nnA, roomOf(qA));
  reflectedLight.indirectDiffuse *= rao;
  reflectedLight.indirectSpecular *= rao;
  reflectedLight.directDiffuse *= mix(1.0, rao, 0.35);
}
`;

const INKMIX = /* glsl */ `
{
  vec3 nnI = normalize(vWn) * (gl_FrontFacing ? 1.0 : -1.0);
  vec3 qI = vWp + nnI * 0.03;
  float ink = inkOf(qI, roomOf(qI));
  if (uGlass > 0.5) {
    gl_FragColor.a *= (1.0 - ink);
  } else if (uBackInk > 0.5 && !gl_FrontFacing) {
    gl_FragColor.rgb = uInkCol;
  } else {
    vec3 wash = uPaper * (1.0 - uInkTone * (abs(nnI.x) + 0.55 * abs(nnI.z)));
    gl_FragColor.rgb = mix(gl_FragColor.rgb, wash, ink);
  }
}
`;

// Turns a MeshStandardMaterial (or Physical) into an ink-aware one.
export function inkAware(material, { backInk = false, glass = false, sat = 1, tint = [1, 1, 1], mean = [0.5, 0.5, 0.5], contrast = 1, ao = 0.28 } = {}) {
  material.side = THREE.DoubleSide;
  material.clippingPlanes = [CUT];
  material.polygonOffset = true;
  material.polygonOffsetFactor = 1;
  material.polygonOffsetUnits = 1;
  const own = {
    uBackInk: { value: backInk ? 1 : 0 },
    uGlass: { value: glass ? 1 : 0 },
    uSat: { value: sat },
    uTint: { value: new THREE.Vector3(...tint) },
    uMean: { value: new THREE.Vector3(...mean) },
    uContrast: { value: contrast },
    uAO: { value: ao },
  };
  material.userData.ink = own;
  material.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U, own);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\n' + VERT_DECL)
      .replace('#include <fog_vertex>', '#include <fog_vertex>\n' + VERT_MAIN);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + DECL)
      .replace('#include <map_fragment>', '#include <map_fragment>\n' + GRADE)
      .replace('#include <aomap_fragment>', '#include <aomap_fragment>\n' + AO)
      .replace('#include <dithering_fragment>', '#include <dithering_fragment>\n' + INKMIX);
  };
  material.customProgramCacheKey = () => 'ink' + (backInk ? 'B' : '') + (glass ? 'G' : '');
  return material;
}

// Soft dark patch under furniture. Only exists where the room is material.
export function contactShadowMaterial(strength = 0.5) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
    uniforms: { ...U, uStrength: { value: strength }, uBackInk: { value: 0 }, uGlass: { value: 0 }, uSat: { value: 1 }, uTint: { value: new THREE.Vector3(1, 1, 1) }, uMean: { value: new THREE.Vector3(0.5, 0.5, 0.5) }, uContrast: { value: 1 }, uAO: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec3 vWp; varying vec3 vWn; varying vec2 vUv;
      void main() {
        vUv = uv;
        vWp = (modelMatrix * vec4(position, 1.0)).xyz;
        vWn = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * vec4(vWp, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      ${DECL}
      varying vec2 vUv;
      uniform float uStrength;
      void main() {
        vec3 q = vWp + normalize(vWn) * 0.03;
        float ink = inkOf(q, roomOf(q));
        vec2 e = smoothstep(vec2(0.0), vec2(0.5), vUv) * smoothstep(vec2(0.0), vec2(0.5), 1.0 - vUv);
        float a = e.x * e.y;
        gl_FragColor = vec4(0.05, 0.035, 0.02, a * a * uStrength * (1.0 - ink));
      }`,
  });
}

// ---- textures ----------------------------------------------------------
const loader = new THREE.TextureLoader();
const pending = [];
let maxAniso = 8;
export const setAnisotropy = (n) => (maxAniso = n);

function tex(file, { srgb = false, size = 1, rot = 0 } = {}) {
  const t = new THREE.Texture();
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / size, 1 / size);
  t.rotation = rot;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  pending.push(
    loader.loadAsync('assets/textures/' + file).then((src) => {
      t.image = src.image;
      t.anisotropy = maxAniso;
      t.needsUpdate = true;
    })
  );
  return t;
}
export const texturesReady = () => Promise.all(pending);

function pbr(name, { size = 1, rot = 0, diff = '_diff_1k.jpg', nor = '_nor_gl_1k.jpg', rough = '_rough_1k.jpg', normalScale = 1, roughness = 1, ...ink } = {}) {
  const m = new THREE.MeshStandardMaterial({
    map: tex(name + diff, { srgb: true, size, rot }),
    normalMap: nor ? tex(name + nor, { size, rot }) : null,
    roughnessMap: rough ? tex(name + rough, { size, rot }) : null,
    roughness,
    metalness: 0,
  });
  m.normalScale.set(normalScale, normalScale);
  return inkAware(m, ink);
}

const flat = (color, { roughness = 0.8, metalness = 0, emissive = 0x000000, emissiveIntensity = 1, ...ink } = {}) =>
  inkAware(new THREE.MeshStandardMaterial({ color, roughness, metalness, emissive, emissiveIntensity }), ink);

// A painting for the hall, made in a canvas so nothing has to be downloaded.
function paintingTexture() {
  const c = document.createElement('canvas');
  c.width = 900; c.height = 650;
  const g = c.getContext('2d');
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  g.fillStyle = '#d9cfbd'; g.fillRect(0, 0, 900, 650);
  // broad horizontal washes
  for (let i = 0; i < 260; i++) {
    const y = rnd() * 650, h = 6 + rnd() * 46, x = -50 + rnd() * 300, w = 500 + rnd() * 500;
    const upper = y < 300;
    const tone = upper ? [222 + rnd() * 20, 212 + rnd() * 18, 192 + rnd() * 16] : [120 + rnd() * 60, 84 + rnd() * 40, 52 + rnd() * 30];
    g.fillStyle = `rgba(${tone[0] | 0},${tone[1] | 0},${tone[2] | 0},${0.05 + rnd() * 0.12})`;
    g.fillRect(x, y, w, h);
  }
  // one dark field low on the canvas and a thin horizon
  const grd = g.createLinearGradient(0, 330, 0, 650);
  grd.addColorStop(0, 'rgba(60,44,32,0)'); grd.addColorStop(0.35, 'rgba(58,42,30,0.55)'); grd.addColorStop(1, 'rgba(40,30,24,0.8)');
  g.fillStyle = grd; g.fillRect(0, 330, 900, 320);
  g.fillStyle = 'rgba(190,96,48,0.75)'; g.fillRect(120, 318, 560, 7);
  for (let i = 0; i < 3000; i++) {
    g.fillStyle = `rgba(${rnd() < 0.5 ? 255 : 0},${rnd() < 0.5 ? 250 : 0},${rnd() < 0.5 ? 240 : 0},0.03)`;
    g.fillRect(rnd() * 900, rnd() * 650, 1 + rnd() * 3, 1 + rnd() * 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  // the picture hangs on the west wall at n 3.3 to 5.1, y 1.14 to 2.44; UVs are in metres
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / 1.8, 1 / 1.3);
  t.offset.set(5.1 / 1.8, -1.14 / 1.3);
  return t;
}

export function makeMaterials() {
  const M = {};
  // Average colours of the maps (linear), used to calm their contrast.
  const PLASTER = [0.44, 0.39, 0.34], LIME = [0.445, 0.33, 0.195], OAKC = [0.28, 0.19, 0.125], HIDE = [0.084, 0.026, 0.006];
  // pale limestone floor, laid in random courses
  M.floor = pbr('marble_01', { size: 2.6, diff: '_diff_2k.jpg', nor: '_nor_gl_2k.jpg', normalScale: 0.5, roughness: 0.6, mean: LIME, contrast: 0.9, sat: 0.42, tint: [1.52, 1.52, 1.5], backInk: true });
  // lime plaster. The wall solid uses this, so its insides are ink.
  M.plaster = pbr('plastered_wall', { size: 3.2, normalScale: 0.07, roughness: 0.96, mean: PLASTER, contrast: 0.45, sat: 0.3, tint: [1.86, 1.83, 1.77], backInk: true });
  M.ceiling = flat(0xe9e5dc, { roughness: 1 });
  // rift-cut oak, grain running up the wall
  const OAK = { diff: '_diff_2k.jpg', normalScale: 0.5, roughness: 0.82, mean: OAKC };
  M.oak = pbr('white_oak_veneer', { ...OAK, size: 1.05, sat: 0.95, tint: [1.5, 1.45, 1.36], backInk: true });
  M.oakDoor = pbr('white_oak_veneer', { ...OAK, size: 1.05, sat: 0.95, tint: [1.1, 1.02, 0.94], backInk: true });
  // oak for furniture, grain running along the piece
  M.oakLong = pbr('white_oak_veneer', { ...OAK, size: 1.05, rot: Math.PI / 2, sat: 0.95, tint: [1.4, 1.35, 1.26] });
  M.leather = pbr('brown_leather', { size: 0.7, diff: '_albedo_1k.jpg', normalScale: 0.8, roughness: 0.7, mean: HIDE, sat: 0.55, tint: [4.4, 4.4, 3.4] });
  // honed travertine, borrowing the plaster maps with a warmer tint
  M.stone = pbr('plastered_wall', { size: 1.4, normalScale: 0.08, roughness: 0.5, mean: PLASTER, contrast: 0.8, sat: 0.7, tint: [1.48, 1.4, 1.2] });
  M.bronze = flat(0x8a6a44, { roughness: 0.36, metalness: 1 });
  M.ceramicDark = flat(0x2b2622, { roughness: 0.55 });
  M.ceramicSand = flat(0xb9a88e, { roughness: 0.8 });
  M.branch = flat(0x4b3d30, { roughness: 0.9 });
  M.bookA = flat(0xd8d0c2, { roughness: 0.85 });
  M.bookB = flat(0x7c3f2a, { roughness: 0.8 });
  M.bookC = flat(0x2e3a3a, { roughness: 0.8 });
  M.lamp = flat(0xfff1dc, { roughness: 0.4, emissive: 0xffd9a8, emissiveIntensity: 3.5 });
  M.painting = inkAware(new THREE.MeshStandardMaterial({ map: paintingTexture(), roughness: 0.9 }));
  M.generic = flat(0xd8d2c6, { roughness: 0.9 });
  M.glass = inkAware(
    new THREE.MeshPhysicalMaterial({ color: 0xdfe9ea, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.16, depthWrite: false, envMapIntensity: 1.2 }),
    { glass: true, ao: 0 }
  );
  M.glass.polygonOffset = false;
  return M;
}

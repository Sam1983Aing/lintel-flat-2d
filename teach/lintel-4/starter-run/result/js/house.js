// Casa Larga: the model. One building, used for the plan, the rising walls and
// the walk. Plan coordinates (x east, n north) are turned into three.js
// coordinates by z = -n.

import * as THREE from 'three';
import { RectSolid, pushBox, bucketToGeometry } from './solid.js';
import { ROOMS, BASE_Y, GROUND_Y, TREES, DOORS } from './plan.js';

const roomAt = (x, n, y = 0) => {
  for (const r of ROOMS) if (x > r.x0 && x < r.x1 && n > r.n0 && n < r.n1 && y < r.ceil + 0.1) return r.key;
  return 'rest';
};

// Collects loose pieces (furniture, glass, frames) per room and material.
class Kit {
  constructor() {
    this.b = {};
    this.e = {};
  }
  bucket(room, mat) {
    return (this.b[room + '|' + mat] ??= { p: [], n: [], uv: [], idx: [] });
  }
  edges(room) {
    return (this.e[room] ??= []);
  }
  box(room, mat, x0, n0, x1, n1, y0, y1, edges = true) {
    pushBox(
      this.bucket(room, mat), edges ? this.edges(room) : null,
      Math.min(x0, x1), Math.min(y0, y1), -Math.max(n0, n1), Math.max(x0, x1), Math.max(y0, y1), -Math.min(n0, n1)
    );
  }
  // any three.js geometry, already placed in world space
  geo(room, mat, g, edgeAngle = 30) {
    const B = this.bucket(room, mat);
    const src = g.index ? g.toNonIndexed() : g;
    const p = src.attributes.position, nrm = src.attributes.normal, uv = src.attributes.uv;
    const base = B.p.length / 3;
    for (let i = 0; i < p.count; i++) {
      B.p.push(p.getX(i), p.getY(i), p.getZ(i));
      B.n.push(nrm.getX(i), nrm.getY(i), nrm.getZ(i));
      B.uv.push(uv ? uv.getX(i) : 0, uv ? uv.getY(i) : 0);
      B.idx.push(base + i);
    }
    if (edgeAngle !== null) {
      const eg = new THREE.EdgesGeometry(g, edgeAngle);
      const E = this.edges(room), ep = eg.attributes.position;
      for (let i = 0; i < ep.count; i++) E.push(ep.getX(i), ep.getY(i), ep.getZ(i));
    }
  }
}

const place = (g, x, y, n, ry = 0, sx = 1, sy = 1, sz = 1) => {
  g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, -n), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry), new THREE.Vector3(sx, sy, sz)));
  return g;
};

export function buildHouse() {
  // ------------------------------------------------------------------
  // 1. The shell: floor slab and walls as one solid.
  // ------------------------------------------------------------------
  const S = new RectSolid();
  const A = (x0, n0, x1, n1, y0, y1) => S.add(x0, y0, -n0, x1, y1, -n1);
  const C = (x0, n0, x1, n1, y0, y1) => S.sub(x0, y0, -n0, x1, y1, -n1);

  const LOW = 3.2; // parapet of the low roofs
  const HL = 4.9; // living room walls
  const HK = 3.8; // kitchen walls
  const HC = 3.2; // courtyard walls

  // floor slab: house, courtyard, entrance landing
  A(-6.4, -0.4, 12.4, 28.8, BASE_Y, 0);
  A(-6.4, 28.6, 6.4, 41.0, BASE_Y, 0);
  A(-3.4, -3.0, 3.4, -0.4, BASE_Y, 0);

  // outside walls
  A(-6.4, -0.4, 12.4, 0, 0, LOW); // front (south)
  A(-6.4, -0.4, -6.0, 7.2, 0, LOW); // west, by the study
  A(-6.4, 7.0, -6.0, 18.4, 0, HL); // west, living room
  A(-6.4, 18.2, -6.0, 28.6, 0, HK); // west, kitchen
  A(12.0, -0.4, 12.4, 28.8, 0, LOW); // east, bedroom wing
  A(6.2, 28.4, 12.4, 28.8, 0, LOW); // north end of the wing
  A(-6.4, 28.4, 6.2, 28.6, 0, HK); // kitchen to courtyard
  A(-6.4, 28.6, -6.0, 41.0, 0, HC); // courtyard west
  A(-6.4, 40.6, 6.4, 41.0, 0, HC); // courtyard north
  A(6.0, 28.6, 6.4, 41.0, 0, HC); // courtyard east

  // the cross walls of the long bar
  A(-6.4, 7.0, 6.2, 7.2, 0, HL); // hall block | living room
  A(-6.4, 18.2, 6.2, 18.4, 0, HL); // living room | kitchen
  // the wall between the bar and the bedroom wing
  A(6.0, 0, 6.2, 7.0, 0, 2.7);
  A(6.0, 7.0, 6.2, 18.4, 0, HL);
  A(6.0, 18.2, 6.2, 28.6, 0, HK);

  // hall side walls, cloaks | wc
  A(-2.2, 0, -2.0, 7.0, 0, 2.7);
  A(2.0, 0, 2.2, 7.0, 0, 2.7);
  A(2.2, 4.3, 6.0, 4.5, 0, 2.7);

  // bedroom wing partitions
  A(7.6, 0, 7.8, 28.4, 0, 2.7); // gallery
  A(7.8, 6.3, 12.0, 6.5, 0, 2.7);
  A(7.8, 12.8, 12.0, 13.0, 0, 2.7);
  A(7.8, 17.0, 12.0, 17.2, 0, 2.7);
  A(9.8, 13.0, 10.0, 17.0, 0, 2.7);
  A(7.8, 24.2, 12.0, 24.4, 0, 2.7);

  // fireplace: a block of masonry on the east wall of the living room
  A(5.2, 10.6, 6.0, 15.4, 0, 4.2);
  C(5.2, 11.9, 5.75, 14.1, 0.32, 1.1);

  // ---- openings ----
  C(-2.0, -0.4, 2.0, 0, 0, 2.7); // glazed front of the hall
  C(-1.2, 7.0, 1.2, 7.2, 0, 2.7); // hall to living room
  C(-1.5, 18.2, 1.5, 18.4, 0, 3.0); // living room to kitchen
  C(-5.4, 28.4, 5.4, 28.6, 0, 2.9); // kitchen to courtyard
  C(-6.4, 8.0, -6.0, 17.4, 0, 4.2); // living room glass wall, west
  // windows
  C(-6.4, 2.0, -6.0, 5.0, 0.9, 2.4); // study, west
  C(-5.2, -0.4, -3.2, 0, 0.9, 2.4); // study, south
  C(-6.4, 20.0, -6.0, 26.6, 1.0, 2.6); // kitchen, west, over the worktop
  C(12.0, 1.5, 12.4, 4.5, 0.9, 2.4); // bedroom 3
  C(8.8, -0.4, 11.0, 0, 0.9, 2.4); // bedroom 3, south
  C(12.0, 8.0, 12.4, 11.0, 0.9, 2.4); // bedroom 2
  C(12.0, 19.0, 12.4, 23.0, 0, 2.4); // master bedroom
  // doors, 0.9 wide and 2.2 high
  C(2.0, 0.7, 2.2, 1.6, 0, 2.2); // hall to cloaks
  C(4.6, 4.3, 5.4, 4.5, 0, 2.2); // cloaks to wc
  C(-5.0, 7.0, -4.1, 7.2, 0, 2.2); // living room to study
  C(6.0, 8.2, 6.2, 9.1, 0, 2.2); // living room to gallery
  C(7.6, 5.2, 7.8, 6.1, 0, 2.2);
  C(7.6, 7.0, 7.8, 7.9, 0, 2.2);
  C(7.6, 14.6, 7.8, 15.4, 0, 2.2);
  C(10.6, 12.8, 11.4, 13.0, 0, 2.2);
  C(7.6, 17.6, 7.8, 18.5, 0, 2.2);
  C(8.2, 24.2, 9.1, 24.4, 0, 2.2);
  // shadow gaps between the oak panels of the hall's east wall
  for (const n of [2.5, 3.4, 4.3, 5.2, 6.1]) C(2.0, n, 2.008, n + 0.008, 0, 2.7);
  // pool
  C(1.6, 30.6, 3.6, 38.6, BASE_Y, 0);

  const shell = S.build(
    (cx, cy, cz, nx, ny, nz) => {
      const n = -cz;
      if (ny > 0.5 && Math.abs(cy) < 1e-3) return 'floor';
      if (cx > 1.99 && cx < 2.19 && n > 0 && n < 7 && cy > 0 && cy < 2.7 && nx < 0.5) return 'oak';
      return 'plaster';
    },
    (mx, my, mz, ax, ay, az) => roomAt(ax, -az, ay)
  );

  // ------------------------------------------------------------------
  // 2. Roofs: their own solid, so that the cut shows them as a plain lid.
  // ------------------------------------------------------------------
  const Rf = new RectSolid();
  const RA = (x0, n0, x1, n1, y0, y1) => Rf.add(x0, y0, -n0, x1, y1, -n1);
  RA(-6.0, 0, 12.0, 7.0, 2.7, 3.0); // hall block and the south end of the wing
  RA(6.2, 7.0, 12.0, 28.4, 2.7, 3.0); // wing
  RA(-6.0, 7.2, 6.0, 18.2, 4.2, 4.55); // living room
  RA(-6.0, 18.4, 6.0, 28.4, 3.2, 3.5); // kitchen
  const roof = Rf.build(
    (cx, cy, cz, nx, ny) => (ny < -0.5 ? 'ceiling' : 'plaster'),
    (mx, my, mz, ax, ay, az) => roomAt(ax, -az, ay)
  );

  // ------------------------------------------------------------------
  // 3. Loose pieces.
  // ------------------------------------------------------------------
  const K = new Kit();
  const G = 'generic';

  // ---- glass and frames ----
  K.box('hall', 'glass', -1.97, -0.22, -0.8, -0.18, 0.02, 2.68); // sidelights
  K.box('hall', 'glass', 0.8, -0.22, 1.97, -0.18, 0.02, 2.68);
  for (const x of [-2.0, -0.8, 0.75, 1.95]) K.box('hall', 'bronze', x, -0.26, x + 0.05, -0.14, 0, 2.7);
  K.box('hall', 'bronze', -2.0, -0.26, 2.0, -0.14, 2.66, 2.7);
  // living room, west: five posts and four panes
  for (const n of [8.0, 10.35, 12.7, 15.05, 17.32]) K.box('living', 'bronze', -6.28, n, -6.14, n + 0.08, 0, 4.2);
  K.box('living', 'glass', -6.22, 8.08, -6.19, 17.32, 0.02, 4.18);
  K.box('living', 'bronze', -6.28, 8.0, -6.14, 17.4, 0, 0.05);
  // kitchen to courtyard: four sliding panes
  for (const x of [-5.4, -2.72, -0.04, 2.64, 5.32]) K.box('kitchen', 'bronze', x, 28.46, x + 0.08, 28.56, 0, 2.9);
  K.box('kitchen', 'glass', -5.32, 28.5, 5.32, 28.52, 0.02, 2.88);
  // ordinary windows
  K.box('rest', 'glass', -6.21, 2.0, -6.19, 5.0, 0.9, 2.4);
  K.box('rest', 'glass', -5.2, -0.21, -3.2, -0.19, 0.9, 2.4);
  K.box('kitchen', 'glass', -6.21, 20.0, -6.19, 26.6, 1.0, 2.6);
  K.box('rest', 'glass', 12.19, 1.5, 12.21, 4.5, 0.9, 2.4);
  K.box('rest', 'glass', 8.8, -0.21, 11.0, -0.19, 0.9, 2.4);
  K.box('rest', 'glass', 12.19, 8.0, 12.21, 11.0, 0.9, 2.4);
  K.box('rest', 'glass', 12.19, 19.0, 12.21, 23.0, 0.02, 2.4);

  // ---- inner doors, standing open the way a plan draws them ----
  for (const d of DOORS) {
    const a = (d.open * Math.PI) / 180;
    const x1 = d.x + Math.cos(a) * 0.9, n1 = d.n + Math.sin(a) * 0.9;
    if (Math.abs(Math.cos(a)) > 0.5) K.box('rest', G, d.x, d.n, x1, d.n + 0.04, 0.01, 2.19);
    else K.box('rest', G, d.x, d.n, d.x + 0.04, n1, 0.01, 2.19);
  }

  // ---- hall: the one room with real materials at this checkpoint ----
  // travertine console on two blades, west wall
  K.box('hall', 'stone', -2.0, 2.9, -1.52, 5.5, 0.74, 0.82);
  K.box('hall', 'stone', -1.96, 3.08, -1.58, 3.16, 0, 0.74);
  K.box('hall', 'stone', -1.96, 5.24, -1.58, 5.32, 0, 0.74);
  // painting above it
  K.box('hall', 'painting', -1.992, 3.3, -1.965, 5.1, 1.14, 2.44);
  K.box('hall', 'oakLong', -1.998, 3.27, -1.955, 3.3, 1.11, 2.47, false);
  K.box('hall', 'oakLong', -1.998, 5.1, -1.955, 5.13, 1.11, 2.47, false);
  K.box('hall', 'oakLong', -1.998, 3.27, -1.955, 5.13, 1.11, 1.14, false);
  K.box('hall', 'oakLong', -1.998, 3.27, -1.955, 5.13, 2.44, 2.47, false);
  // things on the console
  // a lathe profile drawn as a smooth curve through a few points
  const profile = (pts, n = 30) => new THREE.SplineCurve(pts.map((p) => new THREE.Vector2(p[0], p[1]))).getPoints(n);
  const vase = new THREE.LatheGeometry([new THREE.Vector2(0, 0), ...profile([[0.07, 0], [0.125, 0.07], [0.15, 0.17], [0.12, 0.28], [0.065, 0.35], [0.048, 0.39], [0.058, 0.42]])], 40);
  K.geo('hall', 'ceramicDark', place(vase, -1.74, 0.82, 3.55), 60);
  const twig = (dx, dn, h, lean) => {
    const g = new THREE.CylinderGeometry(0.002, 0.0045, h, 5);
    g.translate(0, h / 2, 0);
    g.rotateZ(lean * dx);
    g.rotateX(lean * dn);
    K.geo('hall', 'branch', place(g, -1.74, 1.2, 3.55), null);
    // one ink line per twig is enough for the drawing
    const top = new THREE.Vector3(0, h, 0).applyEuler(new THREE.Euler(lean * dn, 0, lean * dx));
    K.edges('hall').push(-1.74, 1.2, -3.55, -1.74 + top.x, 1.2 + top.y, -3.55 + top.z);
  };
  twig(1, 0.2, 0.95, 0.3); twig(-0.6, -1, 0.8, 0.28); twig(0.3, 1, 1.05, 0.2); twig(-1, 0.6, 0.72, 0.34); twig(0.9, -0.7, 0.86, 0.18); twig(-0.2, -0.3, 1.1, 0.12); twig(0.5, 0.9, 0.6, 0.4);
  const bowl = new THREE.LatheGeometry([[0.0, 0.0], [0.06, 0.0], [0.15, 0.035], [0.19, 0.075], [0.185, 0.08], [0.14, 0.045], [0.0, 0.02]].map((p) => new THREE.Vector2(p[0], p[1])), 28);
  K.geo('hall', 'bronze', place(bowl, -1.74, 0.82, 4.35), 35);
  K.box('hall', 'bookA', -1.9, 4.85, -1.62, 5.22, 0.82, 0.855);
  K.box('hall', 'bookB', -1.89, 4.87, -1.64, 5.2, 0.855, 0.885);
  K.box('hall', 'bookC', -1.87, 4.9, -1.66, 5.16, 0.885, 0.91);
  // oak bench with a leather pad, east wall
  K.box('hall', 'oakLong', 1.5, 3.0, 1.96, 4.9, 0.36, 0.42);
  K.box('hall', 'oakLong', 1.54, 3.12, 1.92, 3.18, 0, 0.36);
  K.box('hall', 'oakLong', 1.54, 4.72, 1.92, 4.78, 0, 0.36);
  K.box('hall', 'leather', 1.52, 3.03, 1.94, 4.87, 0.42, 0.49);
  // tall jar in the far corner
  const jar = new THREE.LatheGeometry([new THREE.Vector2(0, 0), ...profile([[0.16, 0], [0.25, 0.14], [0.3, 0.4], [0.26, 0.64], [0.165, 0.8], [0.125, 0.86], [0.145, 0.9]])], 44);
  K.geo('hall', 'ceramicSand', place(jar, -1.52, 0, 6.48), 60);
  // three small lights let into the ceiling
  for (const n of [1.3, 3.5, 5.7]) {
    const d = new THREE.CylinderGeometry(0.045, 0.045, 0.012, 20);
    K.geo('hall', 'lamp', place(d, 0, 2.694, n), 35);
  }

  // ---- living room (line drawing for now) ----
  K.box('living', G, -4.6, 9.8, 2.0, 15.9, 0, 0.02); // rug
  K.box('living', G, -4.0, 10.6, -2.9, 14.8, 0, 0.42); // long sofa
  K.box('living', G, -4.0, 10.6, -3.68, 14.8, 0.42, 0.8);
  K.box('living', G, -4.0, 10.6, -2.9, 10.86, 0.42, 0.62);
  K.box('living', G, -4.0, 14.54, -2.9, 14.8, 0.42, 0.62);
  for (const n of [10.9, 12.1, 13.3]) K.box('living', G, -3.66, n, -2.92, n + 1.18, 0.42, 0.54);
  K.box('living', G, -1.9, 11.5, -0.5, 13.9, 0.3, 0.36); // low table
  K.box('living', G, -1.8, 11.6, -0.6, 13.8, 0, 0.3);
  for (const n of [10.9, 13.3]) { // two armchairs
    K.box('living', G, 0.5, n, 1.4, n + 0.9, 0, 0.4);
    K.box('living', G, 1.15, n, 1.4, n + 0.9, 0.4, 0.76);
    K.box('living', G, 0.5, n, 1.15, n + 0.14, 0.4, 0.58);
    K.box('living', G, 0.5, n + 0.76, 1.15, n + 0.9, 0.4, 0.58);
  }
  K.box('living', G, -2.3, 15.0, 0.9, 15.95, 0, 0.42); // sofa across the top of the rug
  K.box('living', G, -2.3, 15.67, 0.9, 15.95, 0.42, 0.8);
  K.box('living', G, 4.55, 10.6, 5.2, 15.4, 0, 0.32); // hearth
  K.box('living', G, 2.4, 7.25, 5.6, 7.75, 0, 0.76); // sideboard
  K.box('living', G, -5.6, 7.3, -5.2, 7.7, 0, 1.5); // floor lamp
  K.box('living', G, -5.5, 16.3, -4.5, 17.3, 0, 0.42); // reading chair
  K.box('living', G, -5.5, 17.05, -4.5, 17.3, 0.42, 0.85);

  // ---- kitchen and dining ----
  K.box('kitchen', G, -3.5, 20.2, -2.3, 24.4, 0, 0.92); // island, 4.2 long
  K.box('kitchen', G, -3.56, 20.14, -2.24, 24.46, 0.92, 0.96);
  for (const n of [20.7, 21.7, 22.7, 23.7]) K.box('kitchen', G, -2.1, n - 0.2, -1.7, n + 0.2, 0, 0.66);
  K.box('kitchen', G, -6.0, 19.2, -5.35, 27.8, 0, 0.92); // worktop under the window
  K.box('kitchen', G, -6.0, 18.45, -2.2, 19.1, 0, 2.4); // tall units
  K.box('kitchen', G, 1.9, 20.6, 3.1, 24.0, 0.72, 0.77); // dining table for ten
  for (const [x, n] of [[2.0, 20.75], [2.92, 20.75], [2.0, 23.77], [2.92, 23.77]]) K.box('kitchen', G, x, n, x + 0.08, n + 0.08, 0, 0.72);
  for (let i = 0; i < 5; i++) {
    const n = 20.78 + i * 0.66;
    K.box('kitchen', G, 1.3, n, 1.76, n + 0.46, 0, 0.46);
    K.box('kitchen', G, 1.3, n, 1.35, n + 0.46, 0.46, 0.84);
    K.box('kitchen', G, 3.24, n, 3.7, n + 0.46, 0, 0.46);
    K.box('kitchen', G, 3.65, n, 3.7, n + 0.46, 0.46, 0.84);
  }
  K.box('kitchen', G, 5.45, 19.6, 6.0, 25.0, 0, 0.8); // sideboard

  // ---- courtyard ----
  K.box('court', G, 1.6, 30.6, 3.6, 38.6, BASE_Y, -0.05); // water
  K.box('court', G, -2.0, 40.05, 2.0, 40.6, 0, 0.45); // bench on the north wall
  K.box('court', G, -0.4, 32.0, 0.3, 34.0, 0, 0.3);
  K.box('court', G, -0.4, 35.2, 0.3, 37.2, 0, 0.3);
  const tree = (room, x, n, base, trunkH, r, turn) => {
    K.geo(room, G, place(new THREE.CylinderGeometry(0.13, 0.19, trunkH, 9), x, base + trunkH / 2, n), 50);
    K.geo(room, G, place(new THREE.IcosahedronGeometry(r, 1), x, base + trunkH + r * 0.62, n, turn, 1, 0.82, 1), 1);
  };
  for (const t of TREES) tree(t.room, t.x, t.n, t.base, t.trunk, t.r, t.turn);

  // ---- study, cloaks, wc ----
  K.box('rest', G, -5.6, 2.6, -3.9, 3.5, 0.7, 0.75);
  for (const [x, n] of [[-5.55, 2.65], [-4.01, 2.65], [-5.55, 3.39], [-4.01, 3.39]]) K.box('rest', G, x, n, x + 0.06, n + 0.06, 0, 0.7);
  K.box('rest', G, -5.0, 3.7, -4.5, 4.2, 0, 0.46);
  K.box('rest', G, -2.62, 0.3, -2.2, 6.7, 0, 2.4);
  K.box('rest', G, -5.9, 5.6, -5.0, 6.9, 0, 0.4);
  K.box('rest', G, 5.4, 0.1, 6.0, 4.2, 0, 2.4);
  K.box('rest', G, 2.3, 2.4, 2.75, 4.2, 0, 0.45);
  K.box('rest', G, 5.2, 5.4, 5.92, 5.82, 0, 0.42);
  K.box('rest', G, 2.3, 5.1, 2.8, 6.4, 0.78, 0.9);

  // ---- bedroom wing ----
  const bed = (x0, n0, w, l) => {
    K.box('rest', G, x0, n0, x0 + w, n0 + l, 0, 0.48);
    K.box('rest', G, x0, n0 + l - 0.08, x0 + w, n0 + l, 0.48, 1.05);
    K.box('rest', G, x0 + 0.1, n0 + l - 0.62, x0 + w / 2 - 0.05, n0 + l - 0.14, 0.48, 0.6);
    K.box('rest', G, x0 + w / 2 + 0.05, n0 + l - 0.62, x0 + w - 0.1, n0 + l - 0.14, 0.48, 0.6);
    K.box('rest', G, x0 - 0.55, n0 + l - 0.5, x0 - 0.1, n0 + l - 0.05, 0, 0.5);
    K.box('rest', G, x0 + w + 0.1, n0 + l - 0.5, x0 + w + 0.55, n0 + l - 0.05, 0, 0.5);
  };
  bed(9.0, 4.1, 1.8, 2.1);
  K.box('rest', G, 7.8, 0.2, 8.4, 3.8, 0, 2.4);
  bed(9.0, 10.6, 1.8, 2.1);
  K.box('rest', G, 7.8, 8.4, 8.4, 12.6, 0, 2.4);
  K.box('rest', G, 7.9, 15.1, 8.75, 16.9, 0, 0.56); // bath
  K.box('rest', G, 7.9, 13.1, 9.0, 13.6, 0.78, 0.9);
  K.box('rest', G, 10.1, 15.6, 11.9, 16.9, 0, 0.05); // shower
  K.box('rest', G, 10.9, 13.1, 11.9, 13.6, 0.78, 0.9);
  bed(8.9, 21.9, 2.0, 2.2);
  K.box('rest', G, 9.2, 21.1, 10.6, 21.55, 0, 0.44);
  K.box('rest', G, 7.8, 24.5, 8.4, 28.3, 0, 2.4);
  K.box('rest', G, 11.4, 24.5, 12.0, 28.3, 0, 2.4);
  K.box('rest', G, 9.3, 25.6, 10.5, 27.2, 0, 0.45);

  // ---- outside ----
  K.box('rest', G, -5.0, -2.4, -3.8, -0.9, GROUND_Y, 0.55); // planters by the door
  K.box('rest', G, 3.8, -2.4, 5.0, -0.9, GROUND_Y, 0.55);

  // ------------------------------------------------------------------
  // 4. The front door: an oak slab on an offset pivot.
  // ------------------------------------------------------------------
  const doorB = { p: [], n: [], uv: [], idx: [] };
  const pullB = { p: [], n: [], uv: [], idx: [] };
  const doorE = [];
  pushBox(doorB, doorE, -0.35, 0.012, -0.035, 1.14, 2.655, 0.035);
  pushBox(pullB, doorE, 0.98, 0.85, 0.035, 1.015, 1.75, 0.085);
  pushBox(pullB, doorE, 0.98, 0.85, -0.085, 1.015, 1.75, -0.035);

  return {
    shell, roof, kit: K,
    door: { leaf: bucketToGeometry(doorB), pull: bucketToGeometry(pullB), edges: doorE, pivot: new THREE.Vector3(-0.4, 0, 0.2) },
    bucketToGeometry,
  };
}

// RectSolid: a small solid modeller for right-angled buildings.
//
// You add and subtract axis-aligned boxes. build() returns the surface of the
// resulting solid (one watertight skin, no faces hidden inside it) and its
// true edges (only where two surfaces meet at an angle, never a seam between
// two boxes that happen to touch).
//
// Why it matters here: the floor plan is this solid cut by a clipping plane.
// Because the skin is watertight, anything you see through the cut is the
// inside of a wall, and painting insides black gives the solid black walls of
// an architect's plan with no extra geometry.

import * as THREE from 'three';

const R = (v) => Math.round(v * 1e4) / 1e4;

export class RectSolid {
  constructor() {
    this.ops = [];
  }

  add(x0, y0, z0, x1, y1, z1) {
    this.ops.push([1, R(Math.min(x0, x1)), R(Math.min(y0, y1)), R(Math.min(z0, z1)), R(Math.max(x0, x1)), R(Math.max(y0, y1)), R(Math.max(z0, z1))]);
    return this;
  }

  sub(x0, y0, z0, x1, y1, z1) {
    this.ops.push([0, R(Math.min(x0, x1)), R(Math.min(y0, y1)), R(Math.min(z0, z1)), R(Math.max(x0, x1)), R(Math.max(y0, y1)), R(Math.max(z0, z1))]);
    return this;
  }

  // faceKey(cx, cy, cz, nx, ny, nz) -> material key
  // edgeKey(mx, my, mz, ax, ay, az) -> line set key, where a is a point just
  //   off the edge on its open-air side
  build(faceKey, edgeKey) {
    const uniq = (arr) => [...new Set(arr)].sort((a, b) => a - b);
    const xs = uniq(this.ops.flatMap((o) => [o[1], o[4]]));
    const ys = uniq(this.ops.flatMap((o) => [o[2], o[5]]));
    const zs = uniq(this.ops.flatMap((o) => [o[3], o[6]]));
    const ix = new Map(xs.map((v, i) => [v, i]));
    const iy = new Map(ys.map((v, i) => [v, i]));
    const iz = new Map(zs.map((v, i) => [v, i]));
    const nx = xs.length - 1, ny = ys.length - 1, nz = zs.length - 1;
    const occ = new Uint8Array(nx * ny * nz);
    const id = (i, j, k) => i + nx * (j + ny * k);
    for (const o of this.ops) {
      const i0 = ix.get(o[1]), i1 = ix.get(o[4]);
      const j0 = iy.get(o[2]), j1 = iy.get(o[5]);
      const k0 = iz.get(o[3]), k1 = iz.get(o[6]);
      for (let k = k0; k < k1; k++) for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) occ[id(i, j, k)] = o[0];
    }
    const at = (i, j, k) => (i < 0 || j < 0 || k < 0 || i >= nx || j >= ny || k >= nz ? 0 : occ[id(i, j, k)]);

    // ---- faces -------------------------------------------------------
    const buckets = {};
    const bucket = (key) => (buckets[key] ??= { p: [], n: [], uv: [], idx: [] });
    const quad = (key, a, b, c, d, n) => {
      const B = bucket(key);
      const base = B.p.length / 3;
      for (const v of [a, b, c, d]) {
        B.p.push(v[0], v[1], v[2]);
        B.n.push(n[0], n[1], n[2]);
        // world-planar UVs in metres, so every surface has the same texel density
        if (n[0] !== 0) B.uv.push(v[2], v[1]);
        else if (n[1] !== 0) B.uv.push(v[0], v[2]);
        else B.uv.push(v[0], v[1]);
      }
      B.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    };
    let faceCount = 0;
    for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      if (!occ[id(i, j, k)]) continue;
      const x0 = xs[i], x1 = xs[i + 1], y0 = ys[j], y1 = ys[j + 1], z0 = zs[k], z1 = zs[k + 1];
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, cz = (z0 + z1) / 2;
      if (!at(i + 1, j, k)) { quad(faceKey(x1, cy, cz, 1, 0, 0), [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0]); faceCount++; }
      if (!at(i - 1, j, k)) { quad(faceKey(x0, cy, cz, -1, 0, 0), [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0]); faceCount++; }
      if (!at(i, j + 1, k)) { quad(faceKey(cx, y1, cz, 0, 1, 0), [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0]); faceCount++; }
      if (!at(i, j - 1, k)) { quad(faceKey(cx, y0, cz, 0, -1, 0), [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0]); faceCount++; }
      if (!at(i, j, k + 1)) { quad(faceKey(cx, cy, z1, 0, 0, 1), [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1]); faceCount++; }
      if (!at(i, j, k - 1)) { quad(faceKey(cx, cy, z0, 0, 0, -1), [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1]); faceCount++; }
    }
    const geos = {};
    for (const key in buckets) {
      const B = buckets[key];
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(B.p, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(B.n, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(B.uv, 2));
      g.setIndex(B.idx);
      geos[key] = g;
    }

    // ---- edges -------------------------------------------------------
    // Walk every grid line. Around each little piece of it sit four cells.
    // One or three filled: a real corner. Two filled side by side: a flat
    // surface runs through, no edge. Two filled diagonally: two corners touch.
    const edges = {};
    const pushEdge = (key, a, b) => (edges[key] ??= []).push(a[0], a[1], a[2], b[0], b[1], b[2]);
    const axes = [
      { n: [nx, ny, nz], c: [xs, ys, zs], perm: [0, 1, 2] }, // along x
      { n: [ny, nz, nx], c: [ys, zs, xs], perm: [1, 2, 0] }, // along y
      { n: [nz, nx, ny], c: [zs, xs, ys], perm: [2, 0, 1] }, // along z
    ];
    const OFF = 0.06;
    for (const A of axes) {
      const [na, nb, nc] = A.n;
      const [ca, cb, cc] = A.c;
      const P = A.perm;
      const cell = (a, b, c) => {
        const v = [0, 0, 0];
        v[P[0]] = a; v[P[1]] = b; v[P[2]] = c;
        return at(v[0], v[1], v[2]);
      };
      const point = (a, b, c) => {
        const v = [0, 0, 0];
        v[P[0]] = a; v[P[1]] = b; v[P[2]] = c;
        return v;
      };
      for (let b = 0; b <= nb; b++) for (let c = 0; c <= nc; c++) {
        let runStart = -1, runSig = '', runKey = '';
        const flush = (endA) => {
          if (runStart < 0) return;
          pushEdge(runKey, point(ca[runStart], cb[b], cc[c]), point(ca[endA], cb[b], cc[c]));
          runStart = -1;
        };
        for (let a = 0; a < na; a++) {
          const f00 = cell(a, b - 1, c - 1), f10 = cell(a, b, c - 1), f01 = cell(a, b - 1, c), f11 = cell(a, b, c);
          const sum = f00 + f10 + f01 + f11;
          const diag = sum === 2 && f00 === f11;
          if (sum === 1 || sum === 3 || diag) {
            // direction towards the open air, in the (b, c) plane
            let db = 0, dc = 0;
            if (!f00) { db -= 1; dc -= 1; }
            if (!f10) { db += 1; dc -= 1; }
            if (!f01) { db -= 1; dc += 1; }
            if (!f11) { db += 1; dc += 1; }
            const len = Math.hypot(db, dc) || 1;
            const mid = point((ca[a] + ca[a + 1]) / 2, cb[b], cc[c]);
            const air = point((ca[a] + ca[a + 1]) / 2, cb[b] + (db / len) * OFF, cc[c] + (dc / len) * OFF);
            const key = edgeKey(mid[0], mid[1], mid[2], air[0], air[1], air[2]);
            const sig = '' + f00 + f10 + f01 + f11;
            if (runStart >= 0 && (sig !== runSig || key !== runKey)) flush(a);
            if (runStart < 0) { runStart = a; runSig = sig; runKey = key; }
          } else {
            flush(a);
          }
        }
        flush(na);
      }
    }
    return { geos, edges, stats: { cells: nx * ny * nz, faces: faceCount } };
  }
}

// A plain box with the same world-planar UVs, plus its 12 edges.
// Appends into a bucket { p, n, uv, idx } and an edge array.
export function pushBox(B, E, x0, y0, z0, x1, y1, z1) {
  const quad = (a, b, c, d, n) => {
    const base = B.p.length / 3;
    for (const v of [a, b, c, d]) {
      B.p.push(v[0], v[1], v[2]);
      B.n.push(n[0], n[1], n[2]);
      if (n[0] !== 0) B.uv.push(v[2], v[1]);
      else if (n[1] !== 0) B.uv.push(v[0], v[2]);
      else B.uv.push(v[0], v[1]);
    }
    B.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };
  quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0]);
  quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0]);
  quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0]);
  quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0]);
  quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1]);
  quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1]);
  if (E) {
    const c = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]];
    const L = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
    for (const [a, b] of L) E.push(c[a][0], c[a][1], c[a][2], c[b][0], c[b][1], c[b][2]);
  }
}

export function bucketToGeometry(B) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(B.p, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(B.n, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(B.uv, 2));
  g.setIndex(B.idx);
  return g;
}

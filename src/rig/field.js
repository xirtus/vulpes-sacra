// field.js — the implicit-surface engine. Species-agnostic: it knows about
// superelliptic segments, ellipsoids and smooth-minimum welding, and nothing
// about any particular animal.
//
// The animal is one continuous signed-distance field built from generalised
// superelliptic segments (Gielis cross-sections swept between two frames) and
// ellipsoids, welded together with a polynomial smooth-minimum. Because the
// weld is analytic there is no seam anywhere on the body: it is a single skin,
// the way a single skin is what actually grows.
//
// The field is then polygonised with marching cubes on a rectangular lattice.


import { edgeTable, triTable } from 'three/addons/objects/MarchingCubes.js';

// Polynomial smooth minimum. k is the width of the fillet, in metres.
// This is what turns a pile of separate volumes into one continuous living skin.
export function smin(a, b, k) {
  if (k <= 0) return a < b ? a : b;
  const h = Math.max(0, k - Math.abs(a - b)) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

// Smooth subtraction — carves one volume out of another with a soft edge.
export function smax(a, b, k) {
  if (k <= 0) return a > b ? a : b;
  const h = Math.max(0, k - Math.abs(a - b)) / k;
  return Math.max(a, b) + h * h * k * 0.25;
}


const EMPTY = 0.06;   // distance reported where no volume is anywhere near

// ---------------------------------------------------------------------------

export class Field {
  constructor() { this.prims = []; }

  // Generalised superelliptic segment.
  // a,b        end centres (THREE.Vector3-like {x,y,z})
  // r1a,r2a    lateral / vertical half-widths at a
  // r1b,r2b    lateral / vertical half-widths at b
  // n          superellipse exponent (2 = ellipse, 3.2 = fuller, 1.6 = leaner)
  // lat        lateral reference axis, default world +Z
  seg(a, b, r1a, r2a, r1b, r2b, n = 2, k = 0.03, lat = null) {
    let dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
    const len = Math.hypot(dx, dy, dz) || 1e-6;
    dx /= len; dy /= len; dz /= len;
    let lx = lat ? lat.x : 0, ly = lat ? lat.y : 0, lz = lat ? lat.z : 1;
    // e2 = d x lat, e1 = e2 x d  (Gram-Schmidt, robust for any orientation)
    let e2x = dy * lz - dz * ly, e2y = dz * lx - dx * lz, e2z = dx * ly - dy * lx;
    let m = Math.hypot(e2x, e2y, e2z);
    if (m < 1e-5) { lx = 1; ly = 0; lz = 0; e2x = dy * lz - dz * ly; e2y = dz * lx - dx * lz; e2z = dx * ly - dy * lx; m = Math.hypot(e2x, e2y, e2z); }
    e2x /= m; e2y /= m; e2z /= m;
    const e1x = e2y * dz - e2z * dy, e1y = e2z * dx - e2x * dz, e1z = e2x * dy - e2y * dx;
    const pr = { t: 0, ax: a.x, ay: a.y, az: a.z, dx, dy, dz, len,
      e1x, e1y, e1z, e2x, e2y, e2z, r1a, r2a, r1b, r2b, n, k };
    this._bounds(pr);
    this.prims.push(pr);
    return pr;
  }

  ell(c, rx, ry, rz, k = 0.03) {
    const pr = { t: 1, cx: c.x, cy: c.y, cz: c.z, rx, ry, rz, k };
    this._bounds(pr);
    this.prims.push(pr);
    return pr;
  }

  _bounds(pr) {
    let x0, y0, z0, x1, y1, z1;
    if (pr.t === 0) {
      const bx = pr.ax + pr.dx * pr.len, by = pr.ay + pr.dy * pr.len, bz = pr.az + pr.dz * pr.len;
      const r = Math.max(pr.r1a, pr.r2a, pr.r1b, pr.r2b);
      x0 = Math.min(pr.ax, bx) - r; x1 = Math.max(pr.ax, bx) + r;
      y0 = Math.min(pr.ay, by) - r; y1 = Math.max(pr.ay, by) + r;
      z0 = Math.min(pr.az, bz) - r; z1 = Math.max(pr.az, bz) + r;
    } else {
      x0 = pr.cx - pr.rx; x1 = pr.cx + pr.rx;
      y0 = pr.cy - pr.ry; y1 = pr.cy + pr.ry;
      z0 = pr.cz - pr.rz; z1 = pr.cz + pr.rz;
    }
    const m = pr.k + EMPTY;
    pr.b = [x0 - m, y0 - m, z0 - m, x1 + m, y1 + m, z1 + m];
  }

  // ---- spatial binning so the field costs ~5 primitives per sample --------
  bake(bin = 0.05) {
    const P = this.prims;
    let x0 = 1e9, y0 = 1e9, z0 = 1e9, x1 = -1e9, y1 = -1e9, z1 = -1e9;
    for (const pr of P) {
      x0 = Math.min(x0, pr.b[0]); y0 = Math.min(y0, pr.b[1]); z0 = Math.min(z0, pr.b[2]);
      x1 = Math.max(x1, pr.b[3]); y1 = Math.max(y1, pr.b[4]); z1 = Math.max(z1, pr.b[5]);
    }
    this.bbox = [x0, y0, z0, x1, y1, z1];
    this.bin = bin;
    this.bnx = Math.max(1, Math.ceil((x1 - x0) / bin));
    this.bny = Math.max(1, Math.ceil((y1 - y0) / bin));
    this.bnz = Math.max(1, Math.ceil((z1 - z0) / bin));
    const n = this.bnx * this.bny * this.bnz;
    this.bins = new Array(n);
    for (let i = 0; i < n; i++) this.bins[i] = [];
    for (let i = 0; i < P.length; i++) {
      const b = P[i].b;
      const i0 = Math.max(0, Math.floor((b[0] - x0) / bin)), i1 = Math.min(this.bnx - 1, Math.floor((b[3] - x0) / bin));
      const j0 = Math.max(0, Math.floor((b[1] - y0) / bin)), j1 = Math.min(this.bny - 1, Math.floor((b[4] - y0) / bin));
      const k0 = Math.max(0, Math.floor((b[2] - z0) / bin)), k1 = Math.min(this.bnz - 1, Math.floor((b[5] - z0) / bin));
      for (let k = k0; k <= k1; k++) for (let j = j0; j <= j1; j++) for (let ii = i0; ii <= i1; ii++)
        this.bins[(k * this.bny + j) * this.bnx + ii].push(i);
    }
    // pack to typed arrays
    this.binList = this.bins.map(a => Int32Array.from(a));
    this.bins = null;
    return this;
  }

  at(x, y, z) {
    const B = this.bbox, bin = this.bin;
    const i = Math.floor((x - B[0]) / bin), j = Math.floor((y - B[1]) / bin), k = Math.floor((z - B[2]) / bin);
    if (i < 0 || j < 0 || k < 0 || i >= this.bnx || j >= this.bny || k >= this.bnz) return EMPTY;
    const list = this.binList[(k * this.bny + j) * this.bnx + i];
    let d = EMPTY;
    const P = this.prims;
    for (let q = 0; q < list.length; q++) {
      const pr = P[list[q]];
      d = smin(d, pr.t === 0 ? evalSeg(pr, x, y, z) : evalEll(pr, x, y, z), pr.k);
    }
    return d;
  }

  grad(x, y, z, e, out) {
    const dx = this.at(x + e, y, z) - this.at(x - e, y, z);
    const dy = this.at(x, y + e, z) - this.at(x, y - e, z);
    const dz = this.at(x, y, z + e) - this.at(x, y, z - e);
    const m = Math.hypot(dx, dy, dz) || 1;
    out[0] = dx / m; out[1] = dy / m; out[2] = dz / m;
    return out;
  }
}

function evalSeg(pr, x, y, z) {
  const px = x - pr.ax, py = y - pr.ay, pz = z - pr.az;
  let h = px * pr.dx + py * pr.dy + pz * pr.dz;
  // signed axial distance to the slab: negative inside, positive past either cap
  const half = pr.len * 0.5;
  const axial = Math.abs(h - half) - half;
  if (h < 0) h = 0; else if (h > pr.len) h = pr.len;
  const t = h / pr.len;
  const qx = px - pr.dx * h, qy = py - pr.dy * h, qz = pz - pr.dz * h;
  const u = qx * pr.e1x + qy * pr.e1y + qz * pr.e1z;
  const v = qx * pr.e2x + qy * pr.e2y + qz * pr.e2z;
  const r1 = pr.r1a + (pr.r1b - pr.r1a) * t;
  const r2 = pr.r2a + (pr.r2b - pr.r2a) * t;
  const g = Math.sqrt(u * u + v * v);
  let dr;
  if (g < 1e-7) dr = -(r1 < r2 ? r1 : r2);
  else {
    const n = pr.n;
    const f = Math.pow(Math.pow(Math.abs(u) / r1, n) + Math.pow(Math.abs(v) / r2, n), 1 / n);
    dr = g - g / f;                     // signed radial distance to the superellipse
  }
  return dr > axial ? dr : axial;       // tube intersected with the slab
}

function evalEll(pr, x, y, z) {
  const x0 = (x - pr.cx) / pr.rx, y0 = (y - pr.cy) / pr.ry, z0 = (z - pr.cz) / pr.rz;
  const k0 = Math.sqrt(x0 * x0 + y0 * y0 + z0 * z0);
  if (k0 < 1e-7) return -Math.min(pr.rx, pr.ry, pr.rz);
  const ax = x0 / pr.rx, ay = y0 / pr.ry, az = z0 / pr.rz;
  return k0 * (k0 - 1) / Math.sqrt(ax * ax + ay * ay + az * az);
}

// Walk outward from a point known to be inside the animal until the field
// changes sign, then bisect. Lets the eyes, the nose and the ear roots be
// placed on the skin the mathematics actually produced, rather than on a
// coordinate guessed in advance.
export function surfaceAlong(field, from, dir, maxT = 0.12, step = 0.0012) {
  const d = dir.clone().normalize();
  let t = 0, prev = field.at(from.x, from.y, from.z);
  while (t < maxT) {
    const t2 = t + step;
    const x = from.x + d.x * t2, y = from.y + d.y * t2, z = from.z + d.z * t2;
    const v = field.at(x, y, z);
    if (prev < 0 && v >= 0) {
      let lo = t, hi = t2;
      for (let i = 0; i < 24; i++) {
        const m = (lo + hi) * 0.5;
        const vm = field.at(from.x + d.x * m, from.y + d.y * m, from.z + d.z * m);
        if (vm < 0) lo = m; else hi = m;
      }
      const m = (lo + hi) * 0.5;
      return from.clone().addScaledVector(d, m);
    }
    prev = v; t = t2;
  }
  return from.clone().addScaledVector(d, maxT);
}

// ---------------------------------------------------------------------------
// Marching cubes over a rectangular lattice. Normals come from the analytic
// gradient of the field, not from averaged face normals, so the skin is
// exactly as smooth as the mathematics is.
// ---------------------------------------------------------------------------

const CORNER = [[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]];
const EDGE = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];

export function polygonise(field, cell) {
  const B = field.bbox;
  const pad = cell * 2;
  const ox = B[0] - pad, oy = B[1] - pad, oz = B[2] - pad;
  const nx = Math.ceil((B[3] - B[0] + 2 * pad) / cell) + 1;
  const ny = Math.ceil((B[4] - B[1] + 2 * pad) / cell) + 1;
  const nz = Math.ceil((B[5] - B[2] + 2 * pad) / cell) + 1;

  const slabA = new Float32Array(nx * ny);
  const slabB = new Float32Array(nx * ny);
  let A = slabA, C = slabB;

  const sample = (slab, kz) => {
    const z = oz + kz * cell;
    for (let j = 0; j < ny; j++) {
      const y = oy + j * cell, row = j * nx;
      for (let i = 0; i < nx; i++) slab[row + i] = field.at(ox + i * cell, y, z);
    }
  };
  sample(A, 0);

  const pos = [], nrm = [];
  const val = new Float32Array(8);
  const ex = new Float32Array(12), ey = new Float32Array(12), ez = new Float32Array(12);
  const g = [0, 0, 0];
  const eps = cell * 0.45;

  for (let k = 0; k < nz - 1; k++) {
    sample(C, k + 1);
    const z0 = oz + k * cell, z1 = z0 + cell;
    for (let j = 0; j < ny - 1; j++) {
      const y0 = oy + j * cell, y1 = y0 + cell;
      for (let i = 0; i < nx - 1; i++) {
        const x0 = ox + i * cell, x1 = x0 + cell;
        const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
        val[0] = A[a]; val[1] = A[b]; val[2] = A[d]; val[3] = A[c];
        val[4] = C[a]; val[5] = C[b]; val[6] = C[d]; val[7] = C[c];
        let ci = 0;
        if (val[0] < 0) ci |= 1;
        if (val[1] < 0) ci |= 2;
        if (val[2] < 0) ci |= 4;
        if (val[3] < 0) ci |= 8;
        if (val[4] < 0) ci |= 16;
        if (val[5] < 0) ci |= 32;
        if (val[6] < 0) ci |= 64;
        if (val[7] < 0) ci |= 128;
        const bits = edgeTable[ci];
        if (bits === 0) continue;
        for (let e = 0; e < 12; e++) {
          if (!(bits & (1 << e))) continue;
          const p0 = EDGE[e][0], p1 = EDGE[e][1];
          const v0 = val[p0], v1 = val[p1];
          const t = v0 / (v0 - v1);
          const c0 = CORNER[p0], c1 = CORNER[p1];
          ex[e] = (x0 + c0[0] * cell) + ((c1[0] - c0[0]) * cell) * t;
          ey[e] = (y0 + c0[1] * cell) + ((c1[1] - c0[1]) * cell) * t;
          ez[e] = (z0 + c0[2] * cell) + ((c1[2] - c0[2]) * cell) * t;
        }
        const base = ci << 4;
        for (let q = 0; triTable[base + q] !== -1; q += 3) {
          for (let s = 2; s >= 0; s--) {
            const e = triTable[base + q + s];
            const px = ex[e], py = ey[e], pz = ez[e];
            field.grad(px, py, pz, eps, g);
            pos.push(px, py, pz);
            nrm.push(g[0], g[1], g[2]);
          }
        }
      }
    }
    const tmp = A; A = C; C = tmp;
  }
  return {
    position: new Float32Array(pos),
    normal: new Float32Array(nrm),
    tris: pos.length / 9,
    lattice: [nx, ny, nz]
  };
}

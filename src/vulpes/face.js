// face.js — the parts that are too thin for a volume lattice to hold:
// the ears, the eyes with their vertical slit pupils, the nose leather and
// the vibrissae. All still closed-form: superellipse apertures, superformula
// ear outlines, a logarithmic spiral for every whisker.

import * as THREE from 'three';
import { PHI, PI, TAU, GOLDEN_ANGLE, GOLDEN_B, superellipse, gielis, julia, mandelbrot, clamp, mix, smoothstep, s2l, p } from './sacred.js';
import { PALETTE } from './coat.js';

const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);

// ---------------------------------------------------------------------------
// EAR — a lofted cup. At height s the cross-section is a lens whose thickness
// vanishes at the rim, so the edge is genuinely sharp and the tip is a point.
// ---------------------------------------------------------------------------
export function buildEar(ear, F) {
  const I = 34, J = 30;                        // stations up the ear, around the section
  const h = ear.height * 1.04, w = ear.width * 0.86, dep = ear.width * 0.60, th = ear.thick * 1.15;

  // ear frame
  const up = ear.dir.clone().normalize();
  const out = F.face.right.clone().multiplyScalar(ear.side);
  out.addScaledVector(up, -out.dot(up)).normalize();
  const fw = new THREE.Vector3().crossVectors(out, up).normalize();
  if (fw.dot(F.face.fwd) < 0) fw.negate();

  const pos = [], nor = [], col = [];
  const grid = [];
  for (let i = 0; i <= I; i++) {
    const s = i / I;
    // outline: convex-sided triangle, from the superformula family
    const wid = w * Math.pow(1 - s, 0.78) * (0.80 + 0.20 * Math.sin(PI * Math.pow(s, 0.62)));
    const dd = dep * Math.pow(1 - s, 0.55);
    const tt = th * (1 - s * 0.85);
    // the ear leans forward and curls slightly outward as it rises
    const lean = fw.clone().multiplyScalar(dep * 0.10 * s * s)
      .addScaledVector(out, ear.width * 0.10 * s * s);
    const row = [];
    for (let j = 0; j < J; j++) {
      const ph = (j / J) * TAU;
      const xi = Math.cos(ph), sn = Math.sin(ph);
      const lat = wid * xi;
      const dp = dd * (1 - xi * xi) + (tt * 0.5) * sn;
      const q = ear.root.clone()
        .addScaledVector(up, s * h)
        .addScaledVector(out, lat)
        .addScaledVector(fw, -dp)
        .add(lean);
      row.push(q);
    }
    grid.push(row);
  }
  // normals + colours
  const nrm = grid.map(r => r.map(() => new THREE.Vector3()));
  for (let i = 0; i <= I; i++) for (let j = 0; j < J; j++) {
    const a = grid[Math.min(I, i + 1)][j], b = grid[Math.max(0, i - 1)][j];
    const c = grid[i][(j + 1) % J], d = grid[i][(j + J - 1) % J];
    nrm[i][j].crossVectors(a.clone().sub(b), c.clone().sub(d)).normalize();
    if (nrm[i][j].lengthSq() < 0.5) nrm[i][j].copy(up);
  }
  const colAt = (i, j) => {
    const s = i / I, ph = (j / J) * TAU, sn = Math.sin(ph), xi = Math.cos(ph);
    const front = smoothstep(0.12, -0.12, sn);          // 1 = inside of the ear
    const rim = smoothstep(0.55, 0.95, Math.abs(xi));
    // back: black over the top two-thirds, rust at the base
    let c = mixC(PALETTE.rust, PALETTE.ink, smoothstep(0.05, 0.45, s));
    // inside: pale skin, with a heavy white fringe along the rim
    const inner = mixC(PALETTE.pink, PALETTE.cream, 0.45 + 0.35 * Math.sin(s * PI));
    const white = mixC(inner, PALETTE.snow, rim * 0.85);
    c = mixC(c, white, front);
    const m = mandelbrot(-0.743 + 0.02 * xi, 0.1318 + 0.02 * s, 48);
    return [s2l(clamp(c[0] * (0.88 + 0.24 * m))), s2l(clamp(c[1] * (0.88 + 0.24 * m))), s2l(clamp(c[2] * (0.88 + 0.24 * m)))];
  };

  const idx = [];
  for (let i = 0; i <= I; i++) for (let j = 0; j < J; j++) {
    const q = grid[i][j], n = nrm[i][j], c = colAt(i, j);
    pos.push(q.x, q.y, q.z); nor.push(n.x, n.y, n.z); col.push(c[0], c[1], c[2]);
  }
  for (let i = 0; i < I; i++) for (let j = 0; j < J; j++) {
    const j2 = (j + 1) % J;
    const a = i * J + j, b = i * J + j2, c = (i + 1) * J + j, d = (i + 1) * J + j2;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  return { geometry: g, grid, frame: { up, out, fw } };
}

// ---------------------------------------------------------------------------
// EYE — an amber sphere with a vertical slit pupil, set behind an almond
// aperture cut with a Lame superellipse.
// ---------------------------------------------------------------------------
export function buildEye(centre, gaze, side, r, F) {
  const fw = gaze.clone().normalize();
  const rt = new THREE.Vector3(0, 1, 0).cross(fw).normalize().multiplyScalar(-1);
  const up = new THREE.Vector3().crossVectors(fw, rt).normalize().negate();

  const I = 40, J = 56;
  const pos = [], nor = [], col = [], idx = [];
  for (let i = 0; i <= I; i++) {
    const th = (i / I) * PI;
    for (let j = 0; j <= J; j++) {
      const ph = (j / J) * TAU;
      const x = Math.sin(th) * Math.cos(ph), y = Math.cos(th), z = Math.sin(th) * Math.sin(ph);
      const q = centre.clone().addScaledVector(rt, x * r).addScaledVector(up, y * r).addScaledVector(fw, z * r);
      pos.push(q.x, q.y, q.z); nor.push(x, y, z);
      // front of the eye is where z -> 1
      const facing = z;
      const rr = Math.hypot(x, y);
      const irisR = 0.72;
      const iris = smoothstep(irisR + 0.10, irisR - 0.06, rr) * smoothstep(-0.1, 0.25, facing);
      // vertical slit pupil: a very tall, very narrow superellipse
      const slit = slitField(x, y);
      const stri = julia(x * 2.4, y * 2.4, -0.79, 0.15, 22);
      let c = mixC(PALETTE.ink, [0.86, 0.60, 0.16], iris);
      c = mixC(c, [1.0, 0.78, 0.28], iris * stri * 0.7);
      c = mixC(c, [0.10, 0.07, 0.05], iris * smoothstep(0.55, 0.72, rr));
      c = mixC(c, [0.02, 0.015, 0.012], slit * iris);
      col.push(s2l(clamp(c[0])), s2l(clamp(c[1])), s2l(clamp(c[2])));
    }
  }
  for (let i = 0; i < I; i++) for (let j = 0; j < J; j++) {
    const a = i * (J + 1) + j, b = a + 1, c = a + (J + 1), d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  return g;
}
function slitField(x, y) {
  const a = 0.13, b = 0.66, n = 2.6;
  const f = Math.pow(Math.pow(Math.abs(x) / a, n) + Math.pow(Math.abs(y) / b, n), 1 / n);
  return smoothstep(1.15, 0.85, f);
}

// ---------------------------------------------------------------------------
// The eyelid: an almond aperture. Everything outside it is fur-coloured skin
// wrapped on a slightly larger sphere, so the eyeball is only visible through
// the almond.
// ---------------------------------------------------------------------------
export function buildLid(centre, gaze, side, r, slant) {
  const fw = gaze.clone().normalize();
  const rt = new THREE.Vector3(0, 1, 0).cross(fw).normalize().multiplyScalar(-1);
  const up = new THREE.Vector3().crossVectors(fw, rt).normalize().negate();
  const J = 96, K = 10;
  const pos = [], nor = [], col = [], idx = [];
  const R = r * 1.02;
  const P = new THREE.Vector3();
  for (let k = 0; k <= K; k++) {
    const t = k / K;
    for (let j = 0; j <= J; j++) {
      const ph = (j / J) * TAU;
      // the aperture is a Lame superellipse, tilted towards the nose by the
      // golden angle over eight — the slant that makes a canid eye read as one
      const ap = superellipse(ph - slant, 0.86, 0.34, 2.3);
      const sinT = Math.min(0.9995, mix(ap, Math.min(1, ap + 0.70), Math.pow(t, 0.85)));
      const cosT = Math.sqrt(Math.max(0, 1 - sinT * sinT));
      const rad = R * mix(1.0, 1.16, t);
      P.copy(fw).multiplyScalar(cosT)
        .addScaledVector(rt, sinT * Math.cos(ph))
        .addScaledVector(up, sinT * Math.sin(ph));
      const q = centre.clone().addScaledVector(P, rad);
      pos.push(q.x, q.y, q.z);
      nor.push(P.x, P.y, P.z);
      const rim = smoothstep(0.22, 0.0, t);
      const wet = smoothstep(0.10, 0.0, t);
      let c = mixC(PALETTE.rust, PALETTE.ink, clamp(rim * 1.2));
      c = mixC(c, PALETTE.ember, smoothstep(0.20, 0.85, t) * 0.8);
      c = mixC(c, [0.03, 0.02, 0.02], wet);
      col.push(s2l(clamp(c[0])), s2l(clamp(c[1])), s2l(clamp(c[2])));
    }
  }
  for (let k = 0; k < K; k++) for (let j = 0; j < J; j++) {
    const a = k * (J + 1) + j, b = a + 1, c = a + (J + 1), d = c + 1;
    idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  return g;
}

// ---------------------------------------------------------------------------
// VIBRISSAE — each whisker is an arc of a logarithmic spiral r = a e^(b theta),
// with the golden growth constant. They fan by the golden angle.
// ---------------------------------------------------------------------------
export function buildWhiskers(F) {
  const H = F.face.H, { fwd, up, right } = F.face;
  const occ = F.spine.occiput;
  const h = (a, b, c) => occ.clone().addScaledVector(fwd, a * H).addScaledVector(up, b * H).addScaledVector(right, c * H);
  const pos = [], col = [], idx = [];
  const SEG = 7;
  let vo = 0;

  const add = (root, dir0, len, curl, thick, shade) => {
    // integrate a logarithmic-spiral arc in the plane (dir0, bend)
    const bend = new THREE.Vector3(0, -1, 0).addScaledVector(dir0, -dir0.y).normalize();
    const pts = [], rads = [];
    let d = dir0.clone().normalize(), q = root.clone();
    for (let i = 0; i <= SEG; i++) {
      const t = i / SEG;
      pts.push(q.clone());
      rads.push(thick * Math.pow(1 - t, 0.85));
      const th = curl * (0.35 + 1.25 * t) / SEG;
      d.addScaledVector(bend, Math.tan(th)).normalize();
      q = q.clone().addScaledVector(d, len / SEG);
    }
    for (let i = 0; i <= SEG; i++) {
      const t = i / SEG;
      const n0 = new THREE.Vector3(0, 0, 1), n1 = new THREE.Vector3();
      const dd = (i < SEG ? pts[i + 1].clone().sub(pts[i]) : pts[i].clone().sub(pts[i - 1])).normalize();
      n1.crossVectors(dd, n0).normalize(); if (n1.lengthSq() < 0.5) n1.set(1, 0, 0);
      const n2 = new THREE.Vector3().crossVectors(dd, n1).normalize();
      for (let a = 0; a < 3; a++) {
        const an = a * TAU / 3;
        const o = n1.clone().multiplyScalar(Math.cos(an)).addScaledVector(n2, Math.sin(an));
        const v = pts[i].clone().addScaledVector(o, rads[i]);
        pos.push(v.x, v.y, v.z);
        const g = s2l(clamp(shade * (1 - 0.35 * t)));
        col.push(g, g * 0.98, g * 0.94);
      }
    }
    for (let i = 0; i < SEG; i++) for (let a = 0; a < 3; a++) {
      const a2 = (a + 1) % 3, r0 = vo + i * 3, r1 = vo + (i + 1) * 3;
      idx.push(r0 + a, r1 + a, r0 + a2, r0 + a2, r1 + a, r1 + a2);
    }
    vo += (SEG + 1) * 3;
  };

  for (const s of [-1, 1]) {
    // mystacial pad: 5 rows x 3, fanned by the golden angle
    for (let row = 0; row < 4; row++) for (let k = 0; k < 3; k++) {
      const i = row * 3 + k;
      const a = 0.70 + 0.055 * k;
      const b = -0.02 - 0.055 * row;
      const root = h(a, b, s * (0.085 + 0.012 * row));
      const spread = (k - 1) * 0.30 + Math.sin(i * GOLDEN_ANGLE) * 0.18;
      const dir = right.clone().multiplyScalar(s * (0.86 + 0.16 * k))
        .addScaledVector(fwd, 0.16 + 0.10 * k)
        .addScaledVector(up, 0.20 + spread * 0.45).normalize();
      const len = H * (0.34 + 0.13 * Math.abs(Math.sin(i * GOLDEN_ANGLE)) + 0.05 * k);
      add(root, dir, len, 0.34 + 0.12 * row, 0.00026, 0.62 - 0.24 * (row / 3));
    }
    // superciliary tuft above the eye
    for (let k = 0; k < 3; k++) {
      const root = h(0.40 + 0.03 * k, 0.16, s * 0.155);
      const dir = up.clone().multiplyScalar(0.75).addScaledVector(right, s * 0.45).addScaledVector(fwd, 0.35).normalize();
      add(root, dir, H * 0.26, 0.24, 0.00022, 0.42);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function mixC(a, b, t) { return [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)]; }

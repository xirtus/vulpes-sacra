// loft.js — appendages too thin for a volume lattice to hold: ears, and
// anything else shaped like a cup. At every height the cross-section is a lens
// whose thickness vanishes at the rim, so the edge is genuinely sharp and the
// tip closes to a point.

import * as THREE from 'three';
import { PI, TAU, mandelbrot, clamp, mix, smoothstep, s2l } from './sacred.js';

const hex = h => {
  if (typeof h !== 'string') return h;
  const v = parseInt(h.replace('#', ''), 16);
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
};
const mixC = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];

export function loftShell(a, palette) {
  const I = 34, J = 30;
  const W = a.scale ?? 1;
  const h = a.height * W, w = a.width * W * 0.5, dep = a.depth * W, th = a.thick * W;
  const taper = a.taper ?? 0.72;

  const up = a.dir.clone().normalize();
  const out = a.out.clone();
  out.addScaledVector(up, -out.dot(up)).normalize();
  const fw = new THREE.Vector3().crossVectors(out, up).normalize();
  if (a.face && fw.dot(a.face) < 0) fw.negate();

  const C = k => hex(palette[k] ?? k);
  const back = C(a.colours.back), backRoot = C(a.colours.backRoot ?? a.colours.back);
  const inner = C(a.colours.inner), rim = C(a.colours.rim ?? a.colours.inner);

  const grid = [];
  for (let i = 0; i <= I; i++) {
    const s = i / I;
    const wid = w * Math.pow(1 - s, taper) * (0.80 + 0.20 * Math.sin(PI * Math.pow(s, 0.62)));
    const dd = dep * Math.pow(1 - s, 0.55);
    const tt = th * (1 - s * 0.85);
    const lean = fw.clone().multiplyScalar(dep * 0.10 * s * s)
      .addScaledVector(out, a.width * W * 0.05 * s * s);
    const row = [];
    for (let j = 0; j < J; j++) {
      const ph = (j / J) * TAU, xi = Math.cos(ph), sn = Math.sin(ph);
      const dp = dd * (1 - xi * xi) + (tt * 0.5) * sn;
      row.push(a.root.clone().addScaledVector(up, s * h)
        .addScaledVector(out, wid * xi).addScaledVector(fw, -dp).add(lean));
    }
    grid.push(row);
  }

  const nrm = grid.map(r => r.map(() => new THREE.Vector3()));
  for (let i = 0; i <= I; i++) for (let j = 0; j < J; j++) {
    const A = grid[Math.min(I, i + 1)][j], B = grid[Math.max(0, i - 1)][j];
    const Cc = grid[i][(j + 1) % J], Dd = grid[i][(j + J - 1) % J];
    nrm[i][j].crossVectors(A.clone().sub(B), Cc.clone().sub(Dd)).normalize();
    if (nrm[i][j].lengthSq() < 0.5) nrm[i][j].copy(up);
  }

  const pos = [], nor = [], col = [], idx = [];
  for (let i = 0; i <= I; i++) for (let j = 0; j < J; j++) {
    const q = grid[i][j], n = nrm[i][j];
    const s = i / I, ph = (j / J) * TAU, sn = Math.sin(ph), xi = Math.cos(ph);
    const front = smoothstep(0.12, -0.12, sn);
    const edge = smoothstep(0.55, 0.95, Math.abs(xi));
    let c = mixC(backRoot, back, smoothstep(0.05, 0.45, s));
    c = mixC(c, mixC(inner, rim, edge * 0.85), front);
    const m = mandelbrot(-0.743 + 0.02 * xi, 0.1318 + 0.02 * s, 48);
    const k = 0.88 + 0.24 * m;
    pos.push(q.x, q.y, q.z); nor.push(n.x, n.y, n.z);
    col.push(s2l(clamp(c[0] * k)), s2l(clamp(c[1] * k)), s2l(clamp(c[2] * k)));
  }
  for (let i = 0; i < I; i++) for (let j = 0; j < J; j++) {
    const j2 = (j + 1) % J;
    idx.push(i * J + j, (i + 1) * J + j, i * J + j2, i * J + j2, (i + 1) * J + j, (i + 1) * J + j2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);

  // a shading function for fur grown on this shell
  const shade = makeShellCoat(a, { back, backRoot, inner, rim }, up, fw, h);
  return { geometry: g, shade, frame: { up, out, fw } };
}

function makeShellCoat(a, C, up, fw, h) {
  const root = a.root;
  const furLen = a.fur?.len ?? [0.25, 0.9];   // [back, inside], as fractions of thickness
  const th = a.thick * (a.scale ?? 1);
  const o = { r: 0, g: 0, b: 0, tr: 0, tg: 0, tb: 0, len: 0, stiff: 0.7 };
  return (x, y, z, nx, ny, nz) => {
    const dx = x - root.x, dy = y - root.y, dz = z - root.z;
    const s = clamp((dx * up.x + dy * up.y + dz * up.z) / h);
    const inside = smoothstep(0.5, 0.9, clamp((nx * fw.x + ny * fw.y + nz * fw.z) * 0.5 + 0.5));
    const m = mandelbrot(-0.743 + 0.03 * s, 0.1318 + 0.03 * inside, 48);
    const base = mixC(C.backRoot, C.back, smoothstep(0.05, 0.5, s));
    const c = mixC(base, C.rim, inside);
    const k = 0.9 + 0.2 * m;
    o.r = s2l(clamp(c[0] * k)); o.g = s2l(clamp(c[1] * k)); o.b = s2l(clamp(c[2] * k));
    const tip = mixC(c, C.rim, inside * 0.5);
    o.tr = s2l(clamp(tip[0] * k)); o.tg = s2l(clamp(tip[1] * k)); o.tb = s2l(clamp(tip[2] * k));
    o.len = mix(furLen[0], furLen[1], inside) * th * (1 - 0.55 * s) * (0.85 + 0.3 * m);
    return o;
  };
}

// pelt.js — real fur, one strand at a time.
//
// Strands are placed on the skin with the R2 low-discrepancy sequence — the
// two-dimensional cousin of the golden ratio — so they land the way seeds land
// on a sunflower head: evenly, never on a grid, never in a clump. No random()
// is called anywhere; re-running the generator grows the identical animal.

import * as THREE from 'three';
import { golden1, golden2, PI, TAU, clamp, mix, smoothstep } from './sacred.js';

const UP = new THREE.Vector3(0, 1, 0);
const TMP = new THREE.Vector3();

export function buildPelt(mesh, shade, morph, flow = {}, opts = {}) {
  const count = opts.count ?? 120000;
  const width = (opts.width ?? 0.0014) * morph.W;
  const RINGS = 4;
  const P = mesh.position, N = mesh.normal, nTri = mesh.tris;
  const lay = makeFlow(morph, flow);

  // area × density cumulative distribution — long fur gets proportionally
  // more strands, so a brush or a mane comes out dense without being asked
  const cdf = new Float64Array(nTri);
  let total = 0;
  const ref = (flow.reference ?? 0.030) * morph.W;
  for (let t = 0; t < nTri; t++) {
    const i = t * 9;
    const ax = P[i], ay = P[i + 1], az = P[i + 2];
    const ux = P[i + 3] - ax, uy = P[i + 4] - ay, uz = P[i + 5] - az;
    const vx = P[i + 6] - ax, vy = P[i + 7] - ay, vz = P[i + 8] - az;
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const area = 0.5 * Math.hypot(nx, ny, nz);
    const s = shade((ax + P[i + 3] + P[i + 6]) / 3, (ay + P[i + 4] + P[i + 7]) / 3,
                    (az + P[i + 5] + P[i + 8]) / 3, N[i], N[i + 1], N[i + 2]);
    total += area * clamp(s.len / ref, 0.5, 2.8);
    cdf[t] = total;
  }

  const vpS = (RINGS - 1) * 3 + 1, tpS = (RINGS - 2) * 6 + 3;
  const pos = new Float32Array(count * vpS * 3);
  const nor = new Float32Array(count * vpS * 3);
  const col = new Uint8Array(count * vpS * 3);
  const idx = new Uint32Array(count * tpS * 3);

  const g2 = [0, 0];
  const nrm = new THREE.Vector3(), tan = new THREE.Vector3(), dir = new THREE.Vector3();
  const u = new THREE.Vector3(), v = new THREE.Vector3(), tmp = new THREE.Vector3();
  const cur = new THREE.Vector3(), step = new THREE.Vector3();
  let vo = 0, io = 0;

  for (let s = 0; s < count; s++) {
    const target = golden1(s) * total;
    let lo = 0, hi = nTri - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (cdf[m] < target) lo = m + 1; else hi = m; }
    const i = lo * 9;

    golden2(s, g2);
    let b1 = g2[0], b2 = g2[1];
    if (b1 + b2 > 1) { b1 = 1 - b1; b2 = 1 - b2; }
    const b0 = 1 - b1 - b2;
    const x = P[i] * b0 + P[i + 3] * b1 + P[i + 6] * b2;
    const y = P[i + 1] * b0 + P[i + 4] * b1 + P[i + 7] * b2;
    const z = P[i + 2] * b0 + P[i + 5] * b1 + P[i + 8] * b2;
    nrm.set(N[i] * b0 + N[i + 3] * b1 + N[i + 6] * b2,
            N[i + 1] * b0 + N[i + 4] * b1 + N[i + 7] * b2,
            N[i + 2] * b0 + N[i + 5] * b1 + N[i + 8] * b2).normalize();

    const sh = shade(x, y, z, nrm.x, nrm.y, nrm.z);
    const len = sh.len;

    lay(tan, x, y, z);
    tan.addScaledVector(nrm, -tan.dot(nrm));
    if (tan.lengthSq() < 1e-9) tan.set(0, -1, 0); else tan.normalize();
    const droop = clamp(len / (0.10 * morph.W)) * (1 - 0.5 * sh.stiff);

    const dRoot = dir.copy(nrm).multiplyScalar(0.70).addScaledVector(tan, 0.52).normalize().clone();
    const dTip = tmp.copy(nrm).multiplyScalar(0.06).addScaledVector(tan, 0.94)
      .addScaledVector(UP, -0.62 * droop).normalize().clone();

    u.set(dRoot.y, -dRoot.x, 0);
    if (u.lengthSq() < 1e-8) u.set(1, 0, 0);
    u.normalize();
    v.crossVectors(dRoot, u).normalize();

    cur.set(x, y, z);
    const r0 = width * (0.75 + 0.55 * sh.stiff);
    const vBase = vo / 3;
    for (let k = 0; k < RINGS; k++) {
      const tt = k / (RINGS - 1);
      const rad = k === RINGS - 1 ? 0 : r0 * Math.pow(1 - tt, 0.75);
      const R = Math.round(clamp(mix(sh.r, sh.tr, tt * tt)) * 255);
      const G = Math.round(clamp(mix(sh.g, sh.tg, tt * tt)) * 255);
      const B = Math.round(clamp(mix(sh.b, sh.tb, tt * tt)) * 255);
      if (k === RINGS - 1) {
        pos[vo] = cur.x; pos[vo + 1] = cur.y; pos[vo + 2] = cur.z;
        nor[vo] = dTip.x; nor[vo + 1] = dTip.y; nor[vo + 2] = dTip.z;
        col[vo] = R; col[vo + 1] = G; col[vo + 2] = B; vo += 3;
      } else {
        for (let a = 0; a < 3; a++) {
          const ang = a * (TAU / 3), ca = Math.cos(ang), sa = Math.sin(ang);
          const ox = u.x * ca + v.x * sa, oy = u.y * ca + v.y * sa, oz = u.z * ca + v.z * sa;
          pos[vo] = cur.x + ox * rad; pos[vo + 1] = cur.y + oy * rad; pos[vo + 2] = cur.z + oz * rad;
          nor[vo] = ox; nor[vo + 1] = oy; nor[vo + 2] = oz;
          col[vo] = R; col[vo + 1] = G; col[vo + 2] = B; vo += 3;
        }
        const tt2 = (k + 0.5) / (RINGS - 1);
        step.copy(dRoot).lerp(dTip, tt2 * tt2).normalize().multiplyScalar(len / (RINGS - 1));
        cur.add(step);
      }
    }
    for (let k = 0; k < RINGS - 2; k++) {
      const a0 = vBase + k * 3, a1 = vBase + (k + 1) * 3;
      for (let q = 0; q < 3; q++) {
        const q2 = (q + 1) % 3;
        idx[io++] = a0 + q; idx[io++] = a1 + q; idx[io++] = a0 + q2;
        idx[io++] = a0 + q2; idx[io++] = a1 + q; idx[io++] = a1 + q2;
      }
    }
    const aL = vBase + (RINGS - 2) * 3, tip = vBase + (RINGS - 1) * 3;
    for (let q = 0; q < 3; q++) { idx[io++] = aL + q; idx[io++] = tip; idx[io++] = aL + (q + 1) % 3; }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3, true));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeBoundingSphere();
  return { geometry: geo, strands: count };
}

// The lay of the coat: which way the fur is combed at any point.
function makeFlow(morph, flow) {
  const W = morph.W;
  const base = flow.base ?? [-1, -0.10, 0];
  const radialMark = flow.radial ? morph.marks[flow.radial] : null;
  const radialR = (flow.radialR ?? 0.75) * W;
  const downY = (flow.down ?? 0.62) * W;
  const curves = (flow.curves ?? []).map(n => morph.curves[n]).filter(Boolean);

  return (out, x, y, z) => {
    out.set(base[0], base[1], base[2]);
    if (radialMark) {
      const dx = x - radialMark.x, dy = y - radialMark.y, dz = z - radialMark.z;
      const d = Math.hypot(dx, dy, dz);
      const w = smoothstep(radialR, radialR * 0.32, d);
      if (w > 0 && d > 1e-6) out.lerp(TMP.set(dx / d, dy / d, dz / d), w);
    }
    const lw = smoothstep(downY * 1.35, downY * 0.7, y);
    if (lw > 0) out.lerp(TMP.set(-0.25, -1, 0).normalize(), lw * 0.85);
    for (const pts of curves) {
      let bi = 0, bd = 1e9;
      for (let i = 0; i < pts.length; i++) {
        const d = (x - pts[i].x) ** 2 + (y - pts[i].y) ** 2 + (z - pts[i].z) ** 2;
        if (d < bd) { bd = d; bi = i; }
      }
      const w = smoothstep((0.30 * W) ** 2, (0.13 * W) ** 2, bd);
      if (w > 0) {
        const a = pts[Math.max(0, bi - 1)], b = pts[Math.min(pts.length - 1, bi + 1)];
        TMP.set(b.x - a.x, b.y - a.y, b.z - a.z).normalize();
        out.lerp(TMP, w * 0.9);
      }
    }
    return out.normalize();
  };
}

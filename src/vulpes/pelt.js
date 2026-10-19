// pelt.js — real fur, one strand at a time.
//
// Strands are placed on the skin with the R2 low-discrepancy sequence — the
// two-dimensional cousin of the golden ratio — so they land the way seeds land
// on a sunflower head: evenly, but never on a grid and never in a clump.
// No random() is called. Re-running the generator gives the identical animal.

import * as THREE from 'three';
import { golden1, golden2, frac, R2_A, R2_B, PHI, PI, GOLDEN_ANGLE, clamp, mix, smoothstep } from './sacred.js';

export function buildPelt(mesh, coat, F, opts = {}) {
  const count = opts.count ?? 110000;
  const width = opts.width ?? 0.00058;     // hair thickness at the root, metres
  const RINGS = 4;                          // 3 tapered segments + a point

  const P = mesh.position, N = mesh.normal;
  const nTri = mesh.tris;

  // ---- area * density cumulative distribution ----------------------------
  const cdf = new Float64Array(nTri);
  let total = 0;
  const c = [0, 0, 0], n = [0, 0, 0];
  const density = new Float32Array(nTri);
  for (let t = 0; t < nTri; t++) {
    const i = t * 9;
    const ax = P[i], ay = P[i + 1], az = P[i + 2];
    const bx = P[i + 3], by = P[i + 4], bz = P[i + 5];
    const cx = P[i + 6], cy = P[i + 7], cz = P[i + 8];
    const ux = bx - ax, uy = by - ay, uz = bz - az;
    const vx = cx - ax, vy = cy - ay, vz = cz - az;
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const area = 0.5 * Math.hypot(nx, ny, nz);
    const s = coat((ax + bx + cx) / 3, (ay + by + cy) / 3, (az + bz + cz) / 3,
                   N[i], N[i + 1], N[i + 2]);
    const d = clamp(s.len / 0.014, 0.55, 2.6);
    density[t] = d;
    total += area * d;
    cdf[t] = total;
  }

  // ---- geometry buffers ---------------------------------------------------
  const vpS = (RINGS - 1) * 3 + 1;                 // verts per strand
  const tpS = (RINGS - 2) * 6 + 3;                 // tris per strand
  const pos = new Float32Array(count * vpS * 3);
  const nor = new Float32Array(count * vpS * 3);
  const col = new Uint8Array(count * vpS * 3);
  const idx = (count * vpS > 65535 ? new Uint32Array(count * tpS * 3) : new Uint16Array(count * tpS * 3));

  const g2 = [0, 0];
  const dir = new THREE.Vector3(), nrm = new THREE.Vector3(), tan = new THREE.Vector3();
  const u = new THREE.Vector3(), v = new THREE.Vector3(), tmp = new THREE.Vector3();
  const cur = new THREE.Vector3(), step = new THREE.Vector3();
  const W = F.W, occ = F.spine.occiput, fwd = F.face.fwd;
  const tp = F.tail.pts;

  let vo = 0, io = 0, made = 0;
  for (let s = 0; s < count; s++) {
    // --- pick a triangle: golden sequence through the cumulative area ------
    const target = golden1(s) * total;
    let lo = 0, hi = nTri - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (cdf[m] < target) lo = m + 1; else hi = m; }
    const t = lo, i = t * 9;

    // --- barycentric from the R2 sequence ---------------------------------
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

    const sh = coat(x, y, z, nrm.x, nrm.y, nrm.z);
    const len = sh.len;

    // --- the lay of the coat ----------------------------------------------
    // Fur combs backwards along the body and radially back from the nose;
    // on the brush it runs out along the tail; everywhere it then falls.
    flowAt(tan, x, y, z, F);
    tan.addScaledVector(nrm, -tan.dot(nrm)).normalize();          // project to the skin
    const droop = clamp(len / 0.030) * (1 - 0.55 * sh.stiff);

    const dRoot = dir.copy(nrm).multiplyScalar(0.70).addScaledVector(tan, 0.52).normalize().clone();
    const dTip = tmp.copy(nrm).multiplyScalar(0.06)
      .addScaledVector(tan, 0.94)
      .addScaledVector(UP, -0.62 * droop).normalize().clone();

    // stable cross-section basis
    u.set(dRoot.y, -dRoot.x, 0);
    if (u.lengthSq() < 1e-8) u.set(1, 0, 0);
    u.normalize();
    v.crossVectors(dRoot, u).normalize();

    // --- extrude ------------------------------------------------------------
    cur.set(x, y, z);
    const r0 = width * (0.75 + 0.55 * sh.stiff);
    const vBase = vo / 3;
    for (let k = 0; k < RINGS; k++) {
      const tt = k / (RINGS - 1);
      const rad = k === RINGS - 1 ? 0 : r0 * Math.pow(1 - tt, 0.75);
      const cr = mix(sh.r, sh.tr, tt * tt), cg = mix(sh.g, sh.tg, tt * tt), cb = mix(sh.b, sh.tb, tt * tt);
      const R = Math.round(clamp(cr) * 255), G = Math.round(clamp(cg) * 255), B = Math.round(clamp(cb) * 255);
      if (k === RINGS - 1) {
        pos[vo] = cur.x; pos[vo + 1] = cur.y; pos[vo + 2] = cur.z;
        nor[vo] = dTip.x; nor[vo + 1] = dTip.y; nor[vo + 2] = dTip.z;
        col[vo] = R; col[vo + 1] = G; col[vo + 2] = B;
        vo += 3;
      } else {
        for (let a = 0; a < 3; a++) {
          const ang = a * (2 * PI / 3);
          const ca = Math.cos(ang), sa = Math.sin(ang);
          const ox = u.x * ca + v.x * sa, oy = u.y * ca + v.y * sa, oz = u.z * ca + v.z * sa;
          pos[vo] = cur.x + ox * rad; pos[vo + 1] = cur.y + oy * rad; pos[vo + 2] = cur.z + oz * rad;
          nor[vo] = ox; nor[vo + 1] = oy; nor[vo + 2] = oz;
          col[vo] = R; col[vo + 1] = G; col[vo + 2] = B;
          vo += 3;
        }
      }
      if (k < RINGS - 1) {
        // advance along a direction that rotates from root to tip
        const tt2 = (k + 0.5) / (RINGS - 1);
        step.copy(dRoot).lerp(dTip, tt2 * tt2).normalize().multiplyScalar(len / (RINGS - 1));
        cur.add(step);
      }
    }
    // faces
    for (let k = 0; k < RINGS - 2; k++) {
      const a0 = vBase + k * 3, a1 = vBase + (k + 1) * 3;
      for (let q = 0; q < 3; q++) {
        const q2 = (q + 1) % 3;
        idx[io++] = a0 + q; idx[io++] = a1 + q; idx[io++] = a0 + q2;
        idx[io++] = a0 + q2; idx[io++] = a1 + q; idx[io++] = a1 + q2;
      }
    }
    const aL = vBase + (RINGS - 2) * 3, tipV = vBase + (RINGS - 1) * 3;
    for (let q = 0; q < 3; q++) { idx[io++] = aL + q; idx[io++] = tipV; idx[io++] = aL + (q + 1) % 3; }
    made++;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3, true));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeBoundingSphere();
  return { geometry: geo, strands: made };
}

const UP = new THREE.Vector3(0, 1, 0);

// The direction the coat lies in, at any point on the animal.
function flowAt(out, x, y, z, F) {
  const occ = F.spine.occiput, fwd = F.face.fwd, W = F.W;
  // default: straight back along the body
  out.set(-1, -0.10, 0);
  // head: fur radiates backwards away from the nose
  const nx = x - F.spine.nose.x, ny = y - F.spine.nose.y, nz = z - F.spine.nose.z;
  const hd = Math.hypot(nx, ny, nz);
  const headW = smoothstep(0.30, 0.10, hd);
  if (headW > 0) out.lerp(TMP.set(nx / hd, ny / hd, nz / hd), headW);
  // limbs: fur runs down the leg
  const legW = smoothstep(0.55 * W, 0.30 * W, y);
  if (legW > 0) out.lerp(TMP.set(-0.25, -1, 0).normalize(), legW * 0.85);
  // brush: fur runs out along the tail and fans
  const tp = F.tail.pts;
  let best = 1e9, bi = 0;
  for (let i = 0; i < tp.length; i++) {
    const d = (x - tp[i].x) ** 2 + (y - tp[i].y) ** 2 + (z - tp[i].z) ** 2;
    if (d < best) { best = d; bi = i; }
  }
  const tailW = smoothstep(0.11 * 0.11, 0.05 * 0.05, best);
  if (tailW > 0) {
    const a = tp[Math.max(0, bi - 1)], b = tp[Math.min(tp.length - 1, bi + 1)];
    TMP.set(b.x - a.x, b.y - a.y, b.z - a.z).normalize();
    out.lerp(TMP, tailW * 0.9);
  }
  return out.normalize();
}
const TMP = new THREE.Vector3();

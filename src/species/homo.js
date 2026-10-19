// homo.js — Homo sapiens, a man.
//
// The first biped, and the animal the golden canon was written about. The
// navel divides the standing height in the golden ratio, so the cascade is
// the classical one:
//
//   navel  H/φ                  the golden section of the whole figure
//   hip    H/2  =  (φ⁻¹+φ⁻²)·H/2   (φ⁻¹ + φ⁻² = 1 exactly)
//   torso  H/φ³
//   arm    H/φ²                 two arms + shoulders ≈ the height
//   head   H/φ⁴
//   neck   H/φ⁵
//   hand   H/φ⁵
//   ankle  H/φ⁶
//
// The trunk runs along the standing height with the belly forward — the rig's
// trunk orientation — and everything else is the same vocabulary as the fox.

import { PHI, PI, p, GOLDEN_ANGLE, fib } from '../rig/sacred.js';
import * as m from '../rig/mask.js';

const PALETTE = {
  skin:     '#b97e63',
  skinLit:  '#d19a7d',
  skinDeep: '#8e5a44',
  shadow:   '#6f4a38',
  hair:     '#2e2118',
  hairLit:  '#4a362a',
  brow:     '#241a14',
  nail:     '#c9a793'
};

export default {
  id: 'homo',
  title: 'Homo Sacer',
  binomial: 'Homo sapiens',
  blurb: 'A man, measured the way the canon always measured him: the navel at H/φ, the head H/φ⁴, the arm H/φ². The first biped — the trunk runs along the standing height, with the belly forward.',
  palette: PALETTE,
  lattice: 0.0075,
  pelt: { count: 130000, width: 0.00050 },
  finish: { roughness: 0.55, sheen: 0.22, sheenColor: 0xffd9c8, envMapIntensity: 0.50 },

  anchor: { key: 'height', label: 'standing height', value: 1.75, min: 1.40, max: 2.00, step: 0.01 },
  params: [
    { key: 'lean', label: 'build', value: 1.00, min: 0.88, max: 1.15, step: 0.01 },
    { key: 'coat', label: 'hair', value: 0.55, min: 0, max: 1, step: 0.01 }
  ],

  derive: (W) => {
    const navel = W * p(-1);
    const hip = W * (p(-1) + p(-2)) / 2;      // = W/2, written as φ⁻¹+φ⁻²
    const torso = W * p(-3);
    const arm = W * p(-2);
    const head = W * p(-4);
    const neck = W * p(-5);
    const hand = W * p(-5);
    const ankle = W * p(-6);
    const knee = W * (p(-2) + p(-3)) / 2;     // the thigh is the golden section of the leg
    return { navel, hip, torso, arm, head, neck, hand, ankle, knee, table: [
      ['navel', 'H/φ', navel],
      ['hip joint', 'H/2', hip],
      ['knee', 'H(φ⁻²+φ⁻³)/2', knee],
      ['torso', 'H/φ³', torso],
      ['arm', 'H/φ²', arm],
      ['head', 'H/φ⁴', head],
      ['neck', 'H/φ⁵', neck],
      ['hand', 'H/φ⁵', hand],
      ['ankle', 'H/φ⁶', ankle]
    ] };
  },

  body(M, D, W, g) {
    // ---- the torso, upright: stations are heights, extents are front/back --
    M.trunk([
      [ 0.500,  0.078, -0.032, 0.100, 2.7],   // hip
      [ 0.580,  0.082, -0.036, 0.086, 2.6],   // waist — the narrowest point
      [ 0.655,  0.096, -0.050, 0.096, 2.8],   // chest
      [ 0.736,  0.092, -0.055, 0.112, 2.8]    // shoulders
    ], 0.016, 8, { axis: 'y' });

    // ---- the neck, rising and leaning forward into the head -------------
    M.chain([
      M.st(0.062, 0.762, 0.030, 0.034, 2.5),
      M.st(0.085, 0.805, 0.027, 0.031, 2.4),
      M.st(0.100, 0.848, 0.026, 0.029, 2.3)
    ], 0.014, 6);

    // ---- the head: a frame from the nape to the nose --------------------
    const nape = M.at('nape', 0.100, 0.850);
    const nose = M.at('nose', 0.238, 0.858);
    const F = M.frame('head', nape, nose);
    const hu = F.len / W;
    const h = (a, b, c) => F.at(a, b, c);
    M.at('crown', 0.108, 0.900);              // the hair radiates from here

    // the cranium rides half a head-height above the nape
    M.blob(h(0.24, 0.46, 0), 0.36 * hu, 0.44 * hu, 0.34 * hu, 0.016);
    // the face hangs forward of it
    M.blob(h(0.64, 0.10, 0), 0.30 * hu, 0.30 * hu, 0.28 * hu, 0.014);
    // the jaw
    M.chain([
      M.stAt(h(0.38, -0.16, 0), 0.28 * hu, 0.22 * hu, 2.6),
      M.stAt(h(0.60, -0.20, 0), 0.24 * hu, 0.18 * hu, 2.5),
      M.stAt(h(0.78, -0.16, 0), 0.18 * hu, 0.14 * hu, 2.4)
    ], 0.012, 5);
    for (const s of [-1, 1]) M.blob(h(0.50, 0.14, s * 0.22), 0.15 * hu, 0.07 * hu, 0.07 * hu, 0.010);  // brow
    M.blob(h(0.86, 0.04, 0), 0.09 * hu, 0.085 * hu, 0.07 * hu, 0.008);   // nose
    M.blob(h(0.20, -0.42, 0), 0.22 * hu, 0.18 * hu, 0.17 * hu, 0.014);   // throat

    // ---- the legs -------------------------------------------------------
    for (const side of [-1, 1]) {
      M.limb(side, [
        ['hip',    0.005, 0.500, 0.052],
        ['knee',  -0.012, 0.309, 0.050],
        ['ankle', -0.005, 0.056, 0.050],
        ['toe',    0.075, 0.012, 0.048]
      ], [
        { from: 'hip',   to: 'knee',  r1a: 0.038, r2a: 0.045, r1b: 0.026, r2b: 0.030, k: 0.032 },
        { from: 'knee',  to: 'ankle', r1a: 0.028, r2a: 0.032, r1b: 0.018, r2b: 0.021, k: 0.022 },
        { from: 'ankle', to: 'toe',   r1a: 0.016, r2a: 0.018, r1b: 0.013, r2b: 0.014, k: 0.012 }
      ], {
        mass: [{ at: 'hip', off: [0.0, -0.005, 0.006], rx: 0.052, ry: 0.060, rz: 0.046, k: 0.055 }]
      });
      M.blob(M.p(0.070, 0.015, side * 0.048), 0.078, 0.017, 0.030, 0.016);   // the foot

      // ---- the arms -----------------------------------------------------
      M.limb(side, [
        ['shoulder', 0.060, 0.718, 0.120],
        ['elbow',    0.030, 0.482, 0.134],   // flares out from the body
        ['wrist',    0.055, 0.336, 0.126]
      ], [
        { from: 'shoulder', to: 'elbow', r1a: 0.026, r2a: 0.032, r1b: 0.019, r2b: 0.023, k: 0.024 },
        { from: 'elbow',    to: 'wrist', r1a: 0.018, r2a: 0.022, r1b: 0.013, r2b: 0.016, k: 0.016 }
      ], {
        mass: [{ at: 'shoulder', off: [0.0, 0.010, 0.006], rx: 0.038, ry: 0.038, rz: 0.022, k: 0.040 }]
      });
      M.blob(M.p(0.072, 0.272, side * 0.124), 0.032, 0.055, 0.022, 0.014);   // the hand
    }
  },

  // ---- the ears: small shells, set back at the sides of the skull --------
  appendages(M, D, W, g) {
    const F = M.frames.head;
    return [-1, 1].map(s => {
      const root = F.at(-0.03, 0.12, s * 0.30);
      const dir = F.up.clone()
        .addScaledVector(F.right, s * 0.18)
        .addScaledVector(F.fwd, -0.12).normalize();
      return {
        root, dir, out: F.right.clone().multiplyScalar(s), face: F.fwd,
        height: 0.034, width: 0.020, depth: 0.008, thick: 0.006, taper: 0.60,
        colours: { back: 'skinDeep', backRoot: 'skin', inner: 'skinLit', rim: 'skinDeep' },
        fur: { len: [0.4, 0.3] }
      };
    });
  },

  // Body hair lies down; the scalp radiates from the crown.
  flow: { base: [0, -1, 0], radial: 'crown', radialR: 0.14, down: 0.85,
          curves: [], reference: 0.012 },

  coat(M, D, W, g) {
    const onLimb = m.onLimb(0.085, 0.028);
    const scalp = m.all(m.inFrame('head', { a: [-0.12, 0.62], b: [0.02, 1.40] }, 0.10));
    const brow = m.inFrame('head', { a: [0.42, 0.62], b: [0.12, 0.34], c: [0.12, 0.34] }, 0.05);
    const faceFront = m.inFrame('head', { a: [0.52, 1.30], b: [-0.60, 0.95] }, 0.08);

    return {
      palette: PALETTE,
      band: { amount: 0.06, tip: 0.10 },       // human hair is barely banded
      layers: [
        { colour: 'skin' },
        { colour: 'skinLit', mask: m.scale(m.dorsal(0.45, 0.95), 0.40) },   // the sun on the back
        { colour: 'shadow', mask: m.scale(m.all(onLimb, m.facing([0, -1, 0], 0.10, 0.75)), 0.30) },
        { colour: 'skinDeep', mask: m.scale(m.all(m.ventral(0.05, -0.04), m.not(onLimb)), 0.20) },
        // the hair of the head, and the brows
        { colour: 'hair', tip: 'hairLit', mask: scalp },
        { colour: 'brow', tip: 'brow', mask: brow }
      ],
      fur: [
        { len: 0.0035 },                                     // the vellus
        { len: 0.0018, mask: onLimb },
        { len: 0.075 + 0.060 * g.coat, mask: scalp },        // the hair itself
        { len: 0.005, mask: brow }
      ],
      bare: [faceFront]                                     // the face carries no vellus
    };
  },

  views: [
    { dir: [1.10, 0.10, 1.35] },
    { dir: [0.10, 0.05, 1.60] },                                     // profile
    { dir: [1.00, 0.18, 0.80], look: [0.14, 1.32, 0], zoom: 0.16, fov: 26 },  // head
    { dir: [-1.10, 0.10, 1.30] },
    { dir: [1.50, 0.04, 0.35], fov: 26 }                              // from below
  ]
};

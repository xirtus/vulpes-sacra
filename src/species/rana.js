// rana.js — a common frog.
//
// The smallest anchor in the collection, and the one animal here with no neck
// at all: head and body are a single wedge. The test it puts to the rig is the
// hind limb, which folds through three joints into a Z tighter than any
// mammal's, and the wet finish — a frog is the first thing here that is not
// matte.

import { PHI, PI, p, GOLDEN_ANGLE, fib } from '../rig/sacred.js';
import * as m from '../rig/mask.js';

const PALETTE = {
  moss:    '#5c6b32',
  mossLit: '#83914a',
  olive:   '#3f4a23',
  blotch:  '#2a3018',
  flank:   '#7a6c3a',
  belly:   '#d6d2ae',
  bellyDp: '#a8a683',
  bronze:  '#8a6a30',
  ink:     '#0d0f08',
  gold:    '#c39a2a'
};

export default {
  id: 'rana',
  title: 'Rana Sacra',
  binomial: 'Rana temporaria',
  blurb: 'A frog at nine centimetres, snout to vent. No neck, a hind limb that folds through three joints into a Z, and the first wet skin the rig has had to render.',
  palette: PALETTE,
  lattice: 0.0085,
  pelt: { count: 0 },
  finish: { roughness: 0.30, clearcoat: 0.52, clearcoatRoughness: 0.14, sheen: 0, envMapIntensity: 0.55 },

  anchor: { key: 'svl', label: 'snout–vent length', value: 0.090, min: 0.045, max: 0.140, step: 0.002 },
  params: [
    { key: 'lean', label: 'girth', value: 1.00, min: 0.86, max: 1.16, step: 0.01 },
    { key: 'wet', label: 'blotching', value: 0.55, min: 0, max: 1, step: 0.01 }
  ],

  derive: (W) => {
    const B = W * p(-1);            // head width across the tympanum
    const Hd = W * p(-1) * 0.62;    // head length
    const Lh = W * PHI;             // hind limb, unfolded
    const Lf = W * p(-1);           // forelimb
    const Ey = W * p(-4);           // eye
    return { B, Hd, Lh, Lf, Ey, table: [
      ['head width', 'S/φ', B],
      ['head length', 'S/φ·φ⁻¹', Hd],
      ['hind limb', 'Sφ', Lh],
      ['forelimb', 'S/φ', Lf],
      ['eye', 'S/φ⁴', Ey],
      ['toe splay', '2π/φ²', (GOLDEN_ANGLE * 180 / PI).toFixed(3) + '°']
    ] };
  },

  body(M, D, W, g) {
    // Head and body are one wedge: widest across the eyes, tapering to the
    // vent. There is no station anywhere along it where a neck could go.
    M.trunk([
      [ 0.500, 0.290, 0.060, 0.150, 2.6],   // snout
      [ 0.395, 0.360, 0.048, 0.235, 2.8],   // across the nostrils
      [ 0.250, 0.430, 0.040, 0.330, 3.0],   // across the eyes — the widest point
      [ 0.080, 0.430, 0.036, 0.352, 3.1],   // shoulder
      [-0.110, 0.410, 0.038, 0.348, 3.1],   // belly
      [-0.280, 0.372, 0.046, 0.300, 3.0],   // sacral hump
      [-0.420, 0.320, 0.062, 0.208, 2.8],   // vent
      [-0.485, 0.250, 0.098, 0.116, 2.6]
    ], 0.006, 9);

    // ---- the head is the front of that wedge, so the frame goes on it ----
    const nape = M.at('nape', 0.190, 0.330);
    const snout = M.at('snout', 0.520, 0.190);
    const F = M.frame('head', nape, snout);
    const hu = F.len / W;
    const h = (a, b, c) => F.at(a, b, c);

    // the eyes: bulges in the skin, not spheres stuck on it
    for (const s of [-1, 1]) {
      M.blob(h(0.26, 0.25, s * 0.36), 0.30 * hu, 0.30 * hu, 0.30 * hu, 0.042);
      M.blob(h(0.04, -0.04, s * 0.54), 0.24 * hu, 0.20 * hu, 0.15 * hu, 0.030);   // tympanum
    }
    M.blob(h(0.70, -0.16, 0), 0.34 * hu, 0.20 * hu, 0.30 * hu, 0.018);            // upper jaw
    M.blob(h(0.44, -0.36, 0), 0.44 * hu, 0.20 * hu, 0.36 * hu, 0.022);            // throat

    // ---- limbs -----------------------------------------------------------
    // The forelimb props the animal up. The hind limb folds: femur back and
    // out, tibia forward and up, foot back along the ground.
    for (const side of [-1, 1]) {
      M.limb(side, [
        ['shoulder', 0.150, 0.300, 0.230],
        ['elbowF',   0.230, 0.150, 0.330],
        ['wristF',   0.290, 0.045, 0.290],
        ['handF',    0.375, 0.012, 0.300],
        ['hip',     -0.330, 0.330, 0.180],
        ['knee',    -0.130, 0.215, 0.420],   // forward and out
        ['ankle',   -0.420, 0.115, 0.415],   // back and down
        ['heel',    -0.180, 0.020, 0.395],   // forward again, on the ground
        ['toe',      0.010, 0.010, 0.400]
      ], [
        { from: 'shoulder', to: 'elbowF', r1a: 0.058, r2a: 0.062, r1b: 0.036, r2b: 0.040, k: 0.036 },
        { from: 'elbowF',   to: 'wristF', r1a: 0.034, r2a: 0.038, r1b: 0.026, r2b: 0.028, k: 0.022 },
        { from: 'wristF',   to: 'handF',  r1a: 0.026, r2a: 0.028, r1b: 0.030, r2b: 0.018, k: 0.014 },
        { from: 'hip',      to: 'knee',   r1a: 0.090, r2a: 0.106, r1b: 0.052, r2b: 0.058, k: 0.048 },
        { from: 'knee',     to: 'ankle',  r1a: 0.052, r2a: 0.058, r1b: 0.034, r2b: 0.038, k: 0.030 },
        { from: 'ankle',    to: 'heel',   r1a: 0.034, r2a: 0.038, r1b: 0.026, r2b: 0.028, k: 0.022 },
        { from: 'heel',     to: 'toe',    r1a: 0.026, r2a: 0.028, r1b: 0.022, r2b: 0.014, k: 0.016 }
      ], {
        mass: [{ at: 'hip', to: 'knee', t: 0.34, rx: 0.110, ry: 0.108, rz: 0.078, k: 0.055 }]
      });
      // splayed toes, fanned by the golden angle
      for (let i = 0; i < 4; i++) {
        const a = (i - 1.5) * (GOLDEN_ANGLE / 6);
        M.blob(M.p(0.005 + Math.cos(a) * 0.085, 0.013, side * (0.398 + Math.sin(a) * 0.075)),
          0.058, 0.013, 0.020, 0.016);
      }
    }
  },

  coat(M, D, W, g) {
    // on an animal this squat the limbs run close to the flank, so the
    // stocking radius has to be tighter than on a long-legged runner
    const onLimb = m.onLimb(0.062, 0.026);
    const eye = m.any(m.near('nape', 9, 9),
      m.all(m.inFrame('head', { a: [0.10, 0.52], b: [0.16, 0.70], c: [0.28, 0.62] }, 0.09)));
    const dorsal = m.dorsal(0.52, 0.92);
    // the blotches are the Mandelbrot field, thresholded — a frog's markings
    // are the one place a fractal is literally the right model
    const blotch = m.all(m.fractal(0.42 + 0.12 * (1 - g.wet), 0.62), dorsal);
    const bars = m.all(onLimb, m.lattice({ along: 13, edge: 0.20 }));

    return {
      palette: PALETTE,
      band: { amount: 0.08, tip: 0.14 },
      layers: [
        { colour: 'moss' },
        { colour: 'mossLit', mask: m.scale(dorsal, 0.55) },
        { colour: 'olive', mask: m.scale(m.dorsal(0.86, 1.02), 0.7) },
        { colour: 'blotch', mask: m.scale(blotch, 0.85) },
        { colour: 'blotch', mask: m.scale(bars, 0.55) },
        { colour: 'belly', mask: m.except(m.ventral(0.055, -0.030), onLimb) },
        { colour: 'bellyDp', mask: m.scale(m.all(m.ventral(0.010, -0.050), m.lattice({ along: 21, edge: 0.22 })), 0.28) },
        // the dark mask through the eye and over the tympanum — the field mark
        { colour: 'blotch',
          mask: m.all(m.inFrame('head', { a: [-0.05, 0.62], b: [-0.22, 0.28], c: [0.32, 0.78] }, 0.08)) },
        { colour: 'bronze', mask: m.scale(m.inFrame('head', { a: [-0.02, 0.20], c: [0.40, 0.72] }, 0.08), 0.55) },
        // the eye itself: a gold iris and a black horizontal pupil
        { colour: 'gold', mask: m.all(m.inFrame('head', { a: [0.14, 0.48], b: [0.20, 0.62], c: [0.30, 0.60] }, 0.06),
                                       m.facing([0.25, 0.55, 0.80], 0.1, 0.75)) },
        { colour: 'ink', mask: m.all(m.inFrame('head', { a: [0.22, 0.40], b: [0.28, 0.46], c: [0.36, 0.56] }, 0.035),
                                      m.facing([0.25, 0.45, 0.86], 0.3, 0.9)) }
      ],
      fur: [{ len: 0 }]
    };
  },

  views: [
    { dir: [1.20, 0.42, 1.35] },
    { dir: [0.14, 0.26, 1.60] },
    { dir: [1.05, 0.40, 0.70], look: [0.34, 0.70, 0], zoom: 0.38, fov: 26 },
    { dir: [-1.10, 0.50, 1.15] },
    { dir: [0.20, 1.50, 0.35], fov: 30 }
  ]
};

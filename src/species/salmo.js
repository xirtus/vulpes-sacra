// salmo.js — Salmo salar, the Atlantic salmon.
//
// Laterally compressed rather than round: the trunk table's half-width is now
// the smaller of the two radii at every station, which the superellipse
// handles without any change to the rig. Seven fins, all lofted shells, and
// scales as a lattice mask running the length of the fish.

import { PHI, PI, p, GOLDEN_ANGLE, fib } from '../rig/sacred.js';
import * as m from '../rig/mask.js';

const PALETTE = {
  steel:    '#6d7f8c',
  steelDp:  '#3c4a56',
  back:     '#2b3a45',
  silver:   '#c9d3d6',
  belly:    '#eef2f0',
  rose:     '#a86a63',
  spot:     '#242b30',
  fin:      '#54636e',
  finEdge:  '#26303a',
  ink:      '#0b0f12'
};

export default {
  id: 'salmo',
  title: 'Salmo Sacer',
  binomial: 'Salmo salar',
  blurb: 'A salmon: laterally compressed, seven fins, and a lattice of fib(13) scale rows down each flank. The spots are the Mandelbrot field, thresholded — which is the one place a fractal is literally the right model.',
  palette: PALETTE,
  lattice: 0.0080,
  pelt: { count: 0 },
  finish: { roughness: 0.16, clearcoat: 0.72, clearcoatRoughness: 0.08, sheen: 0, envMapIntensity: 1.15 },
  medium: 'water',

  anchor: { key: 'fork', label: 'fork length', value: 0.90, min: 0.40, max: 1.30, step: 0.01 },
  params: [
    { key: 'lean', label: 'condition', value: 1.00, min: 0.86, max: 1.16, step: 0.01 },
    { key: 'spawn', label: 'spawning colour', value: 0.30, min: 0, max: 1, step: 0.01 }
  ],

  derive: (W) => {
    const Hd = W * p(-2);        // head, snout to gill cover
    const Dp = W * p(-2);        // body depth
    const Cd = W * p(-3);        // caudal fin
    const Df = W * p(-3);        // dorsal fin base
    return { Hd, Dp, Cd, Df, table: [
      ['head', 'L/φ²', Hd],
      ['body depth', 'L/φ²', Dp],
      ['caudal fin', 'L/φ³', Cd],
      ['dorsal base', 'L/φ³', Df],
      ['scale rows', 'fib(13)', fib(13)],
      ['fin rays', 'fib(9)', fib(9)]
    ] };
  },

  body(M, D, W, g) {
    // Half-width is now the *narrow* axis. A salmon is a blade.
    M.trunk([
      [ 0.500, 0.520, 0.482, 0.016, 2.3],   // snout
      [ 0.442, 0.560, 0.448, 0.038, 2.6],
      [ 0.380, 0.585, 0.424, 0.052, 2.7],   // gill cover
      [ 0.270, 0.606, 0.402, 0.058, 2.7],   // shoulder — the deepest point
      [ 0.120, 0.608, 0.400, 0.056, 2.7],
      [-0.040, 0.594, 0.412, 0.050, 2.7],
      [-0.190, 0.572, 0.432, 0.040, 2.7],
      [-0.320, 0.548, 0.456, 0.028, 2.7],
      [-0.410, 0.532, 0.472, 0.018, 2.7],   // caudal peduncle
      [-0.460, 0.526, 0.478, 0.013, 2.6]
    ], 0.008, 9);

    const gill = M.at('gill', 0.375, 0.505);
    const snout = M.at('snout', 0.505, 0.500);
    const F = M.frame('head', gill, snout);

    // the jaw, the eye socket and the gill cover
    M.chain([
      M.stAt(F.at(0.10, -0.30, 0), 0.052, 0.036, 2.6),
      M.stAt(F.at(0.62, -0.24, 0), 0.032, 0.022, 2.5),
      M.stAt(F.at(0.98, -0.08, 0), 0.014, 0.011, 2.4)
    ], 0.008, 6);
    for (const s of [-1, 1]) {
      M.blob(F.at(0.34, 0.16, s * 0.34), 0.026, 0.024, 0.020, 0.008);   // eye
      M.blob(F.at(-0.10, -0.06, s * 0.42), 0.048, 0.048, 0.020, 0.012); // operculum
    }
    M.curve('lateral', [M.p(0.36, 0.512, 0), M.p(0.10, 0.505, 0), M.p(-0.20, 0.502, 0), M.p(-0.44, 0.502, 0)]);
  },

  // Seven fins, every one a lofted shell.
  appendages(M, D, W, g) {
    const blade = (root, dir, out, h, w, th, taper) => ({
      root, dir, out, face: M.p(0, 0, 1).normalize(),
      height: h, width: w, depth: th * 0.5, thick: th, taper,
      colours: { back: 'fin', backRoot: 'steelDp', inner: 'fin', rim: 'finEdge' }
    });
    const A = [];
    // dorsal and adipose, on the midline
    A.push(blade(M.p(0.055, 0.606, 0), M.p(-0.18, 1, 0).normalize(), M.p(1, 0.18, 0).normalize(),
      D.Df / W * 0.40, D.Df / W * 0.46, 0.006, 0.72));
    A.push(blade(M.p(-0.300, 0.556, 0), M.p(-0.10, 1, 0).normalize(), M.p(1, 0.10, 0).normalize(),
      D.Df / W * 0.13, D.Df / W * 0.15, 0.004, 0.70));
    // anal fin
    A.push(blade(M.p(-0.230, 0.418, 0), M.p(-0.22, -1, 0).normalize(), M.p(1, -0.22, 0).normalize(),
      D.Df / W * 0.30, D.Df / W * 0.34, 0.005, 0.72));
    // paired pectorals and pelvics
    for (const s of [-1, 1]) {
      A.push(blade(M.p(0.300, 0.440, s * 0.045), M.p(-0.34, -0.42, s * 0.84).normalize(),
        M.p(0.90, -0.20, s * 0.30).normalize(), D.Df / W * 0.42, D.Df / W * 0.22, 0.004, 0.66));
      A.push(blade(M.p(-0.010, 0.410, s * 0.030), M.p(-0.30, -0.60, s * 0.74).normalize(),
        M.p(0.90, -0.25, s * 0.28).normalize(), D.Df / W * 0.28, D.Df / W * 0.17, 0.0035, 0.66));
    }
    // the caudal, as two lobes leaving the peduncle at the golden angle
    for (const s of [-1, 1]) {
      const a = s * GOLDEN_ANGLE / 4;
      A.push(blade(M.p(-0.470, 0.502 + s * 0.006, 0),
        M.p(-Math.cos(a) * 0.9, Math.sin(a) * 2.4, 0).normalize(),
        M.p(0.2, s * 0.9, 0).normalize(),
        D.Cd / W * 0.62, D.Cd / W * 0.30, 0.006, 0.50));
    }
    return A;
  },

  coat(M, D, W, g) {
    const spawn = g.spawn;
    const scales = m.lattice({ along: fib(13), around: fib(9), edge: 0.22 });
    const spots = m.all(m.dorsal(0.40, 0.96), m.fractal(0.44, 0.58));
    const line = m.onCurve('lateral', 0.030, 0.010);

    return {
      palette: PALETTE,
      band: { amount: 0.03, tip: 0.05 },
      layers: [
        { colour: 'steel' },
        { colour: 'back', mask: m.dorsal(0.70, 1.02) },
        { colour: 'silver', mask: m.scale(m.dorsal(0.62, 0.18), 0.72) },
        { colour: 'belly', mask: m.ventral(0.045, -0.030) },
        // spawning fish go rose along the flank
        { colour: 'rose', mask: m.scale(m.dorsal(0.55, 0.22), 0.75 * spawn) },
        { colour: 'spot', mask: m.scale(spots, 0.80) },
        { colour: 'steelDp', mask: m.scale(scales, 0.13) },
        { colour: 'steelDp', mask: m.scale(line, 0.55) },
        { colour: 'ink', mask: m.all(m.inFrame('head', { a: [0.22, 0.46], b: [0.06, 0.28], c: [0.24, 0.46] }, 0.05)) },
        { colour: 'silver', mask: m.scale(m.inFrame('head', { a: [-0.30, 0.14], c: [0.20, 0.60] }, 0.10), 0.55) }
      ],
      fur: [{ len: 0 }]
    };
  },

  views: [
    { dir: [0.85, 0.28, 1.40] },
    { dir: [0.06, 0.14, 1.60] },
    { dir: [1.15, 0.24, 0.75], look: [0.34, 0.52, 0], zoom: 0.34, fov: 26 },
    { dir: [-1.20, 0.26, 1.05] },
    { dir: [0.20, 1.45, 0.28], fov: 30 }
  ]
};

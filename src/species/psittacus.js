// psittacus.js — Ara macao, the scarlet macaw.
//
// The first bird. The whole animal is the golden section of one number: total
// length L, of which the tail is L/φ and the body is L/φ². Flight feathers are
// lofted shells fanned by the golden angle; the body plumage is the pelt, run
// very short and very dense, which is close enough to contour feathers at any
// distance you would actually see a parrot from.

import { PHI, PI, p, GOLDEN_ANGLE, fib } from '../rig/sacred.js';
import * as m from '../rig/mask.js';

const PALETTE = {
  scarlet:  '#b8231b',
  scarletD: '#7d1410',
  scarletL: '#d9432b',
  gold:     '#c98a12',
  teal:     '#1c5a86',
  tealD:    '#123c5c',
  face:     '#efe6dc',
  faceLine: '#c9a998',
  billPale: '#d8cdb4',
  billDark: '#2a2320',
  foot:     '#4a453e',
  ink:      '#100c0a'
};

export default {
  id: 'psittacus',
  title: 'Ara Sacra',
  binomial: 'Ara macao',
  blurb: 'A macaw, and the whole bird is one golden section: of its total length L, the tail is L/φ and the body is L/φ². Flight feathers are lofted shells fanned by the golden angle.',
  palette: PALETTE,
  lattice: 0.0075,
  pelt: { count: 90000, width: 0.0020, shellCount: 0 },
  finish: { roughness: 0.62, sheen: 0.45, sheenColor: 0xffe3c0, envMapIntensity: 0.45 },

  anchor: { key: 'length', label: 'total length', value: 0.86, min: 0.55, max: 1.05, step: 0.01 },
  params: [
    { key: 'lean', label: 'girth', value: 1.00, min: 0.88, max: 1.12, step: 0.01 },
    { key: 'coat', label: 'plumage', value: 0.55, min: 0, max: 1, step: 0.01 }
  ],

  derive: (W) => {
    const T = W * p(-1);        // tail
    const B = W * p(-2);        // body, bill to vent
    const Hd = W * p(-4);       // head
    const Bl = W * p(-5) * PHI; // bill
    const Wg = W * p(-2) * 0.86;
    return { T, B, Hd, Bl, Wg, table: [
      ['tail', 'L/φ', T],
      ['body', 'L/φ²', B],
      ['head', 'L/φ⁴', Hd],
      ['bill', 'L/φ⁴', Bl],
      ['wing', 'L/φ²·0.86', Wg],
      ['feather fan', '2π/φ²', (GOLDEN_ANGLE * 180 / PI).toFixed(3) + '°']
    ] };
  },

  body(M, D, W, g) {
    // A parrot perches upright, so the "trunk" runs forward-and-up rather than
    // level, and the head sits almost on the shoulders.
    M.trunk([
      [ 0.235, 0.905, 0.812, 0.038, 2.4],   // nape
      [ 0.190, 0.930, 0.742, 0.062, 2.6],   // shoulder
      [ 0.120, 0.912, 0.680, 0.078, 2.7],   // breast — the widest point
      [ 0.030, 0.868, 0.652, 0.080, 2.7],
      [-0.070, 0.812, 0.660, 0.072, 2.7],
      [-0.160, 0.752, 0.688, 0.056, 2.7],   // vent
      [-0.215, 0.706, 0.712, 0.036, 2.6]    // the tail leaves here
    ], 0.010, 8);

    // ---- head, and the bill that makes it a parrot ----------------------
    const nape = M.at('nape', 0.238, 0.930);
    const cere = M.at('cere', 0.238 + D.Hd / W * 1.05, 0.930 - D.Hd / W * 0.16);
    const F = M.frame('head', nape, cere);
    const hu = F.len / W;
    const h = (a, b, c) => F.at(a, b, c);

    M.blob(h(0.24, 0.10, 0), 0.42 * hu, 0.40 * hu, 0.38 * hu, 0.016);   // crown
    for (const s of [-1, 1]) M.blob(h(0.46, 0.04, s * 0.26), 0.30 * hu, 0.28 * hu, 0.16 * hu, 0.014);

    // the upper mandible: deep at the base, hooked hard at the tip
    M.chain([
      M.stAt(h(0.66, -0.04, 0), 0.30 * hu, 0.40 * hu, 2.6),
      M.stAt(h(0.94, -0.24, 0), 0.22 * hu, 0.34 * hu, 2.5),
      M.stAt(h(1.06, -0.56, 0), 0.15 * hu, 0.22 * hu, 2.4),
      M.stAt(h(1.02, -0.84, 0), 0.08 * hu, 0.10 * hu, 2.3)   // the hook turns back under
    ], 0.010, 7);
    // the lower mandible
    M.chain([
      M.stAt(h(0.62, -0.42, 0), 0.24 * hu, 0.20 * hu, 2.5),
      M.stAt(h(0.88, -0.56, 0), 0.17 * hu, 0.15 * hu, 2.4),
      M.stAt(h(0.99, -0.70, 0), 0.10 * hu, 0.09 * hu, 2.3)
    ], 0.009, 6);

    // ---- legs: short, and set well back ---------------------------------
    for (const side of [-1, 1]) {
      M.limb(side, [
        ['hip',    -0.050, 0.700, 0.052],
        ['knee',   -0.020, 0.620, 0.062],
        ['ankle',  -0.070, 0.500, 0.058],
        ['foot',   -0.020, 0.400, 0.056]
      ], [
        { from: 'hip',   to: 'knee',  r1a: 0.050, r2a: 0.056, r1b: 0.032, r2b: 0.036, k: 0.030 },
        { from: 'knee',  to: 'ankle', r1a: 0.026, r2a: 0.030, r1b: 0.018, r2b: 0.020, k: 0.014 },
        { from: 'ankle', to: 'foot',  r1a: 0.018, r2a: 0.020, r1b: 0.017, r2b: 0.019, k: 0.010 }
      ]);
      // zygodactyl: two toes forward, two back, fanned by the golden angle
      for (let i = 0; i < 4; i++) {
        const a = (i < 2 ? 1 : -1) * (0.55 + (i % 2) * GOLDEN_ANGLE / 7);
        M.blob(M.p(-0.020 + Math.cos(a) * 0.055, 0.392, side * (0.056 + Math.sin(a) * 0.030)),
          0.038, 0.011, 0.013, 0.014);
      }
    }

    M.curve('tailAxis', [M.p(-0.200, 0.716, 0), M.p(-0.400, 0.660, 0), M.p(-0.640, 0.594, 0)]);
  },

  // Wings folded along the flank, and the long graduated tail — all shells.
  appendages(M, D, W, g) {
    const A = [];
    const feather = (root, dir, out, h, w, th, taper, colours) => ({
      root, dir, out, face: M.p(0, 1, 0).normalize(),
      height: h, width: w, depth: th * 0.6, thick: th, taper, colours
    });

    for (const s of [-1, 1]) {
      // the folded wing: one broad shell lying back along the body
      A.push(feather(M.p(0.170, 0.860, s * 0.070),
        M.p(-0.94, -0.24, s * 0.16).normalize(), M.p(0.10, 0.34, s * 0.94).normalize(),
        D.Wg / W * 0.92, D.Wg / W * 0.30, 0.012, 0.34,
        { back: 'teal', backRoot: 'scarlet', inner: 'gold', rim: 'tealD' }));
      // primaries, fanned by the golden angle off the folded wingtip
      for (let i = 0; i < 5; i++) {
        const t = i / 4;
        const a = (i - 2) * (GOLDEN_ANGLE / 22);
        A.push(feather(M.p(-0.090 - 0.020 * t, 0.790 - 0.014 * t, s * (0.058 + 0.006 * t)),
          M.p(-0.97, -0.20 + a * 1.4, s * (0.10 + a)).normalize(),
          M.p(0.06, 0.30, s * 0.95).normalize(),
          D.Wg / W * (0.58 - 0.06 * t), D.Wg / W * 0.085, 0.0045, 0.22,
          { back: 'tealD', backRoot: 'teal', inner: 'tealD', rim: 'ink' }));
      }
    }

    // the tail: fib(7) graduated feathers, the central pair longest
    const n = fib(7);
    for (let i = 0; i < n; i++) {
      const k = i - (n - 1) / 2;
      const a = k * (GOLDEN_ANGLE / 52);
      const grade = 1 - Math.abs(k) / ((n - 1) / 2 + 0.6) * 0.42;
      A.push(feather(M.p(-0.205, 0.712, k * 0.008),
        M.p(-0.94, -0.28 + a * 0.8, Math.sin(a) * 2.2).normalize(),
        M.p(0.10, 0.30, 0.94).normalize(),
        D.T / W * grade, D.T / W * 0.055, 0.0040, 0.20,
        { back: i % 2 ? 'teal' : 'scarlet', backRoot: 'scarlet', inner: 'scarletD', rim: 'tealD' }));
    }
    return A;
  },

  flow: { base: [-1, -0.16, 0], radial: 'cere', radialR: 0.14, down: 0.62,
          curves: ['tailAxis'], reference: 0.012 },

  coat(M, D, W, g) {
    const onLeg = m.onLimb(0.052, 0.020);
    return {
      palette: PALETTE,
      band: { amount: 0.10, tip: 0.18 },
      layers: [
        { colour: 'scarlet' },
        { colour: 'scarletL', mask: m.scale(m.dorsal(0.55, 0.95), 0.55) },
        { colour: 'scarletD', mask: m.scale(m.ventral(0.06, -0.04), 0.55) },
        // the gold and teal band across the folded wing
        { colour: 'gold', mask: m.all(m.station(-0.10, 0.12, 0.05), m.lateral(0.048, 0.075)) },
        { colour: 'teal', mask: m.all(m.station(-0.20, -0.05, 0.05), m.lateral(0.040, 0.070)) },
        // the bare white face, and the fine feather lines across it
        { colour: 'face', mask: m.inFrame('head', { a: [0.28, 0.86], b: [-0.50, 0.30], c: [0.10, 0.62] }, 0.10) },
        { colour: 'faceLine',
          mask: m.scale(m.all(m.inFrame('head', { a: [0.28, 0.86], c: [0.10, 0.62] }, 0.10),
                              m.lattice({ along: 90, edge: 0.30 })), 0.55) },
        // the bill: pale above, black below
        { colour: 'billPale', mask: m.inFrame('head', { a: [0.72, 1.40], b: [-0.60, 0.10] }, 0.06) },
        { colour: 'billDark', mask: m.inFrame('head', { a: [0.58, 1.40], b: [-1.20, -0.44] }, 0.07) },
        { colour: 'ink', mask: m.all(m.inFrame('head', { a: [0.36, 0.58], b: [0.00, 0.24], c: [0.16, 0.34] }, 0.05)) },
        { colour: 'foot', tip: 'foot', mask: onLeg }
      ],
      fur: [
        { len: 0.016 + 0.010 * g.coat },
        { len: 0.007, mask: m.inFrame('head', { a: [0.20, 1.40] }, 0.14) },
        { len: 0.000, mask: m.inFrame('head', { a: [0.62, 1.40] }, 0.06) },   // the bill is bare
        { len: 0.004, mask: onLeg },
        { len: 0.030 + 0.018 * g.coat, mask: m.all(m.station(-0.24, 0.06, 0.06), m.dorsal(0.30, 0.85)) }
      ]
    };
  },

  views: [
    { dir: [1.20, 0.30, 1.35] },
    { dir: [0.10, 0.18, 1.60] },
    { dir: [1.05, 0.36, 0.85], look: [0.22, 0.92, 0], zoom: 0.28, fov: 26 },
    { dir: [-1.25, 0.32, 1.10] },
    { dir: [1.60, 0.12, 0.30], fov: 26 }
  ]
};

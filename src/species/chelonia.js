// chelonia.js — a giant tortoise.
//
// The first species here with no hair at all, and the first whose defining
// feature is a single volume. The carapace is one flattened superellipsoid;
// the scutes on it are the Voronoi cells of a golden-angle phyllotaxis — the
// same packing the fur uses, at a hundredth the count.

import { PHI, PI, p, GOLDEN_ANGLE, fib } from '../rig/sacred.js';
import * as m from '../rig/mask.js';

const PALETTE = {
  shell:    '#5a4a33',
  shellLit: '#7c6543',
  sulcus:   '#241c12',   // the groove between scutes
  scute:    '#6d5838',
  skin:     '#4b463c',
  skinLit:  '#6a6355',
  wrinkle:  '#2a251d',
  horn:     '#7d7263',
  ink:      '#0f0c09'
};

export default {
  id: 'chelonia',
  title: 'Chelone Sacra',
  binomial: 'Chelonoidis niger',
  blurb: 'A giant tortoise: no hair, and one volume that carries the whole animal. Its scutes are the Voronoi cells of a golden-angle phyllotaxis — the sunflower packing, at a hundredth the count.',
  palette: PALETTE,
  lattice: 0.0090,
  pelt: { count: 0 },
  finish: { roughness: 0.80, clearcoat: 0.06, sheen: 0, envMapIntensity: 0.30 },
  medium: 'land',

  anchor: { key: 'carapace', label: 'carapace length', value: 1.20, min: 0.60, max: 1.50, step: 0.01 },
  params: [
    { key: 'lean', label: 'shell width', value: 1.00, min: 0.86, max: 1.14, step: 0.01 },
    { key: 'dome', label: 'doming', value: 0.62, min: 0, max: 1, step: 0.01 }
  ],

  derive: (W) => {
    const B = W * p(-1);        // shell width
    const Hg = W * p(-2);       // shell height above the plastron
    const N = W * p(-2);        // neck reach
    const S = W * p(-3);        // skull
    const Lg = W * p(-2);       // leg
    return { B, Hg, N, S, Lg, table: [
      ['shell width', 'L/φ', B],
      ['shell height', 'L/φ²', Hg],
      ['neck reach', 'L/φ²', N],
      ['skull', 'L/φ³', S],
      ['leg', 'L/φ²', Lg],
      ['scutes', 'fib(8)', fib(8) + ' cells'],
      ['packing', '2π/φ²', (GOLDEN_ANGLE * 180 / PI).toFixed(3) + '°']
    ] };
  },

  body(M, D, W, g) {
    const dome = 0.86 + 0.34 * g.dome;

    // The carapace: one flattened superellipsoid, sitting on a flat plastron.
    // The trunk table is what the coat reads its girth from, so the shell is
    // declared here rather than as a blob.
    M.trunk([
      [ 0.470, 0.286, 0.176, 0.086, 2.8],
      [ 0.400, 0.348, 0.140, 0.170, 3.0],
      [ 0.310, 0.430 * dome + 0.10, 0.110, 0.244, 3.2],
      [ 0.150, 0.500 * dome + 0.10, 0.092, 0.296, 3.4],
      [-0.040, 0.520 * dome + 0.10, 0.088, 0.310, 3.6],
      [-0.230, 0.494 * dome + 0.10, 0.092, 0.292, 3.4],
      [-0.380, 0.424 * dome + 0.10, 0.106, 0.242, 3.2],
      [-0.460, 0.348, 0.136, 0.168, 3.0],
      [-0.510, 0.288, 0.172, 0.084, 2.8]
    ], 0.030, 8);
    // the plastron — a flat floor under the shell
    M.blob(M.p(-0.020, 0.108, 0), 0.395, 0.046, 0.244, 0.040);

    // ---- neck and head: out of the front of the shell -------------------
    M.chain([
      M.st(0.395, 0.285, 0.078, 0.082, 2.4),
      M.st(0.520, 0.365, 0.056, 0.058, 2.3),
      M.st(0.640, 0.455, 0.044, 0.046, 2.3),
      M.st(0.730, 0.520, 0.040, 0.042, 2.3)
    ], 0.045, 6);

    const nape = M.at('nape', 0.740, 0.528);
    const snout = M.at('snout', 0.740 + D.S / W * 0.95, 0.528 + D.S / W * 0.10);
    const F = M.frame('head', nape, snout);
    const hu = F.len / W;
    const h = (a, b, c) => F.at(a, b, c);

    M.blob(h(0.18, 0.02, 0), 0.30 * hu, 0.25 * hu, 0.25 * hu, 0.030);   // cranium
    for (const s of [-1, 1]) {
      M.blob(h(0.34, 0.09, s * 0.17), 0.17 * hu, 0.15 * hu, 0.11 * hu, 0.024);  // eye turret
      M.blob(h(0.20, -0.13, s * 0.18), 0.22 * hu, 0.17 * hu, 0.12 * hu, 0.026); // jaw
    }
    M.chain([                                        // the beak
      M.stAt(h(0.42, -0.02, 0), 0.28 * hu, 0.26 * hu, 2.6),
      M.stAt(h(0.74, -0.06, 0), 0.20 * hu, 0.19 * hu, 2.4),
      M.stAt(h(0.98, -0.12, 0), 0.13 * hu, 0.12 * hu, 2.3)
    ], 0.020, 6);

    // ---- legs: four columns, elephantine, splayed -----------------------
    const lean = g.lean;
    const zf = 0.212 / lean, zh = 0.226 / lean;
    for (const side of [-1, 1]) {
      M.limb(side, [
        ['shoulder', 0.300, 0.230, zf * 0.70],
        ['elbow',    0.330, 0.150, zf * 0.92],
        ['wristF',   0.336, 0.062, zf * 1.00],
        ['footF',    0.348, 0.014, zf * 1.02],
        ['hip',     -0.320, 0.230, zh * 0.70],
        ['knee',    -0.348, 0.150, zh * 0.92],
        ['wristH',  -0.354, 0.062, zh * 1.00],
        ['footH',   -0.362, 0.014, zh * 1.02]
      ], [
        { from: 'shoulder', to: 'elbow',  r1a: 0.070, r2a: 0.078, r1b: 0.062, r2b: 0.068, k: 0.055 },
        { from: 'elbow',    to: 'wristF', r1a: 0.062, r2a: 0.068, r1b: 0.056, r2b: 0.058, k: 0.035 },
        { from: 'wristF',   to: 'footF',  r1a: 0.056, r2a: 0.058, r1b: 0.074, r2b: 0.052, k: 0.020 },
        { from: 'hip',      to: 'knee',   r1a: 0.074, r2a: 0.082, r1b: 0.064, r2b: 0.070, k: 0.055 },
        { from: 'knee',     to: 'wristH', r1a: 0.064, r2a: 0.070, r1b: 0.056, r2b: 0.058, k: 0.035 },
        { from: 'wristH',   to: 'footH',  r1a: 0.056, r2a: 0.058, r1b: 0.076, r2b: 0.052, k: 0.020 }
      ]);
    }

    // a short conical tail
    M.goldenCurve('tail', { from: M.p(-0.470, 0.190, 0), length: p(-3) * 1.4,
      turns: 0.20, launch: [-1, -0.30, 0], sway: 0, stations: fib(6) });
    M.sweep('tail', t => 0.040 * Math.pow(1 - t, 1.2) + 0.006, { k: 0.016, per: 3 });
  },

  coat(M, D, W, g) {
    // the shell is everything above the plastron line and inboard of the legs
    const onShell = m.all(m.dorsal(0.36, 0.62), m.not(m.onLimb(0.13, 0.055)));
    // a dome only ever presents about a third of a turn of girth, so the
    // Voronoi has to be told that or every cell comes out as a stripe
    const cells = m.scutes({ count: fib(8), edge: 0.30, spanU: [-0.50, 0.46], spanG: [0.62, 2.52] });
    const marginal = m.all(onShell, m.not(m.dorsal(0.42, 0.60)));   // the rim, not the dome
    const onLimb = m.onLimb(0.115, 0.048);
    const scaly = m.lattice({ along: 26, around: 14, edge: 0.30 });

    return {
      palette: PALETTE,
      band: { amount: 0.05, tip: 0.10 },
      layers: [
        { colour: 'skin' },
        { colour: 'skinLit', mask: m.scale(m.facing([0.3, 0.9, 0.2]), 0.5) },
        // the shell
        { colour: 'shell', mask: onShell },
        { colour: 'shellLit', mask: m.all(onShell, m.dorsal(0.80, 1.02)) },
        { colour: 'scute', mask: m.all(onShell, m.scale(cells, 0.35)) },
        // the sulci — the grooves between the scutes, and the marginal ring
        { colour: 'sulcus', mask: m.all(onShell, cells), amount: 0.92 },
        { colour: 'sulcus', mask: m.scale(m.all(marginal, m.lattice({ along: 13, edge: 0.22 })), 0.8) },
        // the hide: heavily wrinkled where it must fold
        { colour: 'wrinkle', mask: m.scale(m.all(onLimb, scaly), 0.55) },
        { colour: 'wrinkle', mask: m.scale(m.all(m.inFrame('head', { a: [-0.85, 0.28] }, 0.18), m.not(onShell), scaly), 0.45) },
        { colour: 'horn', mask: m.inFrame('head', { a: [0.58, 1.30] }, 0.10) },
        { colour: 'ink', mask: m.all(m.inFrame('head', { a: [0.26, 0.44], c: [0.13, 0.28] }, 0.05)) }
      ],
      fur: [{ len: 0 }]
    };
  },

  views: [
    { dir: [1.30, 0.42, 1.40] },
    { dir: [0.14, 0.26, 1.60] },
    { dir: [1.25, 0.34, 0.55], look: [0.55, 0.62, 0], zoom: 0.34, fov: 26 },
    { dir: [-1.20, 0.55, 1.10] },
    { dir: [0.30, 1.55, 0.30], fov: 30 }
  ]
};

// phoenicopterus.js — Phoenicopterus roseus, the greater flamingo.
//
// Anchored at the standing height, which is the only number anyone quotes
// about a flamingo, and from which the whole absurd animal falls out:
//
//   leg  = H/φ      the leg is the golden section of the bird
//   neck = H/φ²     and the neck is the golden section of the leg
//   body = H/φ²     the body is no bigger than the neck
//   head = H/φ⁵     and the head is almost nothing
//
// Standing on one leg, because that is the pose, and because a limb folded up
// under the belly is the hardest thing the limb verb has been asked for.

import { PHI, PI, p, GOLDEN_ANGLE, fib } from '../rig/sacred.js';
import * as m from '../rig/mask.js';

const PALETTE = {
  rose:     '#e0959c',
  roseLit:  '#f0b9bc',
  roseDeep: '#c46a76',
  scarlet:  '#c8434f',
  quill:    '#1a1416',
  ink:      '#0c0809',
  billPale: '#e7bfae',
  billDark: '#231a1a',
  leg:      '#d98d94',
  legDeep:  '#a95f6b',
  eye:      '#e8d288'
};

export default {
  id: 'phoenicopterus',
  title: 'Phoenicopterus Sacer',
  binomial: 'Phoenicopterus roseus',
  blurb: 'A flamingo, and the bird is nested golden sections: the leg is H/φ, the neck is H/φ², the body is no bigger than the neck, and the head is H/φ⁵. Standing on one leg, with the other folded under the belly.',
  palette: PALETTE,
  lattice: 0.0060,
  pelt: { count: 110000, width: 0.00090, shellCount: 0 },
  finish: { roughness: 0.60, sheen: 0.42, sheenColor: 0xffd9d2, envMapIntensity: 0.45 },

  anchor: { key: 'height', label: 'standing height', value: 1.30, min: 0.95, max: 1.55, step: 0.01 },
  params: [
    { key: 'lean', label: 'girth', value: 1.00, min: 0.88, max: 1.12, step: 0.01 },
    { key: 'coat', label: 'plumage', value: 0.55, min: 0, max: 1, step: 0.01 }
  ],

  derive: (W) => {
    const Lg = W * p(-1);        // leg, hip to ground
    const N = W * p(-2);         // neck
    const B = W * p(-2);         // body
    const Hd = W * p(-5);        // head
    const Bl = W * p(-5);        // bill
    const Wg = W * p(-3);        // wing chord
    return { Lg, N, B, Hd, Bl, Wg, table: [
      ['leg', 'H/φ', Lg],
      ['neck', 'H/φ²', N],
      ['body', 'H/φ²', B],
      ['wing chord', 'H/φ³', Wg],
      ['head', 'H/φ⁵', Hd],
      ['bill', 'H/φ⁵', Bl],
      ['neck sweep', '2π/φ²', (GOLDEN_ANGLE * 180 / PI).toFixed(3) + '°']
    ] };
  },

  body(M, D, W, g) {
    // The body: a small deep hull carried level, no longer than the neck.
    M.trunk([
      [ 0.118, 0.612, 0.548, 0.020, 2.4],   // point of the breast
      [ 0.090, 0.638, 0.516, 0.038, 2.7],
      [ 0.040, 0.648, 0.496, 0.052, 2.9],   // the deepest point, over the hips
      [-0.020, 0.644, 0.494, 0.054, 2.9],
      [-0.080, 0.628, 0.506, 0.048, 2.8],
      [-0.140, 0.606, 0.526, 0.036, 2.7],
      [-0.190, 0.586, 0.548, 0.020, 2.5]    // the tail leaves here
    ], 0.006, 8);

    // ---- the neck: a shallow S, rising almost vertically ----------------
    M.chain([
      M.st(0.096, 0.616, 0.032, 0.036, 2.6),
      M.st(0.064, 0.706, 0.023, 0.025, 2.4),
      M.st(0.062, 0.796, 0.019, 0.021, 2.3),
      M.st(0.092, 0.878, 0.018, 0.019, 2.3),
      M.st(0.132, 0.934, 0.018, 0.019, 2.3)
    ], 0.010, 8);
    M.curve('neck', [M.p(0.096, 0.616, 0), M.p(0.064, 0.706, 0),
                     M.p(0.062, 0.796, 0), M.p(0.092, 0.878, 0), M.p(0.132, 0.934, 0)]);

    // ---- head, and the bill that bends in the middle --------------------
    const nape = M.at('nape', 0.140, 0.946);
    const gape = M.at('gape', 0.140 + D.Hd / W * 0.95, 0.946 - D.Hd / W * 0.22);
    const F = M.frame('head', nape, gape);
    const hu = F.len / W;
    const h = (a, b, c) => F.at(a, b, c);

    M.blob(h(0.26, 0.10, 0), 0.44 * hu, 0.40 * hu, 0.38 * hu, 0.008);
    for (const s of [-1, 1]) M.blob(h(0.44, 0.14, s * 0.26), 0.24 * hu, 0.22 * hu, 0.16 * hu, 0.006);

    // The bill runs straight out of the head, then breaks downward at its
    // midpoint through most of a right angle. Nothing else has this.
    M.chain([
      M.stAt(h(0.62, -0.02, 0), 0.34 * hu, 0.38 * hu, 2.7),
      M.stAt(h(1.00, -0.14, 0), 0.30 * hu, 0.34 * hu, 2.6),   // the break
      M.stAt(h(1.28, -0.60, 0), 0.24 * hu, 0.28 * hu, 2.5),
      M.stAt(h(1.42, -1.10, 0), 0.15 * hu, 0.17 * hu, 2.4)
    ], 0.006, 8);
    M.at('billTip', 0.140 + F.fwd.x * 1.42 * hu, 0.946 + F.up.y * -1.10 * hu);

    // ---- the legs -------------------------------------------------------
    // The joint halfway down a flamingo's leg is the ankle, not the knee,
    // which is why it appears to bend backwards. The true knee is buried in
    // the body, and the long bone below it is the tibiotarsus.
    const standing = [
      ['hip',    -0.010, 0.552, 0.036],
      ['knee',    0.030, 0.516, 0.040],
      ['ankle',  -0.052, 0.262, 0.030],   // the "backward knee"
      ['toe',     0.016, 0.014, 0.030]
    ];
    // the other leg folds up flat against the belly
    const folded = [
      ['hipB',   -0.010, 0.552, 0.036],
      ['kneeB',   0.036, 0.520, 0.048],
      ['ankleB', -0.062, 0.470, 0.052],   // tucked up under the flank
      ['toeB',    0.052, 0.492, 0.050]
    ];
    const bones = a => [
      { from: a[0][0], to: a[1][0], r1a: 0.026, r2a: 0.030, r1b: 0.016, r2b: 0.019, k: 0.016 },
      { from: a[1][0], to: a[2][0], r1a: 0.0125, r2a: 0.0145, r1b: 0.0100, r2b: 0.0115, k: 0.007 },
      { from: a[2][0], to: a[3][0], r1a: 0.0100, r2a: 0.0115, r1b: 0.0085, r2b: 0.0100, k: 0.006 }
    ];
    M.limb(1, standing, bones(standing));
    M.limb(-1, folded, bones(folded));
    // webbed foot on the standing leg, toes fanned by the golden angle
    for (let i = 0; i < 3; i++) {
      const a = (i - 1) * (GOLDEN_ANGLE / 8);
      M.blob(M.p(0.016 + Math.cos(a) * 0.030, 0.010, 0.030 + Math.sin(a) * 0.030),
        0.022, 0.006, 0.008, 0.006);
    }

    M.curve('tailAxis', [M.p(-0.180, 0.590, 0), M.p(-0.250, 0.578, 0)]);
  },

  // Wings folded along the flank, with the black flight feathers showing at
  // the rear — on a standing flamingo that is all you ever see of them.
  appendages(M, D, W, g) {
    const A = [];
    const feather = (root, dir, out, h, w, th, taper, colours) => ({
      root, dir, out, face: M.p(0, 1, 0).normalize(),
      height: h, width: w, depth: th * 0.6, thick: th, taper, colours
    });
    for (const s of [-1, 1]) {
      A.push(feather(M.p(0.062, 0.612, s * 0.036),
        M.p(-0.96, -0.10, s * 0.26).normalize(), M.p(0.12, 0.30, s * 0.95).normalize(),
        D.Wg / W * 0.80, D.Wg / W * 0.34, 0.010, 0.36,
        { back: 'rose', backRoot: 'roseLit', inner: 'scarlet', rim: 'roseDeep' }));
      for (let i = 0; i < 4; i++) {
        const t = i / 3;
        const a = (i - 1.5) * (GOLDEN_ANGLE / 34);
        A.push(feather(M.p(-0.120 - 0.014 * t, 0.598 - 0.008 * t, s * (0.030 + 0.004 * t)),
          M.p(-0.98, -0.14 + a, s * (0.14 + a)).normalize(),
          M.p(0.08, 0.28, s * 0.95).normalize(),
          D.Wg / W * (0.52 - 0.05 * t), D.Wg / W * 0.085, 0.0040, 0.22,
          { back: 'quill', backRoot: 'quill', inner: 'quill', rim: 'ink' }));
      }
    }
    return A;
  },

  flow: { base: [-1, -0.12, 0], radial: 'gape', radialR: 0.10, down: 0.50,
          curves: ['neck', 'tailAxis'], reference: 0.010 },

  coat(M, D, W, g) {
    const onLeg = m.onLimb(0.024, 0.010);
    const onNeck = m.onCurve('neck', 0.055, 0.024);
    const bill = m.inFrame('head', { a: [0.52, 1.80] }, 0.06);
    const billOuter = m.inFrame('head', { a: [0.94, 1.80] }, 0.05);

    return {
      palette: PALETTE,
      band: { amount: 0.10, tip: 0.16 },
      layers: [
        { colour: 'rose' },
        { colour: 'roseLit', mask: m.scale(m.dorsal(0.50, 0.96), 0.55) },
        { colour: 'roseDeep', mask: m.scale(m.ventral(0.030, -0.030), 0.45) },
        // the scarlet coverts along the closed wing
        { colour: 'scarlet', mask: m.scale(m.all(m.station(-0.14, 0.06, 0.03),
                                                  m.lateral(0.034, 0.058)), 0.65) },
        // the neck pales towards the head
        { colour: 'roseLit', mask: m.scale(m.all(onNeck, m.height(0.66, 0.92)), 0.70) },
        // the bill: pale to the break, black beyond it
        { colour: 'billPale', mask: bill },
        { colour: 'billDark', tip: 'billDark', mask: billOuter },
        // a pale eye with a black pupil, set high and forward
        { colour: 'eye', mask: m.all(m.inFrame('head', { a: [0.30, 0.56], b: [0.02, 0.30], c: [0.16, 0.34] }, 0.04)) },
        { colour: 'ink', mask: m.all(m.inFrame('head', { a: [0.36, 0.50], b: [0.08, 0.24], c: [0.20, 0.30] }, 0.025)) },
        { colour: 'leg', tip: 'leg', mask: onLeg },
        { colour: 'legDeep', tip: 'legDeep', mask: m.all(onLeg, m.height(0.06, 0.02)) }
      ],
      fur: [
        { len: 0.012 + 0.008 * g.coat },
        { len: 0.026 + 0.016 * g.coat, mask: m.all(m.station(-0.16, 0.06, 0.04), m.dorsal(0.20, 0.80)) },
        { len: 0.006, mask: onNeck },
        { len: 0.004, mask: m.inFrame('head', { a: [-0.30, 0.55] }, 0.10) },
        { len: 0.000, mask: bill },
        { len: 0.000, mask: onLeg }
      ]
    };
  },

  views: [
    { dir: [1.15, 0.24, 1.30] },
    { dir: [0.10, 0.16, 1.60] },
    { dir: [1.05, 0.22, 0.85], look: [0.10, 0.94, 0], zoom: 0.20, fov: 26 },
    { dir: [-1.20, 0.26, 1.10] },
    { dir: [1.55, 0.10, 0.28], fov: 26 }
  ]
};

// mammut.js — Mammut americanum, the American mastodon.
//
// Anchored at the shoulder, like every other quadruped here. What makes it a
// mastodon rather than a very large horse is three things, and all three are
// in the cascade: the head is carried on almost no neck, the limbs are
// columns rather than levers, and the trunk and tusks are both arcs of the
// same golden spiral, run in opposite directions.

import { PHI, PI, p, GOLDEN_ANGLE, fib } from '../rig/sacred.js';
import * as m from '../rig/mask.js';

const PALETTE = {
  hide:    '#4a3527',
  hideLit: '#6b4c34',
  hideDeep:'#2e2118',
  guard:   '#7a5433',   // the sun-bleached tips of the long guard hair
  under:   '#8a6a45',
  ivory:   '#d8cdb2',
  ivoryOld:'#b09a73',
  ink:     '#120d0a',
  ochre:   '#9a7546'
};

export default {
  id: 'mammut',
  title: 'Mammut Sacrum',
  binomial: 'Mammut americanum',
  blurb: 'A mastodon on the same terms as the fox and the horse. The trunk and the tusks are arcs of one golden spiral, run in opposite directions; the coat is the longest the rig has grown.',
  palette: PALETTE,
  lattice: 0.0115,
  pelt: { count: 150000, width: 0.0011, shellCount: 6000 },

  anchor: { key: 'shoulder', label: 'shoulder height', value: 2.70, min: 2.00, max: 3.20, step: 0.02 },
  params: [
    { key: 'lean', label: 'leanness', value: 1.00, min: 0.90, max: 1.10, step: 0.01 },
    { key: 'coat', label: 'shag', value: 0.62, min: 0, max: 1, step: 0.01 }
  ],

  derive: (W) => {
    const L = W * PHI;          // head + body
    const H = W * p(-2);        // skull
    const R = W * p(-1);        // the trunk (proboscis)
    const K = W * p(-1) * PHI;  // tusk, along its arc
    const E = W * p(-4);        // ear — small, not an African elephant's
    return { L, H, R, K, E, table: [
      ['head + body', 'Wφ', L],
      ['skull', 'W/φ²', H],
      ['trunk', 'W/φ', R],
      ['tusk arc', 'W', K],
      ['ear', 'W/φ⁴', E],
      ['elbow', 'W/φ²·φ', W * p(-1)],
      ['trunk curl', '2π/φ²', (GOLDEN_ANGLE * 180 / PI).toFixed(3) + '°']
    ] };
  },

  body(M, D, W, g) {
    const H = D.H;

    // The barrel. A mastodon's back is long and low with a dip behind the
    // withers, and the belly hangs — nothing like the tucked flank of a runner.
    M.trunk([
      [ 0.560, 0.905, 0.585, 0.140, 2.7],   // point of shoulder
      [ 0.400, 0.985, 0.545, 0.190, 2.9],   // withers
      [ 0.190, 0.940, 0.512, 0.228, 3.1],   // deepest rib
      [ 0.000, 0.912, 0.502, 0.234, 3.1],   // mid barrel
      [-0.200, 0.905, 0.516, 0.226, 3.0],   // loin
      [-0.400, 0.925, 0.545, 0.216, 3.0],   // hip
      [-0.560, 0.912, 0.596, 0.194, 3.0],   // croup
      [-0.700, 0.848, 0.664, 0.138, 2.9],   // rump
      [-0.770, 0.792, 0.716, 0.072, 2.6]    // dock
    ]);

    // barely any neck at all — the skull sits on the shoulders
    M.chain([
      M.st(0.520, 0.850, 0.170, 0.215, 2.8),
      M.st(0.640, 0.930, 0.150, 0.190, 2.7),
      M.st(0.730, 0.990, 0.132, 0.166, 2.6)
    ], 0.070, 6);

    // ---- skull: high domed cranium, short heavy face --------------------
    const occ = M.at('poll', 0.760, 1.070);
    const brow = M.at('brow', 0.760 + H / W * 0.86, 1.070 - H / W * 0.30);
    const F = M.frame('head', occ, brow);
    const hu = F.len / W;
    const h = (a, b, c) => F.at(a, b, c);

    M.blob(h(0.16, 0.10, 0), 0.34 * hu, 0.36 * hu, 0.30 * hu, 0.055);   // domed cranium
    M.blob(h(0.52, -0.10, 0), 0.34 * hu, 0.30 * hu, 0.28 * hu, 0.055);  // face
    for (const s of [-1, 1]) {
      M.blob(h(0.34, -0.16, s * 0.24), 0.28 * hu, 0.26 * hu, 0.14 * hu, 0.050);  // temporal
      M.blob(h(0.72, -0.34, s * 0.16), 0.20 * hu, 0.22 * hu, 0.13 * hu, 0.045);  // tusk socket
    }
    M.blob(h(0.78, -0.30, 0), 0.26 * hu, 0.24 * hu, 0.22 * hu, 0.050);  // the trunk base

    // ---- the proboscis: an arc of the golden spiral, hanging and curling --
    M.goldenCurve('trunk', {
      from: h(0.88, -0.42, 0), length: D.R / W * 1.30, turns: 0.52,
      launch: [0.62, -1, 0], sway: p(-9), stations: fib(8)
    });
    M.sweep('trunk', t => 0.086 * Math.pow(1 - t, 0.78) + 0.014, { k: 0.030, per: 4, n: 2.4 });

    // ---- the tusks: the same spiral, run outward and up ------------------
    for (const s of [-1, 1]) {
      M.goldenCurve('tusk' + s, {
        from: h(0.86, -0.62, s * 0.19), length: D.K / W, turns: 0.42,
        launch: [1, -0.10, s * 0.20], sway: 0, stations: fib(7)
      });
      // a narrow weld: on a thin taper a wide one bulges at every station
      M.sweep('tusk' + s, t => 0.048 * Math.pow(1 - t, 0.85) + 0.004, { k: 0.004, per: 6, n: 2.0 });
    }

    // ---- limbs: columns. The elbow and the stifle sit high and tight, and
    // the foot is a pad, not a hoof --------------------------------------
    const lean = g.lean;
    const zf = 0.150 / lean, zh = 0.168 / lean;
    for (const side of [-1, 1]) {
      M.limb(side, [
        ['scapula',  0.440, 0.900, zf * 0.86],
        ['shoulder', 0.470, 0.700, zf * 0.98],
        ['elbow',    0.410, 0.560, zf * 1.00],
        ['wrist',    0.398, 0.190, zf * 0.94],
        ['footF',    0.398, 0.020, zf * 0.94],
        ['hip',     -0.400, 0.820, zh * 0.90],
        ['stifle',  -0.360, 0.600, zh * 1.00],
        ['hock',    -0.400, 0.280, zh * 0.90],
        ['footH',   -0.400, 0.020, zh * 0.88]
      ], [
        { from: 'scapula',  to: 'shoulder', r1a: 0.086, r2a: 0.150, r1b: 0.106, r2b: 0.150, k: 0.090 },
        { from: 'shoulder', to: 'elbow',    r1a: 0.106, r2a: 0.150, r1b: 0.092, r2b: 0.122, k: 0.080 },
        { from: 'elbow',    to: 'wrist',    r1a: 0.086, r2a: 0.112, r1b: 0.070, r2b: 0.082, k: 0.055 },
        { from: 'wrist',    to: 'footF',    r1a: 0.072, r2a: 0.084, r1b: 0.092, r2b: 0.096, k: 0.030 },
        { from: 'hip',      to: 'stifle',   r1a: 0.116, r2a: 0.168, r1b: 0.094, r2b: 0.126, k: 0.090 },
        { from: 'stifle',   to: 'hock',     r1a: 0.090, r2a: 0.118, r1b: 0.070, r2b: 0.084, k: 0.060 },
        { from: 'hock',     to: 'footH',    r1a: 0.070, r2a: 0.082, r1b: 0.090, r2b: 0.094, k: 0.030 }
      ], {
        mass: [{ at: 'hip', off: [-0.030, -0.040, 0.010], rx: 0.180, ry: 0.190, rz: 0.120, k: 0.100 }]
      });
    }

    // ---- a short tail with a tuft ---------------------------------------
    M.goldenCurve('tail', { from: M.p(-0.780, 0.760, 0), length: p(-2) * 1.5,
      turns: 0.22, launch: [-0.55, -1, 0], sway: p(-8), stations: fib(7) });
    M.sweep('tail', t => 0.038 * Math.pow(1 - t, 1.1) + 0.008, { k: 0.020, per: 3 });
  },

  appendages(M, D, W, g) {
    const F = M.frames.head;
    return [-1, 1].map(s => {
      const root = F.at(0.18, -0.14, s * 0.30);
      const dir = F.right.clone().multiplyScalar(s * 0.72)
        .addScaledVector(F.up, -0.62).addScaledVector(F.fwd, -0.28).normalize();
      return {
        root, dir, out: F.up.clone(), face: F.right.clone().multiplyScalar(s),
        height: D.E / W * 1.5, width: D.E / W * 1.25,
        depth: D.E / W * 0.28, thick: D.E / W * 0.13,
        colours: { back: 'hideDeep', backRoot: 'hide', inner: 'hide', rim: 'hideDeep' },
        fur: { len: [1.6, 1.1] }
      };
    });
  },

  flow: { base: [-1, -0.34, 0], radial: 'brow', radialR: 0.35, down: 0.72,
          curves: ['trunk', 'tail'], reference: 0.055 },

  coat(M, D, W, g) {
    const onTrunk = m.onCurve('trunk', 0.16, 0.075);
    const onTusk = m.any(m.onCurve('tusk-1', 0.075, 0.032), m.onCurve('tusk1', 0.075, 0.032));
    const onTail = m.onCurve('tail', 0.10, 0.045);
    const onLeg = m.except(m.onLimb(0.16, 0.070), onTusk);
    const foot = m.all(onLeg, m.height(0.10, 0.035));

    return {
      palette: PALETTE,
      band: { amount: 0.34, tip: 0.42 },
      layers: [
        { colour: 'hide' },
        { colour: 'hideLit', mask: m.scale(m.dorsal(0.55, 0.20), 0.55) },
        { colour: 'hideDeep', mask: m.dorsal(0.82, 1.05) },
        { colour: 'guard', mask: m.scale(m.station(0.10, 0.60, 0.22), 0.30), tip: 'guard' },
        { colour: 'ochre', mask: m.scale(m.all(m.ventral(0.05, -0.05), m.not(onLeg)), 0.35) },
        { colour: 'hideDeep', mask: onTrunk },
        { colour: 'hideDeep', mask: foot },
        // the ivory is the one thing on this animal that is not hair
        { colour: 'ivory', tip: 'ivory', mask: onTusk },
        { colour: 'ivoryOld', tip: 'ivoryOld',
          mask: m.all(onTusk, m.any(m.alongCurve('tusk-1', 0.0, 0.30, 0.12),
                                     m.alongCurve('tusk1', 0.0, 0.30, 0.12))) },
        { colour: 'ink', tip: 'ink', mask: m.near('brow', 0.075, 0.030) }
      ],
      fur: [
        { len: 0.075 + 0.075 * g.coat },                       // a shaggy hide
        { len: 0.030, mask: m.inFrame('head', { a: [0.30, 1.30] }, 0.20) },
        { len: 0.048 + 0.040 * g.coat, mask: onTrunk },
        { len: 0.020, mask: foot },
        { len: 0.000, mask: onTusk },                          // ivory grows no hair
        { len: 0.110 + 0.090 * g.coat, mask: onTail },
        { len: 0.130 + 0.110 * g.coat, mask: m.all(m.dorsal(0.80, 1.05), m.station(-0.10, 0.55, 0.25)) }
      ]
    };
  },

  views: [
    { dir: [1.30, 0.34, 1.42] },
    { dir: [0.12, 0.24, 1.60] },
    { dir: [1.15, 0.34, 0.80], look: [0.55, 0.82, 0], zoom: 0.36, fov: 26 },
    { dir: [-1.25, 0.42, 1.10] },
    { dir: [1.70, 0.16, 0.32], fov: 26 }
  ]
};

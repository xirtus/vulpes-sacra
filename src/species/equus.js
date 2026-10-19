// equus.js — Equus ferus caballus, the horse.
//
// Written in one pass against the rig's vocabulary. The anchor is again the
// height at the withers, because that is how a horse has been measured for
// three thousand years — in hands, at the withers.
//
//   W                withers height          the one measured number
//   L = Wφ/φ = W     body length ≈ withers   (the classic "square" horse)
//   N = W/φ          neck length
//   H = W/φ²         head length
//   E = W/φ⁵         ear
//
// A horse is not a big fox: the neck is a third of the animal, the legs carry
// most of the height, and almost all of the visible hair is in three places —
// mane, forelock and tail. That is the whole spec.

import { PHI, PI, p, GOLDEN_ANGLE, fib } from '../rig/sacred.js';
import { V } from '../rig/morph.js';
import * as m from '../rig/mask.js';

const PALETTE = {
  bay:      '#6d4423',   // body
  bayLit:   '#8f5c2e',   // where the sun catches the barrel
  bayDeep:  '#4a2c15',   // shoulder, stifle, the shadowed side
  points:   '#150f0b',   // mane, tail, lower legs — a bay's black points
  ink:      '#0b0807',
  muzzleGr: '#3b2a1e',   // the grey-brown of the muzzle
  pale:     '#c9ab84',   // soft flank and the inside of the leg
  blaze:    '#efe7d8',   // the white down the face
  hoof:     '#4b4239'
};

export default {
  id: 'equus',
  title: 'Equus Sacer',
  binomial: 'Equus ferus caballus',
  blurb: 'A horse from the same seed as the fox: φ for every proportion, a golden spiral for the tail, the Mandelbrot set for the coat. <em>One</em> measured number — the height at the withers.',
  palette: PALETTE,
  lattice: 0.0105,
  pelt: { count: 130000, width: 0.00085, shellCount: 5000 },

  anchor: { key: 'withers', label: 'withers height', value: 1.60, min: 1.20, max: 1.85, step: 0.01 },
  params: [
    { key: 'lean', label: 'leanness', value: 1.00, min: 0.88, max: 1.12, step: 0.01 },
    { key: 'coat', label: 'mane & tail', value: 0.60, min: 0, max: 1, step: 0.01 }
  ],

  // ---- the φ cascade -------------------------------------------------------
  derive: (W) => {
    const L = W;                 // body length = withers: the "square" horse
    const N = W * p(-1);         // neck
    const H = W * p(-2);         // head
    const T = W * p(-1);         // tail, dock plus hair
    const E = W * p(-5);         // ear
    return { L, N, H, T, E, table: [
      ['body length', 'W', L],
      ['neck', 'W/φ', N],
      ['head', 'W/φ²', H],
      ['tail', 'W/φ', T],
      ['ear', 'W/φ⁵', E],
      ['elbow', 'W/φ²·φ', W * p(-1) * 0.9],
      ['hock', 'W/φ³', W * p(-3)],
      ['mane sweep', '2π/φ²', (GOLDEN_ANGLE * 180 / PI).toFixed(3) + '°']
    ] };
  },

  // ---- the body ------------------------------------------------------------
  body(M, D, W, g) {
    const L = D.L, N = D.N, H = D.H;

    // The barrel. A horse's chest is deep and slab-sided; the topline runs
    // withers → back → loin → croup with the croup nearly as high as the
    // withers, and the underline lifts sharply into the flank.
    M.trunk([
      [ 0.470, 0.905, 0.560, 0.108, 2.6],   // point of shoulder
      [ 0.340, 0.985, 0.505, 0.132, 2.8],   // withers
      [ 0.170, 0.958, 0.470, 0.156, 3.0],   // deepest rib / girth
      [ 0.010, 0.930, 0.478, 0.152, 2.9],   // last rib
      [-0.140, 0.918, 0.528, 0.126, 2.7],   // flank / loin
      [-0.290, 0.930, 0.520, 0.150, 2.8],   // point of hip
      [-0.420, 0.948, 0.548, 0.156, 3.0],   // croup
      [-0.530, 0.905, 0.612, 0.126, 2.9],   // buttock
      [-0.585, 0.845, 0.700, 0.070, 2.6]    // dock
    ]);

    // ---- neck: a third of the animal, rising at the golden angle off the
    // horizontal, thick at the base, crested along the top ------------------
    M.chain([
      M.st(0.430, 0.760, 0.118, 0.190, 2.7),
      M.st(0.560, 0.880, 0.096, 0.158, 2.6),
      M.st(0.672, 1.010, 0.078, 0.128, 2.5),
      M.st(0.760, 1.128, 0.066, 0.104, 2.4)
    ], 0.055, 6);
    // the crest, the ridge the mane grows from
    M.curve('crest', [
      V(0.430 * W, 0.945 * W, 0), V(0.545 * W, 1.032 * W, 0),
      V(0.655 * W, 1.128 * W, 0), V(0.752 * W, 1.226 * W, 0)
    ]);

    // ---- head: occiput to muzzle, the long straight profile of a horse ----
    const occ = M.at('poll', 0.790, 1.210);
    const nose = M.at('muzzle', 0.790 + H / W * 0.62, 1.210 - H / W * 0.78);
    const F = M.frame('head', occ, nose);
    const hu = F.len / W;
    const h = (a, b, c) => F.at(a, b, c);

    M.blob(h(0.10, 0.02, 0), 0.20 * hu, 0.215 * hu, 0.150 * hu, 0.030);   // cranium
    for (const s of [-1, 1]) {
      M.blob(h(0.20, -0.06, s * 0.115), 0.26 * hu, 0.235 * hu, 0.085 * hu, 0.032);  // cheekbone
      M.blob(h(0.05, -0.20, s * 0.100), 0.20 * hu, 0.190 * hu, 0.080 * hu, 0.036);  // jowl
      M.blob(h(0.34, 0.075, s * 0.105), 0.10 * hu, 0.085 * hu, 0.062 * hu, 0.022);  // eye socket
    }
    // the face: a long, nearly straight superelliptic wedge, flaring at the
    // muzzle — the shape that separates a horse from every other animal here
    M.chain([
      M.stAt(h(0.28, -0.010, 0), 0.130 * hu, 0.190 * hu, 2.8),
      M.stAt(h(0.50, -0.020, 0), 0.098 * hu, 0.150 * hu, 2.7),
      M.stAt(h(0.72, -0.030, 0), 0.086 * hu, 0.124 * hu, 2.6),
      M.stAt(h(0.90, -0.030, 0), 0.092 * hu, 0.112 * hu, 2.5),
      M.stAt(h(1.00, -0.045, 0), 0.100 * hu, 0.098 * hu, 2.4)   // the muzzle flares
    ], 0.026, 6);
    M.blob(h(0.98, -0.070, 0), 0.115 * hu, 0.090 * hu, 0.100 * hu, 0.022);  // nostrils & lips
    M.chain([                                                               // lower jaw
      M.stAt(h(0.10, -0.235, 0), 0.185 * hu, 0.115 * hu, 2.7),
      M.stAt(h(0.52, -0.175, 0), 0.105 * hu, 0.082 * hu, 2.5),
      M.stAt(h(0.92, -0.125, 0), 0.085 * hu, 0.062 * hu, 2.4)
    ], 0.030, 5);
    M.blob(h(-0.14, -0.16, 0), 0.16 * hu, 0.20 * hu, 0.15 * hu, 0.060);     // throatlatch

    // ---- limbs ------------------------------------------------------------
    // A horse stands on one toe. The forelimb is a near-vertical column; the
    // hind limb is the sharp Z of stifle → hock → fetlock that drives it.
    const lean = g.lean;
    const zf = 0.088 / lean, zh = 0.104 / lean;
    for (const side of [-1, 1]) {
      M.limb(side, [
        ['scapula',  0.400, 0.885, zf * 0.86],
        ['shoulder', 0.470, 0.660, zf * 0.98],
        ['elbow',    0.398, 0.545, zf * 1.00],
        ['knee',     0.396, 0.330, zf * 0.94],
        ['fetlockF', 0.400, 0.125, zf * 0.90],
        ['hoofF',    0.404, 0.008, zf * 0.90],
        ['hip',     -0.290, 0.815, zh * 0.90],
        ['stifle',  -0.210, 0.548, zh * 1.02],
        ['hock',    -0.352, 0.300, zh * 0.88],
        ['fetlockH',-0.316, 0.118, zh * 0.84],
        ['hoofH',   -0.312, 0.008, zh * 0.84]
      ], [
        { from: 'scapula',  to: 'shoulder', r1a: 0.052, r2a: 0.108, r1b: 0.066, r2b: 0.096, k: 0.070 },
        { from: 'shoulder', to: 'elbow',    r1a: 0.066, r2a: 0.096, r1b: 0.048, r2b: 0.082, k: 0.060 },
        { from: 'elbow',    to: 'knee',     r1a: 0.040, r2a: 0.070, r1b: 0.026, r2b: 0.040, k: 0.040 },
        { from: 'knee',     to: 'fetlockF', r1a: 0.023, r2a: 0.032, r1b: 0.019, r2b: 0.026, k: 0.026 },
        { from: 'fetlockF', to: 'hoofF',    r1a: 0.024, r2a: 0.030, r1b: 0.030, r2b: 0.034, k: 0.020 },
        { from: 'hip',      to: 'stifle',   r1a: 0.092, r2a: 0.150, r1b: 0.052, r2b: 0.100, k: 0.075 },
        { from: 'stifle',   to: 'hock',     r1a: 0.048, r2a: 0.096, r1b: 0.026, r2b: 0.046, k: 0.048 },
        { from: 'hock',     to: 'fetlockH', r1a: 0.023, r2a: 0.034, r1b: 0.019, r2b: 0.026, k: 0.026 },
        { from: 'fetlockH', to: 'hoofH',    r1a: 0.024, r2a: 0.030, r1b: 0.029, r2b: 0.033, k: 0.020 }
      ], {
        mass: [
          { at: 'shoulder', to: 'elbow', t: 0.30, rx: 0.070, ry: 0.098, rz: 0.052, k: 0.080 },
          { at: 'hip', off: [-0.030, -0.055, 0.008], rx: 0.130, ry: 0.165, rz: 0.078, k: 0.090 },
          { at: 'stifle', off: [0.018, 0.055, 0.004], rx: 0.078, ry: 0.098, rz: 0.052, k: 0.070 },
          { at: 'hock', off: [-0.014, 0.012, 0], rx: 0.036, ry: 0.048, rz: 0.028, k: 0.026 }
        ]
      });
    }

    // ---- tail: the dock is short, the hair is not ------------------------
    const dock = V(-0.585 * W, 0.800 * W, 0);
    M.goldenCurve('tail', { from: dock, length: D.T / W * 0.86, turns: 0.30,
      launch: [-0.42, -1, 0], sway: p(-7), stations: fib(8) });
    // the dock is short and fleshy; everything below it is hair
    M.sweep('tail', t => 0.050 * Math.pow(1 - t, 1.9) + 0.0075, { k: 0.030, per: 3 });

    // the forelock, growing off the poll between the ears
    M.curve('forelock', [F.at(0.02, 0.16, 0), F.at(0.16, 0.10, 0), F.at(0.30, 0.02, 0)]);
  },

  // ---- ears: small, mobile, pricked forward ------------------------------
  appendages(M, D, W, g) {
    const F = M.frames.head;
    const tilt = GOLDEN_ANGLE / 10;
    return [-1, 1].map(s => {
      const root = F.at(-0.02, 0.16, s * 0.115);
      const dir = F.up.clone()
        .addScaledVector(F.right, s * Math.sin(tilt))
        .addScaledVector(F.fwd, Math.sin(GOLDEN_ANGLE / 5)).normalize();
      return {
        root, dir, out: F.right.clone().multiplyScalar(s), face: F.fwd,
        height: D.E / W * 1.7, width: D.E / W * 1.02,
        depth: D.E / W * 0.50, thick: D.E / W * 0.20,
        colours: { back: 'points', backRoot: 'bay', inner: 'muzzleGr', rim: 'points' },
        fur: { len: [0.35, 0.55] }
      };
    });
  },

  // The coat lies back along the barrel, down the legs, and runs the length of
  // the crest and the tail — which is what makes a mane a mane.
  flow: { base: [-1, -0.06, 0], radial: 'muzzle', radialR: 0.30, down: 0.56,
          curves: ['crest', 'tail', 'forelock'], reference: 0.030 },

  // ---- the pelage ---------------------------------------------------------
  coat(M, D, W, g) {
    const onTail  = m.onCurve('tail', 0.16, 0.070);
    const onCrest = m.all(m.onCurve('crest', 0.115, 0.045), m.dorsal(0.72, 0.98));
    const onFore  = m.onCurve('forelock', 0.075, 0.030);
    const onLeg   = m.except(m.onLimb(0.085, 0.032), onTail);
    const lowLeg  = m.all(onLeg, m.height(0.40, 0.26));
    const hoof    = m.all(onLeg, m.height(0.055, 0.020));

    return {
      palette: PALETTE,
      band: { amount: 0.16, tip: 0.30 },     // a horse's coat is barely banded
      layers: [
        { colour: 'bay' },
        { colour: 'bayLit', mask: m.scale(m.dorsal(0.62, 0.22), 0.55) },   // sunlit barrel
        { colour: 'bayDeep', mask: m.dorsal(0.80, 1.02) },                 // the topline
        { colour: 'bayDeep', mask: m.scale(m.station(0.30, 0.52, 0.14), 0.35) }, // shoulder
        { colour: 'pale', mask: m.scale(m.all(m.ventral(0.045, -0.030), m.not(onLeg)), 0.55) },
        { colour: 'pale', mask: m.scale(m.all(onLeg, m.lateral(0.0, 0.045)), 0.40) },
        // the black points of a bay
        { colour: 'points', tip: 'points', mask: lowLeg },
        { colour: 'points', tip: 'points', mask: onTail },
        { colour: 'points', tip: 'points', mask: onCrest },
        { colour: 'points', tip: 'points', mask: onFore },
        // the muzzle goes soft grey-brown, the way every bay's does
        { colour: 'muzzleGr', mask: m.inFrame('head', { a: [0.78, 1.30] }, 0.10) },
        { colour: 'ink', tip: 'ink', mask: m.near('muzzle', 0.045, 0.020) },
        // a blaze down the face, its width set by the golden angle
        { colour: 'blaze', tip: 'blaze',
          mask: m.all(m.inFrame('head', { a: [0.18, 1.02], c: [0.0, 0.055] }, 0.045),
                      m.facing([0.35, 0.60, 0], -0.1, 0.6)) },
        { colour: 'hoof', tip: 'hoof', mask: hoof }
      ],
      fur: [
        { len: 0.012 },                                          // a summer coat is short
        { len: 0.008, mask: m.inFrame('head', { a: [0.10, 1.20] }, 0.12) },
        { len: 0.007, mask: onLeg },
        { len: 0.150 + 0.130 * g.coat, mask: onCrest },          // the mane
        { len: 0.070 + 0.060 * g.coat, mask: onFore },           // the forelock
        { len: 0.190 + 0.150 * g.coat, mask: onTail }            // the tail
      ]
    };
  },

  views: [
    { dir: [1.30, 0.34, 1.45] },                                   // three-quarter
    { dir: [0.12, 0.22, 1.60] },                                   // broadside
    { dir: [1.10, 0.40, 0.85], look: [0.62, 0.90, 0], zoom: 0.30, fov: 26 },  // head
    { dir: [-1.25, 0.40, 1.15] },                                  // from behind
    { dir: [1.70, 0.14, 0.30], fov: 26 }                           // low, head on
  ]
};

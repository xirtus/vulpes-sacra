// vulpes.js — Vulpes vulpes, the red fox.
//
// The one-shot spec: written once against the rig's vocabulary, not tuned by
// eye. Every number is a power of φ times the anchor, or a fraction of a
// length that is itself a power of φ.

import { PHI, PI, p, GOLDEN_ANGLE, fib } from '../rig/sacred.js';
import { V } from '../rig/morph.js';
import * as m from '../rig/mask.js';

const PALETTE = {
  fire: '#c9631a', rust: '#a8410f', ember: '#76280a', sable: '#4a2a15',
  cream: '#e4d4bb', snow: '#f2ece0', soot: '#1c1512', ink: '#0d0908',
  grizzle: '#6b5340', pink: '#8c5148'
};

export default {
  id: 'vulpes',
  title: 'Vulpes Sacra',
  binomial: 'Vulpes vulpes',
  blurb: 'A red fox grown from φ, π and the Mandelbrot set. One measured number — the withers height — and <em>every</em> other dimension, marking and hair follows in closed form.',
  palette: PALETTE,
  lattice: 0.0100,
  pelt: { count: 120000, width: 0.00145, shellCount: 9000 },

  anchor: { key: 'withers', label: 'withers height', value: 0.40, min: 0.30, max: 0.50, step: 0.005 },
  params: [
    { key: 'lean', label: 'leanness', value: 1.00, min: 0.85, max: 1.15, step: 0.01 },
    { key: 'coat', label: 'winter coat', value: 0.55, min: 0, max: 1, step: 0.01 }
  ],

  // ---- the φ cascade: one measured number, everything else derived --------
  derive: (W) => {
    const L = W * PHI, T = L / PHI, H = L * p(-3), E = W * p(-3);
    return { L, T, H, E, table: [
      ['head + body', 'Wφ', L],
      ['brush', 'Wφ/φ', T],
      ['head', 'W/φ²', H],
      ['ear', 'W/φ³', E],
      ['elbow', 'W/φ', W * p(-1)],
      ['wrist', 'W/φ³', W * p(-3)],
      ['ear splay', '2π/φ²', (GOLDEN_ANGLE * 180 / PI).toFixed(3) + '°']
    ] };
  },

  // ---- the body ------------------------------------------------------------
  body(M, D, W, g) {
    const L = D.L, H = D.H;

    // trunk: [station, topline, underline, half-width, superellipse exponent]
    M.trunk([
      [ 0.375, 0.988, 0.700, 0.098, 2.5],   // point of shoulder
      [ 0.238, 1.000, 0.630, 0.128, 2.7],   // withers
      [ 0.088, 0.968, 0.612, 0.140, 2.9],   // deepest rib
      [-0.063, 0.940, 0.640, 0.130, 2.8],   // last rib
      [-0.200, 0.912, 0.686, 0.112, 2.6],   // waist
      [-0.338, 0.878, 0.658, 0.135, 2.7],   // flank over the hip
      [-0.488, 0.852, 0.648, 0.140, 2.9],   // croup
      [-0.625, 0.832, 0.678, 0.118, 2.9],   // rump
      [-0.700, 0.808, 0.716, 0.074, 2.6]    // root of the brush
    ]);

    // neck, rising forward out of the chest
    M.chain([
      M.st(0.330, 0.848, 0.112, 0.150, 2.6),
      M.st(0.470, 0.955, 0.092, 0.118, 2.5),
      M.st(0.575, 1.038, 0.078, 0.094, 2.4)
    ], 0.075, 5);

    // ---- head: a frame from the occiput to the nose ----------------------
    const occ = M.at('occiput', L * p(-2) / W, (1 + p(-5)));
    const nose = M.at('nose', L * p(-1) / W, (1 + p(-5)) - p(-4) - p(-6));
    const F = M.frame('head', occ, nose);
    const hu = F.len / W;                    // head length in anchor units
    const h = (a, b, c) => F.at(a, b, c);

    M.blob(h(0.20, 0.03, 0), 0.30 * hu, 0.235 * hu, 0.225 * hu, 0.075);
    M.blob(h(0.02, -0.02, 0), 0.24 * hu, 0.215 * hu, 0.205 * hu, 0.085);
    for (const s of [-1, 1]) {
      M.blob(h(0.24, -0.09, s * 0.155), 0.25 * hu, 0.145 * hu, 0.105 * hu, 0.065);
      M.blob(h(0.42, 0.10, s * 0.145), 0.13 * hu, 0.075 * hu, 0.085 * hu, 0.050);
      // cheek ruff — the flare that makes a fox a fox
      M.blob(h(0.02, -0.20, s * 0.30), 0.30 * hu, 0.26 * hu, 0.145 * hu, 0.085);
      M.blob(h(-0.16, -0.30, s * 0.26), 0.24 * hu, 0.22 * hu, 0.130 * hu, 0.090);
    }
    // muzzle: a long superelliptic wedge
    M.chain([
      M.stAt(h(0.44, 0.02, 0), 0.150 * hu, 0.180 * hu, 2.6),
      M.stAt(h(0.62, -0.02, 0), 0.105 * hu, 0.130 * hu, 2.4),
      M.stAt(h(0.82, -0.05, 0), 0.078 * hu, 0.098 * hu, 2.3),
      M.stAt(h(0.97, -0.075, 0), 0.062 * hu, 0.072 * hu, 2.3)
    ], 0.055, 6);
    M.blob(h(1.00, -0.085, 0), 0.055 * hu, 0.048 * hu, 0.062 * hu, 0.025);
    // lower jaw
    M.chain([
      M.stAt(h(0.18, -0.20, 0), 0.150 * hu, 0.105 * hu, 2.6),
      M.stAt(h(0.50, -0.19, 0), 0.110 * hu, 0.085 * hu, 2.4),
      M.stAt(h(0.80, -0.165, 0), 0.070 * hu, 0.062 * hu, 2.3)
    ], 0.060, 5);
    M.blob(h(-0.05, -0.30, 0), 0.24 * hu, 0.16 * hu, 0.17 * hu, 0.090);

    // ---- limbs -----------------------------------------------------------
    const lean = g.lean;
    const zc = p(-4) / lean, zf = p(-5) * PHI * 0.70, zh = p(-4) * 1.02 / lean, zk = p(-4) * 0.86;
    for (const side of [-1, 1]) {
      M.limb(side, [
        ['scapula', L * p(-4) / W - L * p(-7) / W, 1 - p(-5), zc * 0.80],
        ['shoulder', L * p(-5) / W, 1 - p(-3), zc * 0.92],
        ['elbow', L * p(-6) / W, p(-1), zc * 0.90],
        ['carpus', L * p(-7) / W, p(-3), zf * 0.94],
        ['fore', L * p(-8) / W, 0.012, zf * 0.92],
        ['hip', -L * p(-3) / W, 1 - p(-3) - p(-7), zh * 0.86],
        ['stifle', -L * p(-4) / W, p(-1) - p(-6), zh * 0.92],
        ['hock', -L * p(-3) / W - L * p(-5) / W, p(-3) * PHI * 0.82, zk * 0.86],
        ['hind', -L * p(-3) / W + L * p(-8) / W, 0.012, zk * 0.84]
      ], [
        { from: 'scapula', to: 'shoulder', r1a: 0.052, r2a: 0.090, r1b: 0.082, r2b: 0.100, k: 0.075 },
        { from: 'shoulder', to: 'elbow', r1a: 0.082, r2a: 0.100, r1b: 0.050, r2b: 0.072, k: 0.065 },
        { from: 'elbow', to: 'carpus', r1a: 0.044, r2a: 0.062, r1b: 0.026, r2b: 0.032, k: 0.050 },
        { from: 'carpus', to: 'fore', r1a: 0.026, r2a: 0.030, r1b: 0.028, r2b: 0.032, k: 0.035 },
        { from: 'hip', to: 'stifle', r1a: 0.098, r2a: 0.148, r1b: 0.052, r2b: 0.078, k: 0.075 },
        { from: 'stifle', to: 'hock', r1a: 0.046, r2a: 0.070, r1b: 0.026, r2b: 0.032, k: 0.055 },
        { from: 'hock', to: 'hind', r1a: 0.026, r2a: 0.030, r1b: 0.026, r2b: 0.030, k: 0.035 }
      ], {
        mass: [
          { at: 'shoulder', to: 'elbow', t: 0.35, rx: 0.058, ry: 0.072, rz: 0.052, k: 0.070 },
          { at: 'hip', off: [-0.030, -0.020, 0.010], rx: 0.135, ry: 0.130, rz: 0.075, k: 0.085 }
        ]
      });
      // paws
      M.blob(V((L * p(-8) / W + 0.016) * W, 0.026 * W, side * zf * 0.92 * W), 0.062, 0.030, 0.038, 0.030);
      M.blob(V((-L * p(-3) / W + L * p(-8) / W + 0.014) * W, 0.026 * W, side * zk * 0.84 * W), 0.058, 0.028, 0.036, 0.030);
    }

    // ---- brush: an arc of the golden logarithmic spiral -------------------
    const root = V(-L * p(-2) / W * W, (1 - p(-4) - p(-7)) * W, 0);
    M.goldenCurve('tail', { from: root, length: D.T / W, turns: 0.62,
      launch: [-1, -0.30, 0], stations: fib(8) });
    M.sweep('tail', t => (0.041 + 0.044 * Math.pow(Math.sin(PI * Math.pow(t, 0.72)), 0.62))
      * (0.94 + 0.16 * g.coat), { k: 0.040, per: 3 });
  },

  // ---- ears --------------------------------------------------------------
  appendages(M, D, W, g) {
    const F = M.frames.head, hu = F.len / W;
    const tilt = GOLDEN_ANGLE / 6;                 // 22.92° of outward splay
    return [-1, 1].map(s => {
      const root = F.at(0.10, 0.30, s * 0.30);
      const dir = F.up.clone()
        .addScaledVector(F.right, s * Math.sin(tilt))
        .addScaledVector(F.fwd, Math.sin(GOLDEN_ANGLE / 16)).normalize();
      return {
        root, dir, out: F.right.clone().multiplyScalar(s), face: F.fwd,
        height: D.E / W * 1.06, width: D.E / PHI / W * 1.20,
        depth: D.E / PHI / W * 0.46, thick: D.E * p(-4) / W,
        colours: { back: 'ink', backRoot: 'rust', inner: 'pink', rim: 'snow' },
        fur: { len: [0.30, 1.10] }
      };
    });
  },

  // ---- the lay of the coat ------------------------------------------------
  flow: { base: [-1, -0.10, 0], radial: 'nose', radialR: 0.75, down: 0.58,
          curves: ['tail'], reference: 0.035 },

  // ---- the pelage ---------------------------------------------------------
  coat(M, D, W, g) {
    const onTail = m.all(m.onCurve('tail', 0.22, 0.11), m.alongCurve('tail', 0.04, 1.3));
    const onLeg = m.except(m.onLimb(0.15, 0.055), onTail);
    const ruff = m.all(m.inFrame('head', { a: [-1.30, 0.28], c: [0.10, 0.62] }, 0.20));
    return {
      palette: PALETTE,
      band: { amount: 0.30, tip: 0.55 },
      layers: [
        { colour: 'fire' },
        { colour: 'ember', mask: m.dorsal(0.45, 1.02) },
        { colour: 'rust', mask: m.scale(m.dorsal(0.70, 0.15), 0.5) },
        { colour: 'sable', mask: m.scale(m.alongCurve('tail', 0.10, 0.88, 0.22), 0.55), amount: 0.62 },
        // ventral white: belly, chest, throat — never the limbs, never the brush
        { colour: 'cream', tip: 'snow',
          mask: m.except(m.except(m.ventral(0.070, -0.038), onLeg), onTail) },
        { colour: 'cream', tip: 'snow',
          mask: m.all(m.inFrame('head', { a: [0.36, 0.98], b: [-1.0, -0.04] }, 0.10)) },
        { colour: 'cream', tip: 'snow',
          mask: m.all(m.inFrame('head', { a: [0.02, 0.34], b: [-1.0, -0.14], c: [0.15, 0.55] }, 0.10)) },
        // black stockings
        { colour: 'soot', tip: 'soot', mask: m.all(onLeg, m.height(0.62, 0.40)) },
        // the tear line from the inner eye down the muzzle
        { colour: 'soot', amount: 0.55,
          mask: m.inFrame('head', { a: [0.36, 0.60], b: [-0.10, 0.10], c: [0.10, 0.22] }, 0.05) },
        // nose leather
        { colour: 'ink', tip: 'ink', mask: m.near('nose', 0.038, 0.018) },
        // the white tag on the brush
        { colour: 'snow', tip: 'snow', mask: m.all(onTail, m.alongCurve('tail', 0.78, 1.3, 0.09)) }
      ],
      fur: [
        { len: 0.030 + 0.024 * g.coat },
        { len: 0.016, mask: m.inFrame('head', { a: [-0.10, 0.34] }, 0.16) },
        { len: 0.009, mask: m.inFrame('head', { a: [0.34, 1.20] }, 0.12) },
        { len: 0.048 + 0.036 * g.coat, mask: ruff },
        { len: 0.012, mask: m.all(onLeg, m.height(0.62, 0.34)) },
        { len: 0.090 + 0.056 * g.coat, mask: onTail }
      ]
    };
  },

  views: [
    { dir: [1.35, 0.42, 1.45] },                                   // three-quarter
    { dir: [0.15, 0.30, 1.60] },                                   // broadside
    { dir: [1.05, 0.55, 0.80], look: [0.72, 0.86, 0], zoom: 0.34, fov: 26 },  // head
    { dir: [-1.30, 0.48, 1.20] },                                  // over the brush
    { dir: [1.80, 0.20, 0.35], fov: 26 }                           // low, head on
  ]
};

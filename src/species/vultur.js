// vultur.js — Vultur gryphus, the Andean condor.
//
// Anchored at the wingspan, because that is the number anyone quotes about a
// condor. Wings spread rather than folded, which makes this the widest thing
// the rig has built and the best test of the auto-framing: three metres across
// and forty centimetres deep.

import { PHI, PI, p, GOLDEN_ANGLE, fib } from '../rig/sacred.js';
import * as m from '../rig/mask.js';

const PALETTE = {
  soot:     '#181614',
  sootLit:  '#33302c',
  quill:    '#0d0c0b',
  ruff:     '#efeae0',
  ruffDp:   '#c4bcae',
  patch:    '#e8e4da',
  skin:     '#9c6b5c',
  skinDp:   '#6d463c',
  caruncle: '#7a4438',
  bill:     '#d6c9a8',
  ink:      '#0a0908'
};

export default {
  id: 'vultur',
  title: 'Vultur Sacer',
  binomial: 'Vultur gryphus',
  blurb: 'An Andean condor anchored at the wingspan — three metres across and forty centimetres deep. Twenty-one primaries and secondaries per wing, each a lofted shell, fanned by the golden angle.',
  palette: PALETTE,
  lattice: 0.0060,
  pelt: { count: 110000, width: 0.0011, shellCount: 0 },
  finish: { roughness: 0.66, sheen: 0.40, sheenColor: 0xcfd6dd, envMapIntensity: 0.45 },

  anchor: { key: 'span', label: 'wingspan', value: 3.00, min: 2.20, max: 3.40, step: 0.02 },
  params: [
    { key: 'lean', label: 'girth', value: 1.00, min: 0.88, max: 1.12, step: 0.01 },
    { key: 'coat', label: 'plumage', value: 0.55, min: 0, max: 1, step: 0.01 }
  ],

  derive: (W) => {
    const B = W * p(-2);         // body, bill to tail
    const Ch = W * p(-4);        // wing chord
    const Hd = W * p(-6) * PHI;  // head
    const T = W * p(-4);         // tail
    const N = fib(8);            // flight feathers per wing
    return { B, Ch, Hd, T, N, table: [
      ['body length', 'S/φ²', B],
      ['wing chord', 'S/φ⁴', Ch],
      ['tail', 'S/φ⁴', T],
      ['head', 'S/φ⁶·φ', Hd],
      ['flight feathers', 'fib(8)', N + ' per wing'],
      ['fan angle', '2π/φ²', (GOLDEN_ANGLE * 180 / PI).toFixed(3) + '°']
    ] };
  },

  body(M, D, W, g) {
    // A soaring bird is almost all wing. The body is a short deep barrel with
    // a keel, held level.
    M.trunk([
      [ 0.108, 0.560, 0.500, 0.014, 2.4],   // neck base
      [ 0.086, 0.582, 0.478, 0.026, 2.6],
      [ 0.050, 0.596, 0.452, 0.040, 2.8],   // shoulders — where the wings leave
      [ 0.000, 0.590, 0.442, 0.044, 2.8],   // keel, the deepest point
      [-0.055, 0.572, 0.454, 0.040, 2.8],
      [-0.110, 0.548, 0.478, 0.030, 2.7],
      [-0.150, 0.530, 0.496, 0.018, 2.6]    // the tail leaves here
    ], 0.006, 8);

    // ---- the bare neck and head -----------------------------------------
    M.chain([
      M.st(0.100, 0.548, 0.024, 0.026, 2.4),
      M.st(0.140, 0.578, 0.017, 0.018, 2.3),
      M.st(0.172, 0.598, 0.015, 0.016, 2.3)
    ], 0.008, 6);

    const nape = M.at('nape', 0.176, 0.600);
    const bill = M.at('bill', 0.176 + D.Hd / W * 1.10, 0.600 - D.Hd / W * 0.20);
    const F = M.frame('head', nape, bill);
    const hu = F.len / W;
    const h = (a, b, c) => F.at(a, b, c);

    M.blob(h(0.22, 0.06, 0), 0.38 * hu, 0.34 * hu, 0.32 * hu, 0.006);
    // the caruncle — the comb a male condor carries along the crown
    M.blob(h(0.34, 0.42, 0), 0.46 * hu, 0.30 * hu, 0.07 * hu, 0.005);
    for (const s of [-1, 1]) M.blob(h(0.34, -0.16, s * 0.22), 0.30 * hu, 0.24 * hu, 0.13 * hu, 0.005);
    // the hooked bill
    M.chain([
      M.stAt(h(0.58, 0.00, 0), 0.24 * hu, 0.28 * hu, 2.6),
      M.stAt(h(0.90, -0.14, 0), 0.16 * hu, 0.20 * hu, 2.5),
      M.stAt(h(1.10, -0.42, 0), 0.09 * hu, 0.11 * hu, 2.3)
    ], 0.005, 6);

    // ---- legs, tucked back under the tail --------------------------------
    for (const side of [-1, 1]) {
      M.limb(side, [
        ['hip',   -0.035, 0.470, 0.026],
        ['knee',  -0.070, 0.436, 0.030],
        ['ankle', -0.108, 0.452, 0.026],
        ['foot',  -0.140, 0.474, 0.024]
      ], [
        { from: 'hip',   to: 'knee',  r1a: 0.026, r2a: 0.030, r1b: 0.016, r2b: 0.018, k: 0.014 },
        { from: 'knee',  to: 'ankle', r1a: 0.013, r2a: 0.015, r1b: 0.010, r2b: 0.011, k: 0.007 },
        { from: 'ankle', to: 'foot',  r1a: 0.010, r2a: 0.011, r1b: 0.009, r2b: 0.010, k: 0.005 }
      ]);
    }

    M.curve('ruff', [M.p(0.072, 0.590, 0), M.p(0.098, 0.566, 0), M.p(0.112, 0.534, 0)]);
  },

  // Wings spread. Each is an arm shell plus fib(8) flight feathers whose
  // fan angle steps by the golden angle divided by their count.
  appendages(M, D, W, g) {
    const A = [];
    const feather = (root, dir, out, h, w, th, taper, colours) => ({
      root, dir, out, face: M.p(0, 1, 0).normalize(),
      height: h, width: w, depth: th * 0.5, thick: th, taper, colours
    });
    const N = D.N;

    for (const s of [-1, 1]) {
      // the arm: the inner half of the wing, broad and slightly swept
      A.push(feather(M.p(0.045, 0.552, s * 0.040),
        M.p(-0.10, 0.05, s * 1.0).normalize(), M.p(0.98, 0.06, s * 0.10).normalize(),
        0.245, D.Ch / W * 1.05, 0.013, 0.26,
        { back: 'soot', backRoot: 'sootLit', inner: 'sootLit', rim: 'quill' }));

      // flight feathers along the trailing edge, splayed into the slotted
      // hand every soaring bird has
      for (let i = 0; i < N; i++) {
        const t = i / (N - 1);
        const a = (t - 0.5) * (GOLDEN_ANGLE / 2.6);       // the fan
        const sweep = -0.10 - 0.62 * Math.pow(t, 1.7);    // the hand sweeps back
        const len = D.Ch / W * (1.02 + 0.68 * Math.pow(t, 1.35));
        const root = M.p(0.040 + sweep * 0.20, 0.548 - 0.006 * t, s * (0.055 + t * 0.395));
        A.push(feather(root,
          M.p(sweep, 0.02 + a * 0.30, s * (1.0 - 0.10 * t)).normalize(),
          M.p(0.98, 0.05, s * 0.12).normalize(),
          len, D.Ch / W * (0.42 - 0.20 * t), 0.0060, 0.22,
          { back: 'quill', backRoot: 'soot',
            inner: t > 0.55 ? 'quill' : 'patch', rim: 'ink' }));
      }
    }

    // a short square tail, fib(6) feathers
    const n = fib(6);
    for (let i = 0; i < n; i++) {
      const k = i - (n - 1) / 2;
      const a = k * (GOLDEN_ANGLE / 26);
      A.push(feather(M.p(-0.148, 0.516, k * 0.006),
        M.p(-0.98, -0.06 + a * 0.5, Math.sin(a) * 2.0).normalize(),
        M.p(0.06, 0.30, 0.95).normalize(),
        D.T / W * 0.95, D.T / W * 0.16, 0.006, 0.24,
        { back: 'quill', backRoot: 'soot', inner: 'quill', rim: 'ink' }));
    }
    return A;
  },

  flow: { base: [-1, -0.12, 0], radial: 'bill', radialR: 0.09, down: 0.44,
          curves: ['ruff'], reference: 0.010 },

  coat(M, D, W, g) {
    const bareHead = m.inFrame('head', { a: [-0.55, 1.50] }, 0.16);
    const onRuff = m.onCurve('ruff', 0.048, 0.018);
    const onLeg = m.onLimb(0.020, 0.008);

    return {
      palette: PALETTE,
      band: { amount: 0.12, tip: 0.24 },
      layers: [
        { colour: 'soot' },
        { colour: 'sootLit', mask: m.scale(m.dorsal(0.55, 0.98), 0.45) },
        // the white ruff at the base of the neck — the field mark
        { colour: 'ruff', tip: 'ruff', mask: onRuff },
        { colour: 'ruffDp', mask: m.scale(m.all(onRuff, m.lattice({ around: 24, edge: 0.28 })), 0.45) },
        // bare skin from the ruff up: the head and neck carry no feathers
        { colour: 'skin', mask: m.except(bareHead, onRuff) },
        { colour: 'skinDp', mask: m.scale(m.all(bareHead, m.lattice({ along: 120, edge: 0.30 })), 0.45) },
        { colour: 'caruncle', mask: m.inFrame('head', { a: [0.05, 0.70], b: [0.28, 1.20] }, 0.08) },
        { colour: 'bill', mask: m.inFrame('head', { a: [0.66, 1.60], b: [-0.60, 0.24] }, 0.07) },
        { colour: 'ink', mask: m.all(m.inFrame('head', { a: [0.26, 0.46], b: [-0.06, 0.16], c: [0.14, 0.32] }, 0.05)) },
        { colour: 'skinDp', tip: 'skinDp', mask: onLeg }
      ],
      fur: [
        { len: 0.010 + 0.007 * g.coat },
        { len: 0.020 + 0.014 * g.coat, mask: m.all(m.station(-0.12, 0.09, 0.04), m.dorsal(0.20, 0.80)) },
        { len: 0.026 + 0.018 * g.coat, mask: onRuff },
        { len: 0.000, mask: m.except(bareHead, onRuff) },
        { len: 0.002, mask: onLeg }
      ]
    };
  },

  views: [
    { dir: [0.90, 0.42, 1.30] },
    { dir: [0.06, 0.20, 1.60] },
    { dir: [1.10, 0.34, 0.80], look: [0.10, 0.78, 0], zoom: 0.20, fov: 26 },
    { dir: [-1.10, 0.40, 1.05] },
    { dir: [0.10, 1.55, 0.22], fov: 30 }
  ]
};

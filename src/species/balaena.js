// balaena.js — Balaenoptera musculus, the blue whale.
//
// The largest anchor the rig has taken, and the first animal with no legs at
// all. Everything that would be a limb is a lofted shell instead: two
// flippers and one fluke. The ventral pleats are a lattice mask — seventy
// grooves running the length of the throat, which is what actually makes a
// rorqual look like a rorqual.

import { PHI, PI, p, GOLDEN_ANGLE, fib } from '../rig/sacred.js';
import * as m from '../rig/mask.js';

const PALETTE = {
  slate:    '#3d4d5c',
  slateLit: '#5b6f80',
  slateDeep:'#232f3a',
  mottle:   '#7d8f9c',
  pleat:    '#8a8d80',
  pleatDp:  '#4d5348',
  belly:    '#6d7b7a',
  baleen:   '#1a1a18',
  ink:      '#0a0d10'
};

export default {
  id: 'balaena',
  title: 'Balaena Sacra',
  binomial: 'Balaenoptera musculus',
  blurb: 'Twenty-five metres of whale on the same terms as a nine-centimetre frog. No limbs: two flippers and a fluke, all lofted shells. The throat pleats are a lattice mask — fib(11) grooves.',
  palette: PALETTE,
  lattice: 0.0075,
  pelt: { count: 0 },
  finish: { roughness: 0.34, clearcoat: 0.40, clearcoatRoughness: 0.20, sheen: 0, envMapIntensity: 0.9 },
  medium: 'water',

  anchor: { key: 'length', label: 'total length', value: 25.0, min: 18, max: 30, step: 0.1 },
  params: [
    { key: 'lean', label: 'girth', value: 1.00, min: 0.88, max: 1.14, step: 0.01 },
    { key: 'gape', label: 'throat', value: 0.42, min: 0, max: 1, step: 0.01 }
  ],

  derive: (W) => {
    const Hd = W * p(-2);         // head, rostrum to blowhole
    const Fl = W * p(-4);         // flipper
    const Fk = W * p(-3);         // fluke span
    const Pl = W * p(-2) * PHI;   // the pleated throat runs back past the flipper
    return { Hd, Fl, Fk, Pl, table: [
      ['head', 'L/φ²', Hd],
      ['flipper', 'L/φ⁴', Fl],
      ['fluke span', 'L/φ³', Fk],
      ['pleated throat', 'L/φ', Pl],
      ['pleats', 'fib(11)', fib(11) + ' grooves'],
      ['fluke sweep', '2π/φ²', (GOLDEN_ANGLE * 180 / PI).toFixed(3) + '°']
    ] };
  },

  body(M, D, W, g) {
    const gape = g.gape;

    // A rorqual is a single fusiform run: a flat broad rostrum, the widest
    // point a third back, then a long taper into the peduncle. There is no
    // neck, no shoulder and no waist anywhere along it.
    M.trunk([
      [ 0.500, 0.508, 0.492, 0.010, 2.4],   // tip of the rostrum
      [ 0.440, 0.526, 0.474, 0.030, 2.8],
      [ 0.360, 0.544, 0.450, 0.052, 3.0],   // the flat plane of the head
      [ 0.255, 0.558, 0.424 - 0.020 * gape, 0.070, 2.9],   // blowhole / gape
      [ 0.130, 0.566, 0.412 - 0.026 * gape, 0.080, 2.8],   // the deepest point
      [-0.010, 0.562, 0.420 - 0.016 * gape, 0.076, 2.8],
      [-0.160, 0.550, 0.440, 0.064, 2.8],
      [-0.300, 0.534, 0.462, 0.046, 2.8],
      [-0.420, 0.520, 0.480, 0.030, 2.9],   // peduncle
      [-0.480, 0.512, 0.490, 0.018, 3.0]
    ], 0.012, 9);

    // the head frame runs along the rostrum
    const blow = M.at('blowhole', 0.270, 0.558);
    const snout = M.at('snout', 0.500, 0.504);
    const F = M.frame('head', blow, snout);

    // the splashguard and the two blowholes
    M.blob(F.at(0.04, 0.06, 0), 0.026, 0.010, 0.026, 0.030);
    // the dorsal fin — tiny, and set three-quarters of the way back
    M.blob(M.p(-0.294, 0.544, 0), 0.030, 0.024, 0.010, 0.022);
    M.blob(M.p(-0.302, 0.530, 0), 0.048, 0.018, 0.014, 0.026);
    // the lower jaw, dropped by the gape
    M.chain([
      M.stAt(F.at(0.06, -0.26 - 0.09 * gape, 0), 0.072, 0.024, 2.8),
      M.stAt(F.at(0.50, -0.20 - 0.08 * gape, 0), 0.050, 0.018, 2.7),
      M.stAt(F.at(0.92, -0.08 - 0.03 * gape, 0), 0.018, 0.010, 2.5)
    ], 0.014, 7);

    // the peduncle keel, and the curve the fluke leaves on
    M.curve('keel', [M.p(-0.300, 0.490, 0), M.p(-0.420, 0.488, 0), M.p(-0.500, 0.492, 0)]);
  },

  // Everything that would be a limb on a land animal.
  appendages(M, D, W, g) {
    const out = [];
    // flippers: long, narrow, swept back
    for (const s of [-1, 1]) {
      const root = M.p(0.180, 0.442, s * 0.062);
      const dir = M.p(-0.62, -0.30, s * 0.72).normalize();
      out.push({
        root, dir, out: M.p(0.72, 0.34, s * 0.10).normalize(),
        face: M.p(0, 1, 0).normalize(),
        height: D.Fl / W * 1.15, width: D.Fl / W * 0.40,
        depth: D.Fl / W * 0.055, thick: D.Fl / W * 0.075, taper: 0.52,
        colours: { back: 'slateDeep', backRoot: 'slate', inner: 'belly', rim: 'slateDeep' }
      });
    }
    // the fluke: two blades leaving the peduncle at the golden angle from
    // the midline, swept back
    for (const s of [-1, 1]) {
      const root = M.p(-0.492, 0.502, s * 0.010);
      const dir = M.p(-0.34, -0.02, s * 1.0).normalize();
      out.push({
        root, dir, out: M.p(-1.0, 0.10, s * 0.34).normalize(),
        face: M.p(0, 1, 0).normalize(),
        height: D.Fk / W * 0.56, width: D.Fk / W * 0.46,
        depth: D.Fk / W * 0.030, thick: D.Fk / W * 0.055, taper: 0.62,
        colours: { back: 'slateDeep', backRoot: 'slate', inner: 'belly', rim: 'slateDeep' }
      });
    }
    return out;
  },

  coat(M, D, W, g) {
    const throat = m.all(m.ventral(0.010, -0.040), m.station(-0.02, 0.44, 0.05),
                         m.facing([0, -1, 0], 0.25, 0.80));
    const pleats = m.all(throat, m.lattice({ around: fib(11), edge: 0.36 }));
    const mottling = m.all(m.dorsal(0.30, 0.85), m.fractal(0.46, 0.68));

    return {
      palette: PALETTE,
      band: { amount: 0.04, tip: 0.06 },
      layers: [
        { colour: 'slate' },
        { colour: 'slateLit', mask: m.scale(m.dorsal(0.55, 0.95), 0.50) },
        { colour: 'slateDeep', mask: m.dorsal(0.86, 1.02) },
        // the mottling that lets a blue whale be told from every other one
        { colour: 'mottle', mask: m.scale(mottling, 0.55) },
        { colour: 'belly', mask: m.except(m.ventral(0.030, -0.045), throat) },
        { colour: 'pleat', mask: throat },
        { colour: 'pleatDp', mask: pleats, amount: 0.88 },
        { colour: 'baleen',
          mask: m.all(m.inFrame('head', { a: [0.10, 0.94], b: [-0.36, -0.10] }, 0.08)) },
        { colour: 'ink', mask: m.near('blowhole', 0.028, 0.012) }
      ],
      fur: [{ len: 0 }]
    };
  },

  views: [
    { dir: [1.10, 0.26, 1.30] },
    { dir: [0.10, 0.18, 1.60] },
    { dir: [1.20, 0.22, 0.70], look: [0.30, 0.55, 0], zoom: 0.36, fov: 26 },
    { dir: [-1.30, 0.30, 1.00] },
    { dir: [0.25, 1.45, 0.30], fov: 30 }
  ]
};

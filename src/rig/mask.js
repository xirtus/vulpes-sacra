// mask.js — the declarative vocabulary for "where on the animal".
//
// A mask is a pure function of a surface point, returning 0..1. Markings, fur
// length, and hair direction are all written as masks, which is why a species
// spec contains no per-pixel code and no texture.
//
// Every distance is in ANCHOR UNITS, so a mask written for a fox reads the
// same on a horse ten times its size.

import { clamp, smoothstep, mix } from './sacred.js';

const S = smoothstep;

// ---- position ------------------------------------------------------------

/** Below the belly line. `up`/`down` are distances from it, in anchor units. */
export const ventral = (up = 0.065, down = -0.040) =>
  c => S(c.ul + up, c.ul + down, c.depthY);

/** Along the back. `t` runs 0 at the belly to 1 at the topline. */
export const dorsal = (t0 = 0.55, t1 = 0.95) => c => S(t0, t1, c.depth);

/** A longitudinal band. x in anchor units, nose positive. */
export const station = (x0, x1, feather = 0.10) =>
  c => S(x0 - feather, x0 + feather, c.u) * S(x1 + feather, x1 - feather, c.u);

/** Absolute height above the ground, in anchor units. */
export const height = (y0, y1) => c => S(y0, y1, c.y / c.W);

/** Near any registered limb bone. Radii in anchor units. */
export const onLimb = (r0 = 0.14, r1 = 0.055) => c => S(r0, r1, c.limbD);

/** Near a named curve — the tail, a mane crest. Radii in anchor units. */
export const onCurve = (name, r0 = 0.22, r1 = 0.11) =>
  c => { const q = c.curve(name); return q ? S(r0, r1, q[0]) : 0; };

/** A span along a named curve, 0 at its root to 1 at its tip. */
export const alongCurve = (name, s0, s1, feather = 0.06) =>
  c => { const q = c.curve(name); if (!q) return 0;
         return S(s0 - feather, s0 + feather, q[1]) * S(s1 + feather, s1 - feather, q[1]); };

/**
 * A soft box in a named local frame — the way a face is actually described.
 * ranges: { a:[along0,along1], b:[up0,up1], c:[across0,across1] }, any omitted.
 * `c` is taken as |across| so left and right are written once.
 */
export const inFrame = (name, ranges = {}, feather = 0.08) => {
  const R = ranges;
  return ctx => {
    const f = ctx.frame(name); if (!f) return 0;
    let m = 1;
    if (R.a) m *= S(R.a[0] - feather, R.a[0] + feather, f[0]) * S(R.a[1] + feather, R.a[1] - feather, f[0]);
    if (R.b) m *= S(R.b[0] - feather, R.b[0] + feather, f[1]) * S(R.b[1] + feather, R.b[1] - feather, f[1]);
    if (R.c) { const ac = Math.abs(f[2]);
      m *= S(R.c[0] - feather, R.c[0] + feather, ac) * S(R.c[1] + feather, R.c[1] - feather, ac); }
    return clamp(m);
  };
};

/** Distance from a named landmark, in anchor units. */
export const near = (name, r0, r1) =>
  c => { const d = c.nearMark(name); return d === null ? 0 : S(r0, r1, d); };

/** How far out to the side, |z| in anchor units. */
export const lateral = (c0, c1) => c => S(c0, c1, Math.abs(c.z) / c.W);

// ---- orientation ---------------------------------------------------------

/** How much the surface faces a direction. */
export const facing = (dir, t0 = 0.0, t1 = 0.7) => {
  const [dx, dy, dz] = dir;
  return c => S(t0, t1, c.nx * dx + c.ny * dy + c.nz * dz);
};

// ---- the fractal ---------------------------------------------------------

/** The Mandelbrot escape time at this point, thresholded. */
export const fractal = (lo = 0.35, hi = 0.75) => c => S(lo, hi, c.M);

// ---- periodic and cellular -----------------------------------------------
// Skin is rarely plain. These give the two arrangements nature actually uses:
// a lattice (scales, pleats, plates) and a phyllotactic Voronoi (scutes,
// tubercles, warts) — the same golden-angle packing the fur uses.

/**
 * A soft lattice in (longitudinal, girth) space. `along` and `around` are
 * counts; either may be 0 to get plain bands. `edge` is the width of the seam.
 */
export const lattice = ({ along = 0, around = 0, edge = 0.18, phase = 0 }) => c => {
  let v = 0;
  if (along) v = Math.max(v, seam(c.u * along + phase, edge));
  if (around) v = Math.max(v, seam(c.girth / (2 * PI_) * around + phase, edge));
  return v;
};
const PI_ = Math.PI;
const seam = (t, edge) => {
  const f = Math.abs(t - Math.round(t)) * 2;      // 0 at a seam, 1 mid-cell
  return smoothstep(edge, 0, f);
};

/**
 * Voronoi edges of a Vogel phyllotaxis point set laid over (longitudinal,
 * girth) space — the arrangement a tortoise's scutes and a sunflower's seeds
 * share. `count` cells, `edge` the width of the sulcus between them.
 */
export const scutes = ({ count = 34, edge = 0.30, spanU = [-1, 1], spanG = [-PI_, PI_], aspect = 1 } = {}) => {
  const pts = [];
  const GA = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const r = Math.sqrt((i + 0.5) / count), a = i * GA;
    pts.push([r * Math.cos(a), r * Math.sin(a)]);
  }
  const u0 = spanU[0], u1 = spanU[1], g0 = spanG[0], g1 = spanG[1];
  return c => {
    const x = ((c.u - u0) / (u1 - u0) * 2 - 1);
    // The girth must unwrap monotonically — sin() folds the left flank onto
    // the right one — and it must be told the range actually in use. On a
    // domed shell the girth only ever spans a third of a turn, and a Voronoi
    // stretched over that gap comes out as stripes, not cells.
    const y = ((c.girth - g0) / (g1 - g0) * 2 - 1) * aspect;
    let d0 = 1e9, d1 = 1e9;
    for (const [px, py] of pts) {
      const d = (x - px) * (x - px) + (y - py) * (y - py);
      if (d < d0) { d1 = d0; d0 = d; } else if (d < d1) d1 = d;
    }
    const gap = Math.sqrt(d1) - Math.sqrt(d0);     // 0 exactly on a cell edge
    return smoothstep(edge * 0.34, 0, gap);
  };
};

// ---- combinators ---------------------------------------------------------

export const all = (...m) => c => { let v = 1; for (const f of m) { v *= f(c); if (v <= 0) return 0; } return v; };
export const any = (...m) => c => { let v = 0; for (const f of m) v = Math.max(v, f(c)); return v; };
export const not = m => c => 1 - m(c);
export const scale = (m, k) => c => clamp(m(c) * k);
export const except = (a, b) => c => clamp(a(c) * (1 - b(c)));
export const always = () => 1;

// pelage.js — turns a spec's declarative coat into the one function the
// renderer needs: point → colour, hair length, hair direction.
//
// Colour is a stack of layers, each a palette entry painted through a mask.
// Hair length is the same idea. The only source of texture on the whole animal
// is the Mandelbrot set, sampled just off the main cardioid where the boundary
// is at its most filigreed — no noise function, no random(), no image.

import * as THREE from 'three';
import { mandelbrot, julia, clamp, smoothstep, mix, s2l, PHI, PI, GOLDEN_ANGLE } from './sacred.js';

const hex = h => {
  if (typeof h !== 'string') return h;
  const v = parseInt(h.replace('#', ''), 16);
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
};

export function makePelage(morph, coat, D) {
  const W = morph.W;
  const P = {}; for (const k in coat.palette) P[k] = hex(coat.palette[k]);
  const col = c => (typeof c === 'string' && P[c]) ? P[c] : hex(c);

  const layers = (coat.layers || []).map(l => ({
    c: col(l.colour), tip: l.tip ? col(l.tip) : null,
    mask: l.mask || null, amount: l.amount ?? 1
  }));
  const furs = (coat.fur || []).map(f => ({ len: f.len, mask: f.mask || null }));
  const band = coat.band || { amount: 0.30, tip: 0.5 };
  const bare = coat.bare || [];

  // curve arc-length tables
  const arcs = {};
  for (const name in morph.curves) {
    const pts = morph.curves[name], a = [0];
    for (let i = 1; i < pts.length; i++) a.push(a[i - 1] + pts[i].distanceTo(pts[i - 1]));
    const L = a[a.length - 1] || 1;
    arcs[name] = { pts, s: a.map(v => v / L) };
  }

  const ctx = {
    x: 0, y: 0, z: 0, nx: 0, ny: 0, nz: 0, W,
    u: 0, depth: 0, depthY: 0, ul: 0, limbD: 9, girth: 0, M: 0, J: 0,
    _frames: {}, _curves: {},
    frame(n) { return this._frames[n] || null; },
    curve(n) { return this._curves[n] || null; },
    nearMark(n) { const m = morph.marks[n]; return m ? Math.hypot(this.x - m.x, this.y - m.y, this.z - m.z) / W : null; }
  };

  function segDist2(x, y, z, a, b) {
    const ex = b.x - a.x, ey = b.y - a.y, ez = b.z - a.z;
    const l2 = ex * ex + ey * ey + ez * ez || 1e-9;
    let t = ((x - a.x) * ex + (y - a.y) * ey + (z - a.z) * ez) / l2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const dx = x - (a.x + ex * t), dy = y - (a.y + ey * t), dz = z - (a.z + ez * t);
    return [dx * dx + dy * dy + dz * dz, t];
  }

  const out = { r: 0, g: 0, b: 0, tr: 0, tg: 0, tb: 0, len: 0, stiff: 0.6 };

  function shade(x, y, z, nx, ny, nz) {
    ctx.x = x; ctx.y = y; ctx.z = z; ctx.nx = nx; ctx.ny = ny; ctx.nz = nz;
    // Everything a mask sees is resolved in the animal's own frame — long,
    // ventral, lateral — so the same mask reads the same on a quadruped, a
    // fish and a standing man.
    const long = morph.axisLong || [1, 0, 0], vent = morph.axisVent || [0, -1, 0],
          lat = morph.axisLat || [0, 0, -1];
    ctx.u = (x * long[0] + y * long[1] + z * long[2]) / W;
    const posVent = (x * vent[0] + y * vent[1] + z * vent[2]) / W;
    const ul = morph.bellyLine ? morph.bellyLine(ctx.u) / W : 0.6;
    const tl = morph.backLine ? morph.backLine(ctx.u) / W : 1.0;
    ctx.ul = ul; ctx.depthY = posVent;
    ctx.depth = clamp((posVent - ul) / Math.max(1e-5, tl - ul));

    // limbs
    let best = 1e9;
    for (const [a, b] of morph.bones) { const [d] = segDist2(x, y, z, a, b); if (d < best) best = d; }
    ctx.limbD = Math.sqrt(best) / W;

    // curves
    for (const name in arcs) {
      const A = arcs[name]; let bd = 1e9, bs = 0;
      for (let i = 0; i < A.pts.length - 1; i++) {
        const [d, t] = segDist2(x, y, z, A.pts[i], A.pts[i + 1]);
        if (d < bd) { bd = d; bs = mix(A.s[i], A.s[i + 1], t); }
      }
      ctx._curves[name] = [Math.sqrt(bd) / W, bs];
    }

    // frames
    for (const name in morph.frames) {
      const f = morph.frames[name];
      const px = x - f.origin.x, py = y - f.origin.y, pz = z - f.origin.z;
      ctx._frames[name] = [
        (px * f.fwd.x + py * f.fwd.y + pz * f.fwd.z) / f.len,
        (px * f.up.x + py * f.up.y + pz * f.up.z) / f.len,
        (px * f.right.x + py * f.right.y + pz * f.right.z) / f.len
      ];
    }

    // the fractal field: longitudinal station and girth angle become a point
    // in the complex plane just outside the main cardioid
    const girth = Math.atan2(
      x * lat[0] + y * lat[1] + z * lat[2],
      x * vent[0] + y * vent[1] + z * vent[2] - (ul + 0.19) * W);
    ctx.girth = girth;
    const cyc = girth / PI;
    const cx = -0.743643 + 0.0125 * Math.cos(cyc * 2 * PI) + 0.0090 * ctx.u * PHI;
    const cy = 0.131825 + 0.0125 * Math.sin(cyc * 2 * PI) + 0.0090 * Math.sin(ctx.u * GOLDEN_ANGLE);
    const M = mandelbrot(cx, cy, 96);
    const J = julia(ctx.u * 1.7, cyc * 1.7, -0.8 + 0.05 * M, 0.156, 24);
    ctx.M = M; ctx.J = J;
    const grain = (M - 0.5) * 2, fine = (J - 0.5) * 2;

    // ---- colour: paint the layer stack ---------------------------------
    let r = 0.5, g = 0.3, b = 0.15, tr = null, tg = null, tb = null;
    let painted = 0;
    for (const L of layers) {
      const m = L.mask ? clamp(L.mask(ctx) * L.amount) : L.amount;
      if (m <= 0) continue;
      if (!painted) { r = L.c[0]; g = L.c[1]; b = L.c[2]; painted = 1;
        if (m >= 1 && !L.tip) continue; }
      r = mix(r, L.c[0], m); g = mix(g, L.c[1], m); b = mix(b, L.c[2], m);
      if (L.tip) { tr = mix(tr ?? r, L.tip[0], m); tg = mix(tg ?? g, L.tip[1], m); tb = mix(tb ?? b, L.tip[2], m); }
    }
    // fractal variegation, always subtle
    const vg = 1 + 0.13 * grain;
    r = clamp(r * vg); g = clamp(g * vg); b = clamp(b * vg);

    // ---- agouti banding -------------------------------------------------
    // a real guard hair is banded: pale root, dark subterminal band, light tip
    const bandAmt = band.amount * (0.5 + 0.5 * M);
    const rootLift = 1 + 0.20 * bandAmt;
    const tipDark = clamp(0.2 + 0.6 * M) * band.tip;
    out.r = s2l(clamp(r * rootLift)); out.g = s2l(clamp(g * rootLift)); out.b = s2l(clamp(b * rootLift));
    out.tr = s2l(clamp(tr ?? mix(r, 0.04, tipDark)));
    out.tg = s2l(clamp(tg ?? mix(g, 0.03, tipDark)));
    out.tb = s2l(clamp(tb ?? mix(b, 0.03, tipDark)));

    // ---- hair length ------------------------------------------------------
    let len = 0;
    for (const F of furs) {
      const m = F.mask ? F.mask(ctx) : 1;
      if (m <= 0) continue;
      len = mix(len, F.len * W, m);
    }
    len *= 1 + 0.24 * fine + 0.12 * grain;
    for (const B of bare) len *= 1 - B(ctx);

    out.len = Math.max(0.0004, len);
    out.stiff = clamp(0.30 + 0.5 * M + 0.3 * ctx.depth);
    return out;
  }

  shade.ctx = ctx;
  return shade;
}

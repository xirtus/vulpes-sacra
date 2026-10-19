// coat.js — the pelage.
//
// Colour, hair length and guard-hair banding are all read out of closed-form
// fields: geometric masks for the species markings (white throat, black
// stockings, white tag on the brush) and the Mandelbrot set for the
// variegation that stops the coat looking painted. There is no noise function
// and no random number anywhere in this file.

import { mandelbrot, julia, clamp, smoothstep, mix, s2l, PHI, PI, GOLDEN_ANGLE, p } from './sacred.js';

const C = h => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];

export const PALETTE = {
  rust:    C(0xa8410f),
  fire:    C(0xc9631a),
  ember:   C(0x76280a),
  sable:   C(0x4a2a15),
  cream:   C(0xe4d4bb),
  snow:    C(0xf2ece0),
  soot:    C(0x1c1512),
  ink:     C(0x0d0908),
  grizzle: C(0x6b5340),
  pink:    C(0x8c5148)
};

// distance from a point to a polyline, squared
function segDist2(x, y, z, a, b) {
  const ex = b.x - a.x, ey = b.y - a.y, ez = b.z - a.z;
  const l2 = ex * ex + ey * ey + ez * ez;
  let t = ((x - a.x) * ex + (y - a.y) * ey + (z - a.z) * ez) / l2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const dx = x - (a.x + ex * t), dy = y - (a.y + ey * t), dz = z - (a.z + ez * t);
  return [dx * dx + dy * dy + dz * dz, t];
}

// the torso underline, as a function of x
function makeUnderline(F, table) {
  const W = F.W;
  return x => {
    const u = x / W;
    if (u >= table[0][0]) return table[0][1] * W;
    const n = table.length;
    if (u <= table[n - 1][0]) return table[n - 1][1] * W;
    for (let i = 0; i < n - 1; i++) {
      if (u <= table[i][0] && u >= table[i + 1][0]) {
        const t = (table[i][0] - u) / (table[i][0] - table[i + 1][0]);
        return mix(table[i][1], table[i + 1][1], t * t * (3 - 2 * t)) * W;
      }
    }
    return 0.65 * W;
  };
}

export function makeCoat(F, UNDER) {
  const W = F.W, H = F.face.H;
  const { fwd, up, right } = F.face;
  const occ = F.spine.occiput;
  const tp = F.tail.pts;
  const underline = makeUnderline(F, UNDER);

  // ---- tail station ------------------------------------------------------
  const tArc = [0];
  for (let i = 1; i < tp.length; i++) tArc.push(tArc[i - 1] + tp[i].distanceTo(tp[i - 1]));
  const tLen = tArc[tArc.length - 1];
  for (let i = 0; i < tArc.length; i++) tArc[i] /= tLen;

  function tailCoord(x, y, z) {
    let best = 1e9, bs = 0;
    for (let i = 0; i < tp.length - 1; i++) {
      const [d, t] = segDist2(x, y, z, tp[i], tp[i + 1]);
      if (d < best) { best = d; bs = mix(tArc[i], tArc[i + 1], t); }
    }
    return [Math.sqrt(best), bs];
  }

  // ---- limb skeleton, for the stocking mask ------------------------------
  const bones = [];
  for (const L of F.legs) {
    bones.push([L.shoulder, L.elbow], [L.elbow, L.carpus], [L.carpus, L.fore],
               [L.hip, L.stifle], [L.stifle, L.hock], [L.hock, L.hind]);
  }
  function limbDist(x, y, z) {
    let best = 1e9;
    for (const [a, b] of bones) { const [d] = segDist2(x, y, z, a, b); if (d < best) best = d; }
    return Math.sqrt(best);
  }

  const out = { r: 0, g: 0, b: 0, tr: 0, tg: 0, tb: 0, len: 0, stiff: 0, region: 0 };

  function shade(x, y, z, nx, ny, nz) {
    // ---- local coordinates ------------------------------------------------
    const px = x - occ.x, py = y - occ.y, pz = z - occ.z;
    const ha = (px * fwd.x + py * fwd.y + pz * fwd.z) / H;
    const hb = (px * up.x + py * up.y + pz * up.z) / H;
    const hc = (px * right.x + py * right.y + pz * right.z) / H;
    const ac = Math.abs(hc);
    const onHead = smoothstep(-0.55, -0.20, ha);

    const ul = underline(F ? x : x);
    const [tailD, tailS] = tailCoord(x, y, z);
    const onTail = smoothstep(0.085, 0.045, tailD) * smoothstep(0.015, 0.10, tailS);
    const onLimb = smoothstep(0.055, 0.022, limbDist(x, y, z)) * (1 - onTail) * (1 - onHead);
    const depth = clamp((y - ul) / Math.max(1e-4, 0.98 * W - ul));

    // ---- the Mandelbrot field ---------------------------------------------
    const cyc = Math.atan2(y - (ul + 0.075), z);
    const u = x / W, v = cyc / PI;
    const cx = -0.743643 + 0.0125 * Math.cos(v * PI * 2) + 0.0090 * u * PHI;
    const cy = 0.131825 + 0.0125 * Math.sin(v * PI * 2) + 0.0090 * Math.sin(u * GOLDEN_ANGLE);
    const M = mandelbrot(cx, cy, 96);
    const J = julia(u * 1.7, v * 1.7, -0.8 + 0.05 * M, 0.156, 24);
    const grain = (M - 0.5) * 2;
    const fine = (J - 0.5) * 2;

    // ---- markings ----------------------------------------------------------
    // ventral white: belly, chest, throat — the trunk only, never the limbs,
    // never the brush.
    let white = smoothstep(ul + 0.026, ul - 0.016, y) * (1 - onTail) * (1 - 0.92 * onLimb)
              * smoothstep(-0.15, -0.55, -ny) * 0.6 + smoothstep(ul + 0.010, ul - 0.030, y) * (1 - onTail) * (1 - 0.92 * onLimb) * 0.55;
    white = clamp(white);
    // chest and throat bib, carried up the front of the neck
    const bib = smoothstep(-1.45, -0.70, ha) * smoothstep(-0.15, -0.70, ha) *
                smoothstep(0.92 * W, 0.60 * W, y) * smoothstep(0.62, 0.12, ac * 0.30 + depth);
    white = Math.max(white, clamp(bib * 1.15));
    // white lower muzzle, chin, and the cheek flash beside the nose
    const muzzleWhite = smoothstep(0.34, 0.48, ha) * smoothstep(0.02, -0.10, hb + 0.20 * (ha - 0.5));
    const cheekWhite = smoothstep(0.00, 0.26, ha) * smoothstep(-0.06, -0.22, hb) * smoothstep(0.13, 0.28, ac);
    white = Math.max(white, Math.max(muzzleWhite, cheekWhite) * onHead);
    white = clamp(white + 0.12 * grain * white);

    // black stockings — the whole lower limb, front and back
    let black = onLimb * smoothstep(0.66 * W, 0.44 * W, y);
    black = Math.max(black, onLimb * smoothstep(0.50 * W, 0.30 * W, y));
    // dark tear line from the inner eye down the side of the muzzle
    const tear = smoothstep(0.30, 0.44, ha) * smoothstep(0.66, 0.46, ha) *
                 smoothstep(0.06, 0.14, ac) * smoothstep(0.28, 0.17, ac) *
                 smoothstep(0.16, 0.02, hb);
    black = Math.max(black, tear * 0.9 * onHead);
    const nose = smoothstep(0.90, 0.985, ha) * smoothstep(0.10, -0.04, -hb - 0.02);
    black = Math.max(black, nose);
    black = clamp(black);

    // the brush: rust at the root, grizzled through the middle, white tag
    const tag = smoothstep(0.76, 0.90, tailS) * onTail;
    const brushDark = smoothstep(0.08, 0.40, tailS) * smoothstep(0.92, 0.62, tailS) * onTail;

    // ---- colour ------------------------------------------------------------
    // the saddle: deepest, reddest fur along the spine, hot on the shoulders
    const heat = clamp(0.22 + 0.56 * smoothstep(0.50, 1.05, depth) + 0.14 * grain);
    let r = mix(PALETTE.fire[0], PALETTE.ember[0], heat);
    let g = mix(PALETTE.fire[1], PALETTE.ember[1], heat);
    let b = mix(PALETTE.fire[2], PALETTE.ember[2], heat);
    // the flanks and haunches are the brightest fire-orange on the animal
    const flank = smoothstep(0.70, 0.18, depth) * (1 - onLimb) * (1 - onTail);
    r = mix(r, 0.90, flank * 0.55); g = mix(g, 0.42, flank * 0.55); b = mix(b, 0.11, flank * 0.55);
    // the shoulder and the back of the thigh carry a dark wash
    const bar = smoothstep(0.55, 0.15, Math.abs(x / W - 0.20)) * smoothstep(0.30, 0.72, depth);
    r = mix(r, PALETTE.sable[0], bar * 0.07 * clamp(0.5 + grain));
    g = mix(g, PALETTE.sable[1], bar * 0.07 * clamp(0.5 + grain));
    b = mix(b, PALETTE.sable[2], bar * 0.07 * clamp(0.5 + grain));
    // limbs above the stocking are rusty, not orange
    r = mix(r, PALETTE.rust[0], onLimb * 0.40); g = mix(g, PALETTE.rust[1], onLimb * 0.40); b = mix(b, PALETTE.rust[2], onLimb * 0.40);
    // brush
    r = mix(r, PALETTE.sable[0], brushDark * 0.62);
    g = mix(g, PALETTE.sable[1], brushDark * 0.62);
    b = mix(b, PALETTE.sable[2], brushDark * 0.62);

    r = mix(r, PALETTE.cream[0], white); g = mix(g, PALETTE.cream[1], white); b = mix(b, PALETTE.cream[2], white);
    r = mix(r, PALETTE.soot[0], black); g = mix(g, PALETTE.soot[1], black); b = mix(b, PALETTE.soot[2], black);
    r = mix(r, PALETTE.snow[0], tag);   g = mix(g, PALETTE.snow[1], tag);   b = mix(b, PALETTE.snow[2], tag);
    r = mix(r, PALETTE.ink[0], nose);   g = mix(g, PALETTE.ink[1], nose);   b = mix(b, PALETTE.ink[2], nose);

    // ---- agouti banding ----------------------------------------------------
    // A real guard hair is banded: pale base, dark subterminal band, light tip.
    // Where the band falls comes straight out of the Mandelbrot escape time.
    const banded = clamp((1 - white) * (1 - black) * (1 - tag) * (0.50 + 0.50 * M));
    const tipDark = clamp(0.15 + 0.55 * M) * banded;
    const rr = mix(r, clamp(r * 1.18 + 0.05), 0.30 * banded);
    const gg = mix(g, clamp(g * 1.14 + 0.04), 0.30 * banded);
    const bb = mix(b, clamp(b * 1.10 + 0.03), 0.30 * banded);
    let tr = mix(r, PALETTE.ink[0], tipDark * 0.48);
    let tg = mix(g, PALETTE.ink[1], tipDark * 0.48);
    let tb = mix(b, PALETTE.ink[2], tipDark * 0.48);
    const lift = tag * 0.9 + white * 0.30;
    tr = mix(tr, PALETTE.snow[0], lift); tg = mix(tg, PALETTE.snow[1], lift); tb = mix(tb, PALETTE.snow[2], lift);

    out.r = s2l(clamp(rr)); out.g = s2l(clamp(gg)); out.b = s2l(clamp(bb));
    out.tr = s2l(clamp(tr)); out.tg = s2l(clamp(tg)); out.tb = s2l(clamp(tb));

    // ---- hair length --------------------------------------------------------
    const coat = F.g.coat;
    let len = mix(0.0105, 0.021, coat);
    len = mix(len, 0.0048, smoothstep(-0.20, 0.30, ha) * onHead);
    len = mix(len, 0.0022, smoothstep(0.34, 0.72, ha) * onHead);
    // the cheek ruff
    const ruff = clamp(smoothstep(0.28, -0.30, ha) * smoothstep(-1.30, -0.60, ha) * smoothstep(0.10, 0.30, ac));
    len = mix(len, mix(0.020, 0.036, coat), ruff);
    len = mix(len, 0.0044, onLimb * smoothstep(0.62 * W, 0.30 * W, y));
    len = mix(len, mix(0.046, 0.076, coat), onTail);
    len *= 1 + 0.26 * fine + 0.12 * grain;
    len *= 1 + 0.20 * smoothstep(0.5, 1.0, depth);

    // the eyes and the nose leather are bare
    if (F.eyes) {
      for (const E of F.eyes) {
        const d = Math.hypot(x - E.c.x, y - E.c.y, z - E.c.z);
        len *= smoothstep(F.eyeR * 1.02, F.eyeR * 1.95, d);
      }
    }
    if (F.noseP) {
      const d = Math.hypot(x - F.noseP.x, y - F.noseP.y, z - F.noseP.z);
      len *= smoothstep(0.006, 0.017, d);
    }

    out.len = Math.max(0.0006, len);
    out.stiff = clamp(0.30 + 0.5 * banded + 0.3 * depth);
    out.region = onTail > 0.5 ? 2 : onHead > 0.5 ? 1 : 0;
    return out;
  }

  shade.underline = underline;
  shade.tailCoord = tailCoord;
  shade.limbDist = limbDist;
  return shade;
}

// sacred.js — the constants and closed-form curves that the whole animal is built from.
// Nothing here is sampled from a scan, a texture or a noise table. Every number below
// is derived from phi, pi and sqrt(5), and every shape function is a classical
// closed-form curve of natural morphogenesis.

export const PI    = Math.PI;
export const TAU   = 2 * PI;
export const SQRT5 = Math.sqrt(5);
export const PHI   = (1 + SQRT5) / 2;            // 1.6180339887...
export const IPHI  = 1 / PHI;                    // 0.6180339887... = PHI - 1

// The golden angle: the division of the circle in the golden ratio.
// 2*pi/phi^2 = 137.507764...deg  — the angle every phyllotactic plant on earth uses.
export const GOLDEN_ANGLE = TAU / (PHI * PHI);

// phi^n for any integer n, positive or negative. The whole skeleton is written in this.
export const p = n => Math.pow(PHI, n);

// Binet's formula. Fibonacci numbers straight out of phi, with no recursion.
export const fib = n => Math.round((Math.pow(PHI, n) - Math.pow(-IPHI, n)) / SQRT5);

// Growth constant of the golden logarithmic spiral: r = a * e^(b*theta),
// the spiral that multiplies its radius by phi every quarter turn.
export const GOLDEN_B = Math.log(PHI) / (PI / 2);

// ---------------------------------------------------------------------------
// Gielis' superformula — the single equation that generates starfish, diatoms,
// petals, shells and cross-sections of animals. Used here for every body
// cross-section, the eye aperture and the ear outline.
// ---------------------------------------------------------------------------
export function gielis(theta, m, n1, n2, n3, a = 1, b = 1) {
  const t = m * theta / 4;
  const u = Math.pow(Math.abs(Math.cos(t) / a), n2);
  const v = Math.pow(Math.abs(Math.sin(t) / b), n3);
  return Math.pow(u + v, -1 / n1);
}

// Superellipse (Lame curve) radius at angle theta for exponent n.
export function superellipse(theta, rx, ry, n) {
  const c = Math.abs(Math.cos(theta)), s = Math.abs(Math.sin(theta));
  return Math.pow(Math.pow(c / rx, n) + Math.pow(s / ry, n), -1 / n);
}

// ---------------------------------------------------------------------------
// The Mandelbrot set. Smooth (continuous) escape time, normalised to 0..1.
// This is the only source of texture in the animal: coat variegation, guard-hair
// banding, hair length jitter and iris striation are all read out of this field.
// No noise function, no random(), no image is used anywhere in the pelt.
// ---------------------------------------------------------------------------
export function mandelbrot(cx, cy, maxIter = 64) {
  let zx = 0, zy = 0, i = 0, zz = 0;
  for (; i < maxIter; i++) {
    const x2 = zx * zx, y2 = zy * zy;
    zz = x2 + y2;
    if (zz > 256) break;
    zy = 2 * zx * zy + cy;
    zx = x2 - y2 + cx;
  }
  if (i >= maxIter) return 1;
  // continuous iteration count: nu = n + 1 - log2(log|z|)
  const nu = i + 1 - Math.log(Math.log(Math.sqrt(zz))) / Math.log(2);
  return Math.max(0, Math.min(1, nu / maxIter));
}

// A Julia set of the same family — used for the finer, higher frequency
// grain that rides on top of the Mandelbrot banding.
export function julia(zx0, zy0, cx, cy, maxIter = 32) {
  let zx = zx0, zy = zy0, i = 0, zz = 0;
  for (; i < maxIter; i++) {
    const x2 = zx * zx, y2 = zy * zy;
    zz = x2 + y2;
    if (zz > 256) break;
    zy = 2 * zx * zy + cy;
    zx = x2 - y2 + cx;
  }
  if (i >= maxIter) return 1;
  const nu = i + 1 - Math.log(Math.log(Math.sqrt(zz))) / Math.log(2);
  return Math.max(0, Math.min(1, nu / maxIter));
}

// ---------------------------------------------------------------------------
// Low-discrepancy sequences. Used to place fur so it lands the way seeds land
// on a sunflower head: never clumped, never gridded, no randomness involved.
// ---------------------------------------------------------------------------
export const R1 = 1 / PHI;                                   // 1D golden sequence
export const PLASTIC = 1.324717957244746;                    // rho, real root of x^3 = x + 1
export const R2_A = 1 / PLASTIC;
export const R2_B = 1 / (PLASTIC * PLASTIC);
export const frac = x => x - Math.floor(x);

// The i-th point of the golden-ratio 1D sequence.
export const golden1 = i => frac(0.5 + i * R1);
// The i-th point of the R2 (plastic constant) 2D sequence — the 2D analogue of phi.
export const golden2 = (i, out) => { out[0] = frac(0.5 + i * R2_A); out[1] = frac(0.5 + i * R2_B); return out; };

// Vogel's phyllotaxis map: the exact arrangement of florets in a sunflower.
export const vogel = (i, n, out) => {
  const r = Math.sqrt(i / n), a = i * GOLDEN_ANGLE;
  out[0] = r * Math.cos(a); out[1] = r * Math.sin(a); return out;
};

// Smooth helpers used throughout.
export const clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
export const smoothstep = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };
export const mix = (a, b, t) => a + (b - a) * t;

// sRGB -> linear. Three.js treats vertex colours as already-linear, so every
// colour written into a buffer has to be decoded first or the whole animal
// washes out two stops bright.
export const s2l = c => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

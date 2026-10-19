// sdf.js — exact signed-distance primitives, written as scalar functions so the
// field can be evaluated a few million times without allocating anything.
// Distance is negative inside the animal, zero on the skin, positive outside.

// Tapered capsule (round cone) between a and b with end radii ra, rb. Exact.
export function sdRoundCone(px, py, pz, ax, ay, az, bx, by, bz, ra, rb) {
  const bax = bx - ax, bay = by - ay, baz = bz - az;
  const l2 = bax * bax + bay * bay + baz * baz;
  const rr = ra - rb;
  const a2 = l2 - rr * rr;
  const il2 = 1 / l2;

  const pax = px - ax, pay = py - ay, paz = pz - az;
  const y = pax * bax + pay * bay + paz * baz;
  const z = y - l2;
  const xx = (pax * l2 - bax * y), xy = (pay * l2 - bay * y), xz = (paz * l2 - baz * y);
  const x2 = (xx * xx + xy * xy + xz * xz);
  const y2 = y * y * l2;
  const z2 = z * z * l2;

  const k = Math.sign(rr) * rr * rr * x2;
  if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(Math.max(0, x2 + z2)) * il2 - rb;
  if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(Math.max(0, x2 + y2)) * il2 - ra;
  return (Math.sqrt(Math.max(0, x2 * a2 * il2)) + y * rr) * il2 - ra;
}

// Ellipsoid, bounded approximation (exact enough at the skin).
export function sdEllipsoid(px, py, pz, cx, cy, cz, rx, ry, rz) {
  const x = (px - cx) / rx, y = (py - cy) / ry, z = (pz - cz) / rz;
  const k0 = Math.sqrt(x * x + y * y + z * z);
  if (k0 === 0) return -Math.min(rx, ry, rz);
  const ax = (px - cx) / (rx * rx), ay = (py - cy) / (ry * ry), az = (pz - cz) / (rz * rz);
  const k1 = Math.sqrt(ax * ax + ay * ay + az * az);
  return k0 * (k0 - 1) / k1;
}

// Polynomial smooth minimum. k is the width of the fillet, in metres.
// This is what turns a pile of separate volumes into one continuous living skin.
export function smin(a, b, k) {
  if (k <= 0) return a < b ? a : b;
  const h = Math.max(0, k - Math.abs(a - b)) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

// Smooth subtraction — carves one volume out of another with a soft edge.
export function smax(a, b, k) {
  if (k <= 0) return a > b ? a : b;
  const h = Math.max(0, k - Math.abs(a - b)) / k;
  return Math.max(a, b) + h * h * k * 0.25;
}

// A plane, used to cut the animal off flat at the ground when needed.
export const sdPlaneY = (py, h) => h - py;

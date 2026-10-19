# Vulpes Sacra

A red fox generated entirely from closed-form mathematics. Separate from the
A/B harness in `index.html` / `src/` — nothing there was modified.

```
vulpes.html            the page (dev, ES modules + import map)
src/vulpes/            the generator
dist/                  self-contained builds
build-vulpes.sh        bundles everything into one file
```

## The one measured number

Every dimension descends from the height at the withers, **W**:

| quantity | from φ | at W = 40 cm |
|---|---|---|
| head + body | Wφ | 64.7 cm |
| brush | Wφ/φ | 40.0 cm |
| head | W/φ² | 15.3 cm |
| ear | W/φ³ | 9.4 cm |
| elbow height | W/φ | 24.7 cm |
| wrist height | W/φ³ | 9.4 cm |

Longitudinal stations along the spine are the golden partition of the body
length; joint heights are the golden partition of the withers. Those φ powers
land on real *Vulpes vulpes* morphometrics without being fitted to them.

## How the animal is made

**`sacred.js`** — φ, π, √5, the golden angle (2π/φ² = 137.50776°), Binet's
formula, Gielis' superformula, the golden logarithmic spiral, the Mandelbrot
and Julia escape-time fields, and the R2 low-discrepancy sequence. Everything
downstream is built out of this file. There is no noise function, no texture
and no `random()` anywhere in the project — the same input always grows the
same fox, hair for hair.

**`form.js`** — the skeleton, as the φ cascade above. The brush is an arc of the
golden logarithmic spiral r = a·e^(bθ) with b = ln φ / (π/2), so its radius of
curvature multiplies by φ every quarter turn; its lateral sway is stepped by
the golden angle.

**`field.js`** — an implicit-surface engine. Volumes are generalised
superelliptic segments (Gielis cross-sections swept between two frames) and
ellipsoids, welded with a polynomial smooth-minimum so the result is one
continuous skin rather than a pile of parts. Primitives are binned spatially,
then polygonised with marching cubes on a rectangular lattice; normals come
from the analytic gradient of the field. `surfaceAlong()` ray-marches outward
from inside the skull so the eyes and nose sit on the skin the mathematics
actually produced.

**`vulpes.js`** — the anatomy: trunk, neck, skull, muzzle, jaw, cheek ruff,
limbs and brush, as ~220 blended volumes.

**`coat.js`** — the pelage. Species markings (white throat, black stockings,
white tag, tear lines) are geometric masks. Everything else — coat variegation,
hair length, and the agouti band on each guard hair — is read out of the
Mandelbrot set, sampled just off the main cardioid near (−0.7436, 0.1318) where
the boundary is at its most filigreed.

**`pelt.js`** — 150,000 individual hairs. Each is placed on the skin by the R2
low-discrepancy sequence, the two-dimensional cousin of the golden ratio, so
they land the way seeds land on a sunflower head: evenly, never gridded, never
clumped. Each strand is a tapered prism that leans from the surface normal into
a combing field and then falls under its own weight.

**`face.js`** — the parts too thin for a lattice: lofted ears whose
cross-section is a lens that vanishes at the rim, eyes with a vertical slit
pupil behind a Lamé-superellipse almond aperture, and vibrissae that are arcs
of logarithmic spirals fanned by the golden angle.

## Running it

Development, from this directory:

```bash
python3 -m http.server 8080   # then open http://localhost:8080/vulpes.html
```

No internet needed — Three.js is vendored in `vendor/`.

Single-file build:

```bash
./build-vulpes.sh
```

- `dist/vulpes-standalone.html` — open directly, no server, no network.
- `dist/vulpes-artifact.html` — body fragment for publishing as an Artifact.

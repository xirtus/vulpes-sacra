# Sacred-geometry morphogenesis rig

One measured number per species; everything else out of φ, π and the
Mandelbrot set. Manual: `manual.html`. Prompt: `PROMPT.md`.

```
rig.html                the viewer        ?species=vulpes | ?species=equus
manual.html             the HTML manual
PROMPT.md               the one-shot species prompt
src/rig/                the harness — species-agnostic
src/species/            one file per creature
dist/                   single-file builds
build-rig.sh            bundles the rig + every species
```

## The harness

| module | does |
|---|---|
| `sacred.js` | φ, π, √5, the golden angle, Binet, Gielis' superformula, the golden log spiral, Mandelbrot / Julia escape time, the R2 low-discrepancy sequence |
| `field.js` | superelliptic segments and ellipsoids welded with a smooth-minimum, spatially binned, polygonised by marching cubes with analytic-gradient normals |
| `morph.js` | the author-facing verbs: `trunk`, `chain`, `blob`, `frame`, `limb`, `goldenCurve`, `sweep` — all in anchor units |
| `mask.js` | `ventral`, `dorsal`, `station`, `height`, `onLimb`, `onCurve`, `alongCurve`, `inFrame`, `near`, `lateral`, `facing`, `fractal` + combinators |
| `pelage.js` | compiles a declarative coat into colour, hair length and agouti banding |
| `pelt.js` | strands placed by the R2 sequence, combed by a flow field |
| `loft.js` | lofted shells for ears and anything else too thin for a lattice |
| `stage.js` | light, ground, console, auto-framed views, build order |

Nothing in `src/rig/` knows what a fox is.

## Writing a species

Read `manual.html`, then paste `PROMPT.md` into a fresh session with the
creature named. Add the file to `src/species/`, add one line to the registry in
`src/rig/app.js`, load `?species=<id>`.

**Then stop.** The rig exists so a creature can be produced in one pass; an
hour of nudging numbers by eye destroys the property that made the result
interesting. Fix bugs, not silhouettes.

## Species

| id | animal | anchor | notes |
|---|---|---|---|
| `vulpes` | red fox | withers 40 cm | the baseline |
| `equus` | horse | withers 1.60 m | body length = withers, out of the cascade |
| `mammut` | mastodon | shoulder 2.70 m | trunk and tusks off one spiral |
| `chelonia` | giant tortoise | carapace 1.20 m | no hair; phyllotactic scutes |
| `rana` | frog | snout–vent 9 cm | smallest anchor; wet finish |
| `balaena` | blue whale | length 25 m | no limbs; `medium: 'water'` |
| `salmo` | salmon | fork 90 cm | laterally compressed; seven fins |
| `psittacus` | scarlet macaw | length 86 cm | tail L/φ, body L/φ² |
| `vultur` | Andean condor | wingspan 3.00 m | widest build; spread wings |
| `phoenicopterus` | greater flamingo | standing 1.30 m | nested golden sections; standing on one leg |
| `homo` | a man | standing 1.75 m | the first biped; trunk runs along the standing height |

Anchor units carried a factor of 280 in scale with no change to the rig — and
one orientation flag (`trunk({axis:'y'})`) was enough to stand the same
vocabulary upright on two legs. Four
of the nine found a genuine rig bug; all four fixes landed in `src/rig/`, not
in the spec that found them.

Known limits, in priority order: no feather primitive (a lofted shell is a cup,
right for an ear or a fin and wrong for a wing); no hard edges — everything is
smooth-min welded; grooves are paint, not geometry; one pose per spec. See the
manual's *Where it breaks*.

## Everything offline

`docs/` holds the manual, the prompt, an index, a copy of the sources, and one
self-contained build per species in `docs/models/` — each opens straight off
disk with no server and no network.

## Running

```bash
python3 -m http.server 8080     # http://localhost:8080/rig.html?species=equus
./build-rig.sh                  # dist/rig-<id>-standalone.html — no server, no network
```

Three.js is vendored in `vendor/`.

## Not part of this

`index.html` + `src/` are an earlier A/B harness, untouched.
`vulpes.html` + `src/vulpes/` are the hand-tuned fox that motivated this rig —
kept for comparison, superseded by `src/species/vulpes.js`.

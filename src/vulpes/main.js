import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildForm } from './form.js';
import { buildBody, UNDERLINE } from './vulpes.js';
import { polygonise, surfaceAlong } from './field.js';
import { makeCoat, PALETTE } from './coat.js';
import { buildPelt } from './pelt.js';
import { buildEar, buildEye, buildLid, buildWhiskers } from './face.js';
import { PHI, PI, GOLDEN_ANGLE, clamp, mix, smoothstep, mandelbrot, s2l } from './sacred.js';

// ---------------------------------------------------------------- renderer --
const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.92;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.02, 40);
camera.position.set(1.18, 0.44, 1.26);
const orbit = new OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true; orbit.dampingFactor = 0.06;
orbit.target.set(0.04, 0.25, 0);
orbit.minDistance = 0.18; orbit.maxDistance = 6;

// ------------------------------------------------- procedural environment ---
// A sky built from a cosine gradient and one sun disc — no HDR file.
function makeEnv() {
  const w = 256, h = 128, data = new Uint8Array(w * h * 4);
  for (let j = 0; j < h; j++) {
    const v = j / (h - 1), th = v * PI;
    for (let i = 0; i < w; i++) {
      const u = i / (w - 1), ph = u * 2 * PI;
      const up = Math.cos(th);
      let r, g, b;
      if (up > 0) {                     // sky
        const t = Math.pow(up, 0.55);
        r = mix(0.72, 0.34, t); g = mix(0.78, 0.48, t); b = mix(0.86, 0.72, t);
      } else {                          // ground bounce
        const t = Math.pow(-up, 0.7);
        r = mix(0.60, 0.30, t); g = mix(0.56, 0.27, t); b = mix(0.46, 0.20, t);
      }
      // sun
      const sx = Math.sin(th) * Math.cos(ph), sy = up, sz = Math.sin(th) * Math.sin(ph);
      const d = sx * SUN.x + sy * SUN.y + sz * SUN.z;
      const disc = Math.pow(clamp((d - 0.955) / 0.045), 1.6) * 22 + Math.pow(clamp((d - 0.5) / 0.5), 5) * 1.4;
      r += disc * 1.00; g += disc * 0.92; b += disc * 0.76;
      const o = (j * w + i) * 4;
      data[o] = Math.min(255, r * 255); data[o + 1] = Math.min(255, g * 255);
      data[o + 2] = Math.min(255, b * 255); data[o + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromEquirectangular(tex).texture;
  pmrem.dispose(); tex.dispose();
  return env;
}
const SUN = new THREE.Vector3(0.55, 0.62, 0.56).normalize();
scene.environment = makeEnv();
scene.background = new THREE.Color(0x9aa39c);
scene.fog = new THREE.Fog(0x9aa39c, 2.2, 7.0);

// The page renders in whichever theme the reader is using, so the light the
// animal stands in changes with it.
const PALETTES = {
  dark:  { sky: 0x8d968f, ground: 0x6d7367, exposure: 0.92, near: 2.1, far: 6.8 },
  light: { sky: 0xc6ccc1, ground: 0x9ba392, exposure: 1.02, near: 2.6, far: 8.2 }
};
const darkMQ = matchMedia('(prefers-color-scheme: dark)');
const isDark = () => {
  const t = document.documentElement.dataset.theme;
  return t ? t === 'dark' : darkMQ.matches;
};
function applyTheme() {
  const p = isDark() ? PALETTES.dark : PALETTES.light;
  scene.background.setHex(p.sky);
  scene.fog.color.setHex(p.sky);
  scene.fog.near = p.near; scene.fog.far = p.far;
  renderer.toneMappingExposure = p.exposure;
  if (ground) ground.material.color.setHex(p.ground);
}
darkMQ.addEventListener('change', applyTheme);
new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

const sun = new THREE.DirectionalLight(0xfff0d8, 2.35);
sun.position.copy(SUN).multiplyScalar(3);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -0.7; sun.shadow.camera.right = 0.7;
sun.shadow.camera.top = 0.7; sun.shadow.camera.bottom = -0.7;
sun.shadow.camera.near = 0.5; sun.shadow.camera.far = 6;
sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.004;
scene.add(sun);
scene.add(new THREE.DirectionalLight(0xbfd6ff, 0.30).translateX(-2).translateY(1).translateZ(-2));
scene.add(new THREE.HemisphereLight(0xdfe7e2, 0x4b453a, 0.30));

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(4, 128),
  new THREE.MeshStandardMaterial({ color: 0x7d8175, roughness: 1, metalness: 0 })
);
ground.rotation.x = -PI / 2; ground.receiveShadow = true; scene.add(ground);
applyTheme();

// ------------------------------------------------------------------ build ---
const state = {
  withers: 0.400, lean: 1.00, coat: 0.55,
  strands: 150000, cell: 0.0038,
  fur: true, skin: true, rotate: false
};
let root = null;

const statusEl = document.getElementById('status');
const derivEl = document.getElementById('derivation');
const statsEl = document.getElementById('stats');
const say = t => { statusEl.textContent = t; };
const next = () => new Promise(r => setTimeout(r, 16));

function dispose(o) {
  o.traverse(x => { x.geometry?.dispose?.(); if (x.material) (Array.isArray(x.material) ? x.material : [x.material]).forEach(m => m.dispose?.()); });
}

let building = false;
async function build() {
  if (building) return; building = true;
  const t0 = performance.now();
  say('deriving the skeleton from φ …'); await next();
  const F = buildForm(state);

  say('welding the implicit skin …'); await next();
  const field = buildBody(F);

  say('polygonising the volume …'); await next();
  const mesh = polygonise(field, state.cell);

  say('reading the coat out of the Mandelbrot set …'); await next();
  placeFeatures(field, F);
  const coat = makeCoat(F, UNDERLINE);

  if (root) { scene.remove(root); dispose(root); }
  root = new THREE.Group(); scene.add(root);

  // ---- skin ---------------------------------------------------------------
  const skinGeo = new THREE.BufferGeometry();
  skinGeo.setAttribute('position', new THREE.BufferAttribute(mesh.position, 3));
  skinGeo.setAttribute('normal', new THREE.BufferAttribute(mesh.normal, 3));
  const sc = new Float32Array(mesh.position.length);
  for (let i = 0; i < mesh.position.length; i += 3) {
    const s = coat(mesh.position[i], mesh.position[i + 1], mesh.position[i + 2],
                   mesh.normal[i], mesh.normal[i + 1], mesh.normal[i + 2]);
    sc[i] = s.r * 0.72; sc[i + 1] = s.g * 0.72; sc[i + 2] = s.b * 0.72;
  }
  skinGeo.setAttribute('color', new THREE.BufferAttribute(sc, 3));
  const skinMat = new THREE.MeshPhysicalMaterial({
    vertexColors: true, roughness: 0.92, metalness: 0,
    sheen: 0.35, sheenRoughness: 0.85, sheenColor: new THREE.Color(0xffd9b0), envMapIntensity: 0.40
  });
  const skin = new THREE.Mesh(skinGeo, skinMat);
  skin.name = 'skin'; skin.castShadow = true; skin.receiveShadow = true;
  root.add(skin);

  // ---- ears ---------------------------------------------------------------
  const earMat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.9, metalness: 0, side: THREE.DoubleSide, sheen: 0.4 });
  const earMeshes = [];
  for (const e of F.ears) {
    const built = buildEar(e, F);
    const m = new THREE.Mesh(built.geometry, earMat);
    m.castShadow = true; m.name = 'ear';
    root.add(m); earMeshes.push({ mesh: m, built, ear: e });
  }

  // ---- eyes ---------------------------------------------------------------
  const H = F.face.H, occ = F.spine.occiput, { fwd, up, right } = F.face;
  const h = (a, b, c) => occ.clone().addScaledVector(fwd, a * H).addScaledVector(up, b * H).addScaledVector(right, c * H);
  const eyeMat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.06, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, ior: 1.42 });
  const lidMat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.85, metalness: 0 });
  const eyeR = F.eyeR;
  for (const E of F.eyes) {
    root.add(new THREE.Mesh(buildEye(E.c, E.gaze, E.side, eyeR, F), eyeMat));
    const lid = new THREE.Mesh(buildLid(E.c, E.gaze, E.side, eyeR, E.side * GOLDEN_ANGLE / 8), lidMat);
    lid.castShadow = true; root.add(lid);
  }

  // ---- nose leather -------------------------------------------------------
  const noseMat = new THREE.MeshPhysicalMaterial({ color: 0x0e0a09, roughness: 0.34, clearcoat: 0.55, clearcoatRoughness: 0.22, metalness: 0, envMapIntensity: 0.35 });
  const nose = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), noseMat);
  nose.position.copy(F.noseP);
  nose.scale.set(0.044 * H, 0.036 * H, 0.050 * H);
  nose.castShadow = true; root.add(nose);

  // ---- pelt ---------------------------------------------------------------
  say('growing the pelt, one strand at a time …'); await next();
  const pelt = buildPelt(mesh, coat, F, { count: state.strands, width: 0.00056 });
  const furMat = new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.94, metalness: 0,
    envMapIntensity: 0.30, side: THREE.DoubleSide
  });
  const fur = new THREE.Mesh(pelt.geometry, furMat);
  fur.name = 'fur'; fur.castShadow = true;
  root.add(fur);

  // ---- ear fur ------------------------------------------------------------
  const earFur = buildEarFur(earMeshes, F);
  if (earFur) { earFur.name = 'earfur'; root.add(earFur); }

  // ---- whiskers -----------------------------------------------------------
  const wm = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
  root.add(new THREE.Mesh(buildWhiskers(F), wm));

  // ---- settle onto the ground --------------------------------------------
  const box = new THREE.Box3().setFromObject(root);
  root.position.y -= box.min.y;
  ground.position.y = 0;

  skin.visible = state.skin; fur.visible = state.fur;

  const ms = Math.round(performance.now() - t0);
  say('');
  const cm = v => (v * 100).toFixed(1) + ' cm';
  const rows = [
    ['withers', 'measured', cm(F.W), true],
    ['head + body', 'W\u03c6', cm(F.L)],
    ['brush', 'W\u03c6/\u03c6', cm(F.T)],
    ['head', 'W/\u03c6\u00b2', cm(F.H)],
    ['ear', 'W/\u03c6\u00b3', cm(F.E)],
    ['elbow', 'W/\u03c6', cm(F.Y.elbow)],
    ['wrist', 'W/\u03c6\u00b3', cm(F.Y.carpus)],
    ['ear splay', '2\u03c0/\u03c6\u00b2', (GOLDEN_ANGLE * 180 / PI).toFixed(3) + '\u00b0']
  ];
  derivEl.innerHTML = rows.map(([q, e, v, anchor]) =>
    `<tr${anchor ? ' class="anchor"' : ''}><td>${q}</td><td class="expr">${e}</td><td>${v}</td></tr>`).join('');
  const stats = [
    ['\u03c6', PHI.toFixed(9)],
    ['implicit volumes', field.prims.length],
    ['lattice', mesh.lattice.join(' \u00d7 ')],
    ['skin triangles', mesh.tris.toLocaleString()],
    ['hairs', pelt.strands.toLocaleString()],
    ['built in', ms.toLocaleString() + ' ms']
  ];
  statsEl.innerHTML = stats.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
  building = false;
}

// Put the eyes and the nose on the skin the field actually produced, by
// walking outward from inside the skull until the field changes sign.
function placeFeatures(field, F) {
  const H = F.face.H, occ = F.spine.occiput, { fwd, up, right } = F.face;
  const h = (a, b, c) => occ.clone().addScaledVector(fwd, a * H).addScaledVector(up, b * H).addScaledVector(right, c * H);
  F.eyeR = 0.0335 * H * PHI;
  F.eyes = [];
  for (const s of [-1, 1]) {
    const gaze = fwd.clone().multiplyScalar(0.60).addScaledVector(right, s * 0.70).addScaledVector(up, 0.22).normalize();
    const inner = h(0.470, 0.055, s * 0.045);
    const ps = surfaceAlong(field, inner, gaze, 0.09);
    const c = ps.clone().addScaledVector(gaze, -F.eyeR * 0.90);
    F.eyes.push({ c, gaze, side: s, surface: ps });
  }
  const nd = fwd.clone().multiplyScalar(0.80).addScaledVector(up, -0.60).normalize();
  const nInner = h(0.93, -0.02, 0);
  F.noseP = surfaceAlong(field, nInner, nd, 0.07).addScaledVector(nd, -0.008);
  F.noseD = nd;
}

// fur on the ears, sampled off the ear shells
function buildEarFur(earMeshes, F) {
  const geos = [];
  for (const { built, ear } of earMeshes) {
    const g = built.geometry.toNonIndexed();
    const pos = g.getAttribute('position').array, nor = g.getAttribute('normal').array;
    const fake = { position: pos, normal: nor, tris: pos.length / 9 };
    const shade = makeEarCoat(ear, F, built);
    const r = buildPelt(fake, shade, F, { count: 9000, width: 0.00042 });
    geos.push(r.geometry);
    g.dispose();
  }
  const merged = mergeGeometries(geos);
  if (!merged) return null;
  return new THREE.Mesh(merged, new THREE.MeshPhysicalMaterial({
    vertexColors: true, roughness: 0.94, envMapIntensity: 0.30, side: THREE.DoubleSide
  }));
}

function makeEarCoat(ear, F, built) {
  const up = built.frame.up, fw = built.frame.fw, root = ear.root;
  const out = { r: 0, g: 0, b: 0, tr: 0, tg: 0, tb: 0, len: 0, stiff: 0.6, region: 1 };
  return (x, y, z, nx, ny, nz) => {
    const dx = x - root.x, dy = y - root.y, dz = z - root.z;
    const s = clamp((dx * up.x + dy * up.y + dz * up.z) / ear.height);
    const front = clamp((nx * fw.x + ny * fw.y + nz * fw.z) * 0.5 + 0.5);
    const inside = smoothstep(0.5, 0.85, front);
    const m = mandelbrot(-0.743 + 0.03 * s, 0.1318 + 0.03 * front, 48);
    const rust = [PALETTE.rust[0], PALETTE.rust[1], PALETTE.rust[2]];
    const back = [mix(rust[0], PALETTE.ink[0], smoothstep(0.05, 0.5, s)),
                  mix(rust[1], PALETTE.ink[1], smoothstep(0.05, 0.5, s)),
                  mix(rust[2], PALETTE.ink[2], smoothstep(0.05, 0.5, s))];
    const c = [mix(back[0], PALETTE.snow[0], inside), mix(back[1], PALETTE.snow[1], inside), mix(back[2], PALETTE.snow[2], inside)];
    const k = 0.9 + 0.2 * m;
    out.r = s2l(clamp(c[0] * k)); out.g = s2l(clamp(c[1] * k)); out.b = s2l(clamp(c[2] * k));
    out.tr = s2l(clamp(mix(c[0] * k, PALETTE.snow[0], inside * 0.5)));
    out.tg = s2l(clamp(mix(c[1] * k, PALETTE.snow[1], inside * 0.5)));
    out.tb = s2l(clamp(mix(c[2] * k, PALETTE.snow[2], inside * 0.5)));
    out.len = mix(0.004, 0.014, inside) * (1 - 0.55 * s) * (0.85 + 0.3 * m);
    return out;
  };
}

function mergeGeometries(list) {
  if (!list.length) return null;
  let vc = 0, ic = 0;
  for (const g of list) { vc += g.getAttribute('position').count; ic += g.index.count; }
  const pos = new Float32Array(vc * 3), nor = new Float32Array(vc * 3), col = new Uint8Array(vc * 3);
  const idx = new Uint32Array(ic);
  let vo = 0, io = 0;
  for (const g of list) {
    const p = g.getAttribute('position').array, n = g.getAttribute('normal').array, c = g.getAttribute('color').array;
    pos.set(p, vo * 3); nor.set(n, vo * 3); col.set(c, vo * 3);
    const gi = g.index.array;
    for (let i = 0; i < gi.length; i++) idx[io + i] = gi[i] + vo;
    vo += g.getAttribute('position').count; io += gi.length;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3, true));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  out.computeBoundingSphere();
  return out;
}

// -------------------------------------------------------------------- ui ----
const SPECS = [
  ['withers', 'withers', 0.30, 0.50, 0.005, v => v.toFixed(3) + 'm'],
  ['lean', 'leanness', 0.85, 1.15, 0.01, v => v.toFixed(2)],
  ['coat', 'winter coat', 0.0, 1.0, 0.01, v => v.toFixed(2)],
  ['strands', 'hairs', 20000, 260000, 5000, v => (v / 1000) + 'k'],
  ['cell', 'lattice', 0.0028, 0.0075, 0.0002, v => (v * 1000).toFixed(1) + 'mm']
];
const ctl = document.getElementById('controls');
for (const [k, label, min, max, step, fmt] of SPECS) {
  const row = document.createElement('div'); row.className = 'row';
  const id = 'c_' + k;
  const l = document.createElement('label'); l.textContent = label; l.htmlFor = id;
  const inp = document.createElement('input');
  inp.type = 'range'; inp.id = id; inp.min = min; inp.max = max; inp.step = step; inp.value = state[k];
  const val = document.createElement('output'); val.htmlFor = id;
  val.textContent = fmt(state[k]);
  let timer = null;
  inp.oninput = () => {
    state[k] = +inp.value; val.textContent = fmt(state[k]);
    clearTimeout(timer); timer = setTimeout(build, 300);
  };
  row.append(l, inp, val); ctl.append(row);
}

const VIEWS = [
  [1.18, 0.44, 1.26, 0.04, 0.25, 0, 30],   // three-quarter
  [0.30, 0.42, 1.52, 0.00, 0.24, 0, 30],   // broadside
  [0.86, 0.52, 0.66, 0.30, 0.42, 0, 24],   // head
  [-0.95, 0.48, 1.05, -0.10, 0.26, 0, 30], // from behind, over the brush
  [1.55, 0.30, 0.25, 0.10, 0.24, 0, 26]    // low, head on
];
let viewIdx = 0;

document.getElementById('bFur').onclick = e => { state.fur = !state.fur; root.getObjectByName('fur').visible = state.fur; const ef = root.getObjectByName('earfur'); if (ef) ef.visible = state.fur; e.target.classList.toggle('off', !state.fur); };
document.getElementById('bSkin').onclick = e => { state.skin = !state.skin; root.getObjectByName('skin').visible = state.skin; e.target.classList.toggle('off', !state.skin); };
document.getElementById('bSpin').onclick = e => { state.rotate = !state.rotate; e.target.classList.toggle('off', !state.rotate); };
document.getElementById('bView').onclick = () => {
  viewIdx = (viewIdx + 1) % VIEWS.length;
  const [px, py, pz, tx, ty, tz, fov] = VIEWS[viewIdx];
  camera.position.set(px, py, pz);
  orbit.target.set(tx, ty, tz);
  camera.fov = fov; camera.updateProjectionMatrix();
};

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = clock.getDelta();
  if (root && state.rotate) root.rotation.y += dt * 0.28;
  orbit.update();
  renderer.render(scene, camera);
});

build().catch(e => { say('build failed: ' + e.message); console.error(e); window.__err = e.stack || String(e); });
window.__fox = { build, state, scene, camera, renderer, orbit, sun,
  view(px, py, pz, tx, ty, tz, fov) {
    camera.position.set(px, py, pz);
    orbit.target.set(tx, ty, tz);
    if (fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
  },
  get root() { return root; } };

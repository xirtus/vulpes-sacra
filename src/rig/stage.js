// stage.js — everything that is the same for every animal: the light it stands
// in, the ground it stands on, the console, and the order the build runs in.
// A species spec supplies form; the stage supplies the world.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Morph } from './morph.js';
import { polygonise, surfaceAlong } from './field.js';
import { makePelage } from './pelage.js';
import { buildPelt } from './pelt.js';
import { loftShell } from './loft.js';
import { PHI, PI, GOLDEN_ANGLE, clamp, mix } from './sacred.js';

export function run(spec) {
  // ---------------------------------------------------------------- render --
  const app = document.getElementById('app');
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  app.appendChild(renderer.domElement);

  // Land animals stand in a field; water animals hang in open water, with no
  // ground plane and the light falling from above through it.
  const WATER = spec.medium === 'water';

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight,
    spec.anchor.value * 0.004, spec.anchor.value * 120);
  const orbit = new OrbitControls(camera, renderer.domElement);
  orbit.enableDamping = true; orbit.dampingFactor = 0.06;

  const SUN = new THREE.Vector3(0.55, 0.62, 0.56).normalize();
  scene.environment = makeEnv(renderer, SUN);
  scene.background = new THREE.Color(0x8d968f);
  scene.fog = new THREE.Fog(0x8d968f, 4, 16);

  const sun = new THREE.DirectionalLight(0xfff0d8, 2.35);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  scene.add(sun);
  scene.add(sun.target);
  const fill = new THREE.DirectionalLight(0xbfd6ff, 0.30);
  fill.position.set(-2, 1, -2); scene.add(fill);
  scene.add(new THREE.HemisphereLight(0xdfe7e2, 0x4b453a, 0.30));

  const ground = new THREE.Mesh(new THREE.CircleGeometry(1, 128),
    new THREE.MeshStandardMaterial({ color: 0x6d7367, roughness: 1 }));
  ground.rotation.x = -PI / 2; ground.receiveShadow = true;
  if (!WATER) scene.add(ground);

  const PALETTES = WATER ? {
    dark: { sky: 0x123043, ground: 0x0a1b26, exposure: 1.00 },
    light: { sky: 0x2b6b8c, ground: 0x1c4a63, exposure: 1.06 }
  } : {
    dark: { sky: 0x8d968f, ground: 0x6d7367, exposure: 0.92 },
    light: { sky: 0xc6ccc1, ground: 0x9ba392, exposure: 1.02 }
  };
  const darkMQ = matchMedia('(prefers-color-scheme: dark)');
  const isDark = () => {
    const t = document.documentElement.dataset.theme;
    return t ? t === 'dark' : darkMQ.matches;
  };
  function applyTheme() {
    const p = isDark() ? PALETTES.dark : PALETTES.light;
    scene.background.setHex(p.sky); scene.fog.color.setHex(p.sky);
    renderer.toneMappingExposure = p.exposure;
    ground.material.color.setHex(p.ground);
    if (WATER) { sun.intensity = 2.9; fill.intensity = 0.55; }
  }
  darkMQ.addEventListener('change', applyTheme);
  new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  applyTheme();

  // ----------------------------------------------------------------- state --
  const state = { [spec.anchor.key]: spec.anchor.value, strands: spec.pelt?.count ?? 120000,
    cell: spec.lattice ?? 0.010, fur: true, skin: true, rotate: false };
  for (const p of spec.params ?? []) state[p.key] = p.value;

  let root = null, building = false;
  const statusEl = document.getElementById('status');
  const say = t => { statusEl.textContent = t; };
  const nextTick = () => new Promise(r => setTimeout(r, 16));
  const dispose = o => o.traverse(x => {
    x.geometry?.dispose?.();
    if (x.material) (Array.isArray(x.material) ? x.material : [x.material]).forEach(m => m.dispose?.());
  });

  async function build() {
    if (building) return; building = true;
    const t0 = performance.now();
    const W = state[spec.anchor.key];
    const g = { ...state };

    say('deriving the skeleton from φ …'); await nextTick();
    const M = new Morph(W, g);
    const D = spec.derive ? spec.derive(W, g) : {};

    say('welding the implicit skin …'); await nextTick();
    spec.body(M, D, W, g);
    const field = M.bake();

    say('polygonising the volume …'); await nextTick();
    const cell = state.cell * W;
    const mesh = polygonise(field, cell);

    say('reading the coat out of the Mandelbrot set …'); await nextTick();
    const shade = makePelage(M, spec.coat(M, D, W, g), D);

    if (root) { scene.remove(root); dispose(root); }
    root = new THREE.Group(); scene.add(root);

    // skin
    const skinGeo = new THREE.BufferGeometry();
    skinGeo.setAttribute('position', new THREE.BufferAttribute(mesh.position, 3));
    skinGeo.setAttribute('normal', new THREE.BufferAttribute(mesh.normal, 3));
    const sc = new Float32Array(mesh.position.length);
    // a furred animal's skin is only ever glimpsed between hairs, so it is
    // painted down; a bare-skinned one is what you actually see
    const tint = spec.finish?.skinTint ?? ((spec.pelt?.count ?? 1) > 0 ? 0.74 : 1.0);
    for (let i = 0; i < mesh.position.length; i += 3) {
      const s = shade(mesh.position[i], mesh.position[i + 1], mesh.position[i + 2],
                      mesh.normal[i], mesh.normal[i + 1], mesh.normal[i + 2]);
      sc[i] = s.r * tint; sc[i + 1] = s.g * tint; sc[i + 2] = s.b * tint;
    }
    skinGeo.setAttribute('color', new THREE.BufferAttribute(sc, 3));
    const fin = spec.finish ?? {};
    const skin = new THREE.Mesh(skinGeo, new THREE.MeshPhysicalMaterial({
      vertexColors: true, metalness: 0,
      roughness: fin.roughness ?? 0.92,
      clearcoat: fin.clearcoat ?? 0,
      clearcoatRoughness: fin.clearcoatRoughness ?? 0.25,
      sheen: fin.sheen ?? 0.35,
      sheenRoughness: 0.85, sheenColor: new THREE.Color(fin.sheenColor ?? 0xffd9b0),
      envMapIntensity: fin.envMapIntensity ?? 0.40
    }));
    skin.name = 'skin'; skin.castShadow = skin.receiveShadow = true;
    root.add(skin);

    // appendages
    const shells = [];
    for (const a of (spec.appendages ? spec.appendages(M, D, W, g) : [])) {
      const built = loftShell({ ...a, scale: W }, spec.palette ?? {});
      const m = new THREE.Mesh(built.geometry, new THREE.MeshPhysicalMaterial({
        vertexColors: true, roughness: 0.9, side: THREE.DoubleSide, envMapIntensity: 0.35
      }));
      m.castShadow = true; m.name = 'shell';
      root.add(m); shells.push(built);
    }

    // extras a species may want on the surface (nose leather, hooves, horn)
    if (spec.extras) for (const e of spec.extras(M, D, W, g, field, surfaceAlong)) root.add(e);

    // pelt — a species with pelt.count 0 is bare-skinned and skips it entirely
    let pelt = { strands: 0 };
    const furMat = new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 0.94, metalness: 0, envMapIntensity: 0.30, side: THREE.DoubleSide
    });
    if (state.strands > 0) {
      say('growing the pelt, one strand at a time …'); await nextTick();
      pelt = buildPelt(mesh, shade, M, spec.flow ?? {},
        { count: state.strands, width: spec.pelt?.width ?? 0.0014 });
      const fur = new THREE.Mesh(pelt.geometry, furMat);
      fur.name = 'fur'; fur.castShadow = true;
      root.add(fur);
    }

    // fur on the appendages
    let shellStrands = 0;
    if (shells.length && (spec.pelt?.shellCount ?? 0) > 0) {
      const geos = [];
      for (const sh of shells) {
        const ni = sh.geometry.toNonIndexed();
        const pa = ni.getAttribute('position').array, na = ni.getAttribute('normal').array;
        const r = buildPelt({ position: pa, normal: na, tris: pa.length / 9 }, sh.shade, M,
          spec.flow ?? {}, { count: spec.pelt?.shellCount ?? 8000, width: (spec.pelt?.width ?? 0.0014) * 0.75 });
        geos.push(r.geometry); shellStrands += r.strands; ni.dispose();
      }
      const merged = mergeGeoms(geos);
      if (merged) { const m = new THREE.Mesh(merged, furMat); m.name = 'shellfur'; root.add(m); }
    }

    // settle onto the ground and frame it
    const box = new THREE.Box3().setFromObject(root);
    root.position.y -= WATER ? (box.min.y + box.max.y) * 0.5 - W * 0.5 : box.min.y;
    // the light rig is anchored to the animal, so a mouse and a horse are lit
    // and shadowed identically
    const span = Math.max(box.max.x - box.min.x, box.max.z - box.min.z, W * 2) * 0.75;
    sun.position.copy(SUN).multiplyScalar(span * 6);
    sun.target.position.set(0, W * 0.5, 0);
    sun.shadow.camera.left = -span * 1.5; sun.shadow.camera.right = span * 1.5;
    sun.shadow.camera.top = span * 1.5; sun.shadow.camera.bottom = -span * 1.5;
    sun.shadow.camera.near = span * 2; sun.shadow.camera.far = span * 12;
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = W * 0.006;
    sun.shadow.camera.updateProjectionMatrix();
    ground.scale.setScalar(Math.max(span * 14, W * 12));
    scene.fog.near = span * 5; scene.fog.far = span * 20;
    const b2 = new THREE.Box3().setFromObject(root);
    const sph = b2.getBoundingSphere(new THREE.Sphere());
    fit = { c: sph.center.clone(), r: sph.radius, lo: b2.min.y, h: b2.max.y - b2.min.y };
    setView(first ? 0 : viewIdx); first = false;

    skin.visible = state.skin;
    for (const n of ['fur', 'shellfur']) { const o = root.getObjectByName(n); if (o) o.visible = state.fur; }

    report(D, field, mesh, pelt.strands + shellStrands, Math.round(performance.now() - t0), W);
    building = false;
  }

  // ------------------------------------------------------------------ views --
  // Views are DIRECTIONS, not positions. The distance is fitted to the animal
  // the spec actually produced, so a new species frames correctly first time
  // whether it is a mouse or a moose.
  const VIEWS = spec.views ?? [{ dir: [1.5, 0.55, 1.6] }];
  let viewIdx = 0, first = true, fit = null;
  function setView(i) {
    if (!fit) return;
    const v = VIEWS[i];
    const fov = v.fov ?? 30;
    const look = v.look
      ? new THREE.Vector3(fit.c.x + v.look[0] * fit.r, fit.lo + v.look[1] * fit.h, v.look[2] * fit.r)
      : fit.c.clone();
    const zoom = v.zoom ?? 1;
    const asp = Math.max(0.6, innerWidth / innerHeight);
    const half = Math.max(fit.r, fit.r / asp);
    const dist = (half / Math.sin(fov * PI / 360)) * 0.72 * zoom;
    const d = new THREE.Vector3(...v.dir).normalize();
    camera.position.copy(look).addScaledVector(d, dist);
    orbit.target.copy(look);
    camera.fov = fov; camera.updateProjectionMatrix();
  }

  // ------------------------------------------------------------------ panel --
  document.getElementById('title').textContent = spec.title;
  document.getElementById('eyebrow').textContent = spec.binomial;
  document.getElementById('lede').innerHTML = spec.blurb;

  const SPECS = [
    { key: spec.anchor.key, label: spec.anchor.label, min: spec.anchor.min, max: spec.anchor.max,
      step: spec.anchor.step ?? 0.005, fmt: v => v.toFixed(3) + ' m' },
    ...(spec.params ?? []),
    ...((spec.pelt?.count ?? 1) > 0
      ? [{ key: 'strands', label: 'hairs', min: 20000, max: 300000, step: 5000, fmt: v => (v / 1000) + 'k' }]
      : []),
    { key: 'cell', label: 'lattice', min: 0.006, max: 0.024, step: 0.0005,
      fmt: v => (v * state[spec.anchor.key] * 1000).toFixed(1) + ' mm' }
  ];
  const ctl = document.getElementById('controls');
  for (const s of SPECS) {
    const row = document.createElement('div'); row.className = 'row';
    const id = 'c_' + s.key;
    const l = document.createElement('label'); l.textContent = s.label; l.htmlFor = id;
    const inp = document.createElement('input');
    inp.type = 'range'; inp.id = id; inp.min = s.min; inp.max = s.max; inp.step = s.step; inp.value = state[s.key];
    const val = document.createElement('output'); val.htmlFor = id;
    const fmt = s.fmt ?? (v => v.toFixed(2));
    val.textContent = fmt(state[s.key]);
    let timer = null;
    inp.oninput = () => {
      state[s.key] = +inp.value; val.textContent = fmt(state[s.key]);
      clearTimeout(timer); timer = setTimeout(build, 300);
    };
    row.append(l, inp, val); ctl.append(row);
  }

  const derivEl = document.getElementById('derivation');
  const statsEl = document.getElementById('stats');
  function report(D, field, mesh, hairs, ms, W) {
    const rows = [[spec.anchor.label, 'measured', fmtLen(W), true], ...(D.table ?? [])];
    derivEl.innerHTML = rows.map(([q, e, v, anchor]) =>
      `<tr${anchor ? ' class="anchor"' : ''}><td>${q}</td><td class="expr">${e}</td><td>${typeof v === 'number' ? fmtLen(v) : v}</td></tr>`).join('');
    statsEl.innerHTML = [
      ['φ', PHI.toFixed(9)],
      ['implicit volumes', field.prims.length],
      ['lattice', mesh.lattice.join(' × ')],
      ['skin triangles', mesh.tris.toLocaleString()],
      ['hairs', hairs.toLocaleString()],
      ['built in', ms.toLocaleString() + ' ms']
    ].map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
    say('');
  }
  const fmtLen = v => v >= 1 ? v.toFixed(2) + ' m' : (v * 100).toFixed(1) + ' cm';

  document.getElementById('bFur').onclick = e => {
    state.fur = !state.fur;
    for (const n of ['fur', 'shellfur']) { const o = root.getObjectByName(n); if (o) o.visible = state.fur; }
    e.target.classList.toggle('off', !state.fur);
  };
  document.getElementById('bSkin').onclick = e => {
    state.skin = !state.skin;
    root.getObjectByName('skin').visible = state.skin;
    e.target.classList.toggle('off', !state.skin);
  };
  document.getElementById('bView').onclick = () => { viewIdx = (viewIdx + 1) % VIEWS.length; setView(viewIdx); };
  document.getElementById('bSpin').onclick = e => { state.rotate = !state.rotate; e.target.classList.toggle('off', !state.rotate); };

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
  window.__rig = { build, state, scene, camera, renderer, orbit, setView, get root() { return root; } };
}

// A sky from a cosine gradient and one sun disc — no HDR file, no network.
function makeEnv(renderer, SUN) {
  const w = 256, h = 128, data = new Uint8Array(w * h * 4);
  for (let j = 0; j < h; j++) {
    const th = (j / (h - 1)) * PI;
    for (let i = 0; i < w; i++) {
      const ph = (i / (w - 1)) * 2 * PI, up = Math.cos(th);
      let r, g, b;
      if (up > 0) { const t = Math.pow(up, 0.55); r = mix(0.72, 0.34, t); g = mix(0.78, 0.48, t); b = mix(0.86, 0.72, t); }
      else { const t = Math.pow(-up, 0.7); r = mix(0.60, 0.30, t); g = mix(0.56, 0.27, t); b = mix(0.46, 0.20, t); }
      const d = Math.sin(th) * Math.cos(ph) * SUN.x + up * SUN.y + Math.sin(th) * Math.sin(ph) * SUN.z;
      const disc = Math.pow(clamp((d - 0.955) / 0.045), 1.6) * 22 + Math.pow(clamp((d - 0.5) / 0.5), 5) * 1.4;
      const o = (j * w + i) * 4;
      data[o] = Math.min(255, (r + disc) * 255); data[o + 1] = Math.min(255, (g + disc * 0.92) * 255);
      data[o + 2] = Math.min(255, (b + disc * 0.76) * 255); data[o + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace; tex.needsUpdate = true;
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromEquirectangular(tex).texture;
  pm.dispose(); tex.dispose();
  return env;
}

function mergeGeoms(list) {
  if (!list.length) return null;
  let vc = 0, ic = 0;
  for (const g of list) { vc += g.getAttribute('position').count; ic += g.index.count; }
  const pos = new Float32Array(vc * 3), nor = new Float32Array(vc * 3), col = new Uint8Array(vc * 3);
  const idx = new Uint32Array(ic);
  let vo = 0, io = 0;
  for (const g of list) {
    pos.set(g.getAttribute('position').array, vo * 3);
    nor.set(g.getAttribute('normal').array, vo * 3);
    col.set(g.getAttribute('color').array, vo * 3);
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

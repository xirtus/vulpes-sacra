// app.js — pick a species and grow it. ?species=equus
import { run } from './stage.js';

const SPECIES = {
  vulpes:   () => import('../species/vulpes.js'),
  equus:    () => import('../species/equus.js'),
  mammut:   () => import('../species/mammut.js'),
  chelonia: () => import('../species/chelonia.js'),
  rana:     () => import('../species/rana.js'),
  balaena:  () => import('../species/balaena.js'),
  salmo:    () => import('../species/salmo.js'),
  psittacus:() => import('../species/psittacus.js'),
  vultur:   () => import('../species/vultur.js'),
  phoenicopterus: () => import('../species/phoenicopterus.js'),
  homo: () => import('../species/homo.js')
};

// a bundled single-file build pins its species; the dev page uses ?species=
const want = window.__species || new URLSearchParams(location.search).get('species') || 'vulpes';
const load = SPECIES[want] ?? SPECIES.vulpes;
load().then(m => run(m.default)).catch(e => {
  document.getElementById('status').textContent = 'could not load species "' + want + '": ' + e.message;
  console.error(e);
});

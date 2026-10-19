import * as THREE from 'three';
function line(points,color){const g=new THREE.BufferGeometry().setFromPoints(points);return new THREE.Line(g,new THREE.LineBasicMaterial({color,transparent:true,opacity:.86}));}
export function buildDebug(a,emitters){
  const root=new THREE.Group();root.name='debug_anatomy';
  const cyan=0x40e8ff, mag=0xff4fba, gold=0xffcc43;
  root.add(line(Object.values(a.midline),cyan));root.add(line(a.tailPts,gold));
  for(const leg of [a.L,a.R]){
    root.add(line([leg.scapula,leg.shoulder,leg.elbow,leg.carpus,leg.forePaw],cyan));
    root.add(line([leg.hip,leg.stifle,leg.hock,leg.hindPaw],cyan));
  }
  const sm=new THREE.MeshBasicMaterial({color:mag,wireframe:true,transparent:true,opacity:.2});
  for(const e of emitters){
    if(e.kind==='lobe'){
      const m=new THREE.Mesh(new THREE.SphereGeometry(e.r,10,7),sm);m.position.copy(e.p);root.add(m);
    }
  }
  return root;
}

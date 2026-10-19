import * as THREE from 'three';
import {MarchingCubes} from 'three/addons/objects/MarchingCubes.js';
const ORANGE=new THREE.Color(0xb9501b), CREAM=new THREE.Color(0xd7b692), DARK=new THREE.Color(0x241713), GREY=new THREE.Color(0x735c4e);

export class TissueField{
  constructor(a,g,{resolution=88}={}){
    this.a=a;this.g=g;this.side=1.50;this.center=new THREE.Vector3(.04,.39,0);
    this.material=new THREE.MeshPhysicalMaterial({vertexColors:true,roughness:.86,metalness:0,clearcoat:.02,sheen:.22,sheenRoughness:.86});
    this.skin=new MarchingCubes(resolution,this.material,false,true,600000);this.skin.name='implicit_skin';this.skin.isolation=82;this.skin.scale.setScalar(this.side);this.skin.position.copy(this.center);this.skin.castShadow=this.skin.receiveShadow=true;this.emitters=[];
  }
  norm(p){return p.clone().sub(this.center).divideScalar(this.side).addScalar(.5)}
  ball(p,r,color=ORANGE,weight=1){const subtract=12,rn=r/this.side,strength=rn*rn*(this.skin.isolation+subtract)*weight,q=this.norm(p);this.skin.addBall(q.x,q.y,q.z,strength,subtract,color)}
  capsule(a,b,r0,r1,color=ORANGE,n=8,weight=1){for(let i=0;i<n;i++){const t=i/(n-1);this.ball(a.clone().lerp(b,t),THREE.MathUtils.lerp(r0,r1,t),color,weight)}this.emitters.push({kind:'capsule',a:a.clone(),b:b.clone(),r0,r1,color})}
  lobe(p,r,color=ORANGE,weight=1){this.ball(p,r,color,weight);this.emitters.push({kind:'lobe',p:p.clone(),r,color})}
  build(){
    const {a,g}=this,W=a.W,m=a.midline,tone=.90+.18*g.muscleTone,lean=g.bodyLeanness;
    this.skin.reset();this.emitters=[];
    // Axial body: rib cage -> waist -> pelvis, intentionally not one sausage.
    this.capsule(m.withers,m.thoracic,W*.205/lean,W*.235/lean,ORANGE,10,.93);
    this.capsule(m.thoracic,m.lumbar,W*.225/lean,W*.165/lean,ORANGE,10,.92);
    this.capsule(m.lumbar,m.sacrum,W*.165,W*.19,ORANGE,8,.92);
    this.lobe(m.withers.clone().add(new THREE.Vector3(.018,-W*.07,0)),W*.205,ORANGE,.56); // rib cage
    this.lobe(m.sacrum.clone().add(new THREE.Vector3(-W*.02,-W*.04,0)),W*.165,ORANGE,.64); // pelvis/gluteals
    // Dorsal muscle chain and belly tuck.
    this.capsule(m.c3,m.lumbar,W*.075,W*.065,ORANGE,14,.34);
    this.capsule(m.thoracic.clone().add(new THREE.Vector3(0,-W*.13,0)),m.lumbar.clone().add(new THREE.Vector3(0,-W*.10,0)),W*.09,W*.065,CREAM,8,.32);
    // Neck and head wedge.
    this.capsule(m.occiput,m.c3,W*.105,W*.14,ORANGE,8,.84);
    this.capsule(m.c3,m.withers,W*.14,W*.18,ORANGE,8,.75);
    this.lobe(m.cranium,W*.145,ORANGE,.79);
    this.capsule(m.cranium,m.rostrum,W*.108,W*.078,ORANGE,7,.72);
    this.capsule(m.rostrum,m.nose,W*.078,W*.043,CREAM,8,.73);
    this.lobe(m.rostrum.clone().add(new THREE.Vector3(0,-W*.04,0)),W*.082,CREAM,.48);
    // Throat/chest ruff.
    this.capsule(m.occiput.clone().add(new THREE.Vector3(-W*.01,-W*.055,0)),m.withers.clone().add(new THREE.Vector3(-W*.01,-W*.15,0)),W*.085,W*.13,CREAM,8,.38);

    for(const leg of [a.L,a.R]){
      // Forequarter: scapular mass, deltoid/triceps, narrow distal limb.
      this.capsule(leg.scapula,leg.shoulder,W*.085*tone,W*.095*tone,ORANGE,6,.70);
      this.lobe(leg.shoulder.clone().lerp(leg.elbow,.30),W*.097*tone,ORANGE,.48);
      this.capsule(leg.shoulder,leg.elbow,W*.086*tone,W*.057,ORANGE,8,.72);
      this.capsule(leg.elbow,leg.carpus,W*.054,W*.032,DARK,9,.70);
      this.capsule(leg.carpus,leg.forePaw,W*.032,W*.041,DARK,7,.72);
      this.lobe(leg.forePaw.clone().add(new THREE.Vector3(-W*.04,.010,0)),W*.052,DARK,.58);
      // Hindquarter: gluteal / hamstring / quadriceps mass, long hock.
      this.lobe(leg.hip.clone().add(new THREE.Vector3(-W*.015,-W*.005,0)),W*.122*tone,ORANGE,.57);
      this.capsule(leg.hip,leg.stifle,W*.105*tone,W*.078*tone,ORANGE,8,.78);
      this.lobe(leg.hip.clone().lerp(leg.stifle,.43).add(new THREE.Vector3(-W*.025,0,0)),W*.098*tone,ORANGE,.42);
      this.capsule(leg.stifle,leg.hock,W*.071,W*.036,ORANGE,9,.68);
      this.capsule(leg.hock,leg.hindPaw,W*.034,W*.040,DARK,8,.70);
      this.lobe(leg.hindPaw.clone().add(new THREE.Vector3(-W*.035,.010,0)),W*.052,DARK,.56);
    }
    // Brush tail: skin core is slimmer than final fur silhouette.
    const tp=a.tailPts,rs=[W*.075,W*.105,W*.115,W*.09,W*.045].map(r=>r*(.92+.16*g.winterCoat));
    for(let i=0;i<tp.length-1;i++)this.capsule(tp[i],tp[i+1],rs[i],rs[i+1],i===tp.length-2?CREAM:GREY,7,.64);
    this.skin.update();return this.skin;
  }
}

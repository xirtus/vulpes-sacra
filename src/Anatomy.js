import * as THREE from 'three';
import {PHI,GOLDEN_ANGLE} from './Genome.js';
const V=(x,y,z=0)=>new THREE.Vector3(x,y,z);

function sideEmpirical(s,W,body,g){
  const zf=W*.165, zh=W*.17, ground=.018;
  // Digigrade canid stance. Points are joint centres, not visible silhouette corners.
  return {
    scapula:V(-body*.205,W*.84,s*zf*.78),
    shoulder:V(-body*.235,W*.665,s*zf),
    elbow:V(-body*.182,W*.405*g.legScale,s*zf*1.02),
    carpus:V(-body*.226,W*.135*g.legScale,s*zf*.94),
    forePaw:V(-body*.294,ground,s*zf*.94),
    hip:V(body*.255,W*.705,s*zh),
    stifle:V(body*.135,W*.405*g.legScale,s*zh*1.04),
    hock:V(body*.315,W*.175*g.legScale,s*zh),
    hindPaw:V(body*.235,ground,s*zh*.97)
  };
}

function empirical(g){
  const W=g.withers;
  const body=.68;
  const tail=.386*g.tailScale;
  const head=.178*g.headScale;
  const noseX=-body*.61, rumpX=body*.39;
  const m={
    nose:V(noseX-head*.12,W*.715),
    rostrum:V(noseX+head*.22,W*.75),
    cranium:V(noseX+head*.66,W*.82),
    occiput:V(noseX+head*.94,W*.805),
    c3:V(-body*.29,W*.805),
    withers:V(-body*.205,W*.91),
    thoracic:V(-body*.02,W*.845),
    lumbar:V(body*.185,W*.815),
    sacrum:V(rumpX,W*.785)
  };
  const L=sideEmpirical(1,W,body,g),R=sideEmpirical(-1,W,body,g);
  const base=m.sacrum.clone().add(V(.015,-.012,0));
  const tailPts=[base,V(base.x+tail*.22,base.y-.02,.004),V(base.x+tail*.48,base.y-.075,.008),V(base.x+tail*.76,base.y-.155,.012),V(base.x+tail,Math.max(.075,base.y-.24),.016)];
  const earH=W*.235*g.earScale;
  const ears=[-1,1].map(s=>({root:V(m.cranium.x+.003,m.cranium.y+W*.035,s*W*.095),tip:V(m.cranium.x+.012,m.cranium.y+earH,s*W*.122)}));
  applyAsymmetry({m,L,R,tailPts,ears},g);
  return {mode:'A',W,body,tail,head,ground:.018,midline:m,L,R,tailPts,ears};
}

function sacred(g){
  const W=g.withers;
  // 100% harmonic construction: the withers height is the sole empirical scale anchor.
  // Lengths and segment stations are derived from powers/partitions of phi.
  const body=W*PHI*g.bodyLeanness**-.08;
  const tail=(body/PHI)*g.tailScale;          // = W when body = W*phi
  const head=(W/(PHI*PHI))*g.headScale;
  const ground=.018;
  const noseX=-body/PHI, rumpX=body*(1-1/PHI);
  const yBack=W*(1-1/PHI**4); // ~0.854W
  const m={
    nose:V(noseX-head/PHI**3,W/PHI + W/PHI**4),
    rostrum:V(noseX+head/PHI**2,W/PHI + W/PHI**3),
    cranium:V(noseX+head/PHI,W*(1-1/PHI**4)),
    occiput:V(noseX+head,W*(1-1/PHI**4)-W/PHI**6),
    c3:V(-body/PHI**3,W*(1-1/PHI**4)),
    withers:V(-body/PHI**3,yBack+W/PHI**7),
    thoracic:V(0,W*(1-1/PHI**4)),
    lumbar:V(body/PHI**4,W*(1-1/PHI**4)-W/PHI**6),
    sacrum:V(rumpX,W*(1-1/PHI**3))
  };
  const makeSide=s=>{
    const z=W/PHI**4;
    return {
      scapula:V(-body/PHI**3,W*(1-1/PHI**4),s*z*.86),
      shoulder:V(-body/PHI**3-body/PHI**6,W*(1-1/PHI**3),s*z),
      elbow:V(-body/PHI**3,W/PHI,s*z),
      carpus:V(-body/PHI**3-body/PHI**7,(W/PHI**3)*g.legScale,s*z*.94),
      forePaw:V(-body/PHI**3-body/PHI**5,ground,s*z*.94),
      hip:V(body/PHI**3,W*(1-1/PHI**3),s*z),
      stifle:V(body/PHI**4,W/PHI,s*z),
      hock:V(body/PHI**3+body/PHI**5,(W/PHI**3)*g.legScale,s*z),
      hindPaw:V(body/PHI**4+body/PHI**5,ground,s*z*.96)
    };
  };
  const L=makeSide(1),R=makeSide(-1);
  const base=m.sacrum.clone().add(V(W/PHI**7,-W/PHI**7,0));
  const ts=[0,1/PHI**3,1/PHI**2,1/PHI,1];
  const tailPts=ts.map((t,i)=>{
    const a=i*GOLDEN_ANGLE;
    const downward=W*(t*t)/PHI;
    return V(base.x+tail*t,base.y-downward,Math.sin(a)*W/PHI**6*t);
  });
  const earH=head/PHI*g.earScale;
  const ears=[-1,1].map((s,i)=>({
    root:V(m.cranium.x,m.cranium.y+head/PHI**5,s*W/PHI**4),
    tip:V(m.cranium.x+Math.cos(GOLDEN_ANGLE)*head/PHI**5,m.cranium.y+earH,s*(W/PHI**4+Math.sin(GOLDEN_ANGLE)*head/PHI**4))
  }));
  applyAsymmetry({m,L,R,tailPts,ears},g);
  return {mode:'B',W,body,tail,head,ground,midline:m,L,R,tailPts,ears};
}

function applyAsymmetry(o,g){
  const a=g.asymmetry;
  o.L.forePaw.x-=a*.004;o.R.hindPaw.x+=a*.003;
  for(let i=1;i<o.tailPts.length;i++)o.tailPts[i].z+=Math.sin(i*1.7)*a*.012;
  o.ears[1].tip.y-=a*.006;
}
export const buildAnatomy=(g,mode='A')=>mode==='B'?sacred(g):empirical(g);

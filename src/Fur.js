import * as THREE from 'three';
export function buildFur(source,a,g){
 const root=new THREE.Group();root.name='fur';
 const pos=source.geometry.getAttribute('position'),nor=source.geometry.getAttribute('normal'),col=source.geometry.getAttribute('color');
 if(!pos||!nor)return root;
 const verts=[];const cols=[];const stride=Math.max(1,Math.floor(pos.count/17000));
 const p=new THREE.Vector3(),n=new THREE.Vector3();
 for(let i=0;i<pos.count;i+=stride){p.fromBufferAttribute(pos,i);n.fromBufferAttribute(nor,i).normalize();const worldY=(p.y*source.scale.y)+source.position.y;const localX=(p.x*source.scale.x)+source.position.x;const tailish=localX>a.midline.sacrum.x*.9;let L=.006+.010*g.winterCoat;if(tailish)L*=1.8;if(worldY<a.W*.22)L*=.72;const gravity=new THREE.Vector3(0,-.28,0);const dir=n.clone().addScaledVector(gravity,.22).normalize();verts.push(p.x,p.y,p.z,p.x+dir.x*L/source.scale.x,p.y+dir.y*L/source.scale.y,p.z+dir.z*L/source.scale.z);let r=.65,gg=.25,b=.07;if(col){r=col.getX(i);gg=col.getY(i);b=col.getZ(i)}cols.push(r,gg,b,r*.92,gg*.92,b*.92)}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));const mat=new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.42,depthWrite:false});const lines=new THREE.LineSegments(geo,mat);lines.position.copy(source.position);lines.scale.copy(source.scale);lines.renderOrder=4;root.add(lines);
 return root;
}

const clamp=v=>Math.max(0,Math.min(1,v));
function ratio(x,t,tol){return clamp(1-Math.abs(x-t)/tol)}
function angle(a,b,c){const ba=a.clone().sub(b).normalize(),bc=c.clone().sub(b).normalize();return Math.acos(Math.max(-1,Math.min(1,ba.dot(bc))))*180/Math.PI}
export function critique(a,g){const fore=angle(a.L.shoulder,a.L.elbow,a.L.carpus),hind=angle(a.L.hip,a.L.stifle,a.L.hock);const s={withers:ratio(a.W,.435,.07),body:ratio(a.body,.68,.12),tail:ratio(a.tail,.386,.10),head:ratio(a.head,.178,.045),fore_angle:ratio(fore,145,50),hind_angle:ratio(hind,85,45),bilateral:clamp(1-g.asymmetry*.12)};s.total=Object.values(s).reduce((x,y)=>x+y,0)/Object.keys(s).length;return {...s,foreDeg:fore,hindDeg:hind}}

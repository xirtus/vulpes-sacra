export const PHI=(1+Math.sqrt(5))/2;
export const GOLDEN_ANGLE=Math.PI*(3-Math.sqrt(5));

export const DEFAULTS={
  withers:0.435,
  bodyLeanness:1.00,
  legScale:1.00,
  headScale:1.00,
  earScale:1.00,
  tailScale:1.00,
  muscleTone:0.52,
  winterCoat:0.52,
  asymmetry:0.06
};
export const cloneGenome=(g=DEFAULTS)=>structuredClone(g);

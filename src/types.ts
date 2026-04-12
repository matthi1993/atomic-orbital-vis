export interface OrbitalParams {
  n: number;
  l: number;
  m: number;
  count: number;
  threshold: number;
  scale: number;
  pointSize: number;
  rotSpeed: number;
  electronOpacity: number;
  opaqueMode: boolean;
  orthographic: boolean;
  showAxes: boolean;
  showRadialPlot: boolean;
  showCombinedPlot: boolean;
  showThetaPlot: boolean;
  showPhiPlot: boolean;
  showElectrons: boolean;
  cutPlane: 'none' | 'x' | 'y' | 'z';
}

export interface GeneratedParticles {
  positions: Float32Array;
  colors: Float32Array;
  actual: number;
}

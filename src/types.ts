export interface OrbitalParams {
  n: number;
  l: number;
  m: number;
  count: number;
  threshold: number;
  scale: number;
  pointSize: number;
  rotSpeed: number;
}

export interface GeneratedParticles {
  positions: Float32Array;
  colors: Float32Array;
  actual: number;
}

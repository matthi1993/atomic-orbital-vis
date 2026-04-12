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

export const DEFAULT_PARAMS: OrbitalParams = {
  n: 2,
  l: 1,
  m: 0,
  count: 200000,
  threshold: 0.15,
  scale: 10.0,
  pointSize: 2.0,
  rotSpeed: 0.2,
};

import { psiSquared } from './quantum.js';

export interface AtomConfig {
  n: number;
  l: number;
  m: number;
  position: [number, number, number];
  weight?: number;
}

/** Estimate max |ψ|²·r² for single-atom rejection sampling normalization */
export function estimateMaxPsi(
  n: number, l: number, m: number, rMax: number, samples = 5000,
): number {
  let maxPsi = 0;
  for (let i = 0; i < samples; i++) {
    const r = Math.random() * rMax;
    const theta = Math.random() * Math.PI;
    const phi = Math.random() * 2 * Math.PI;
    const p = psiSquared(n, l, m, r, theta, phi) * r * r;
    if (p > maxPsi) maxPsi = p;
  }
  return maxPsi;
}

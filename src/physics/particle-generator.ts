import { psiSquared, radialWave, sphericalHarmonic } from './quantum.js';
import type { GeneratedParticles } from '../types.js';

/** Estimate max |ψ|²·r² for rejection sampling normalization */
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

/** Generate particle positions via rejection sampling of |ψ|² */
export function generateParticles(
  n: number, l: number, m: number,
  count: number, scale: number, threshold: number,
): GeneratedParticles {
  const positions = new Float32Array(count * 4);
  const colors = new Float32Array(count * 4);
  const rMax = scale * n * n;

  // Estimate max ψ² for normalization
  let maxPsi = 0;
  for (let i = 0; i < 5000; i++) {
    const r = Math.random() * rMax;
    const theta = Math.random() * Math.PI;
    const phi = Math.random() * 2 * Math.PI;
    const p = psiSquared(n, l, m, r, theta, phi) * r * r;
    if (p > maxPsi) maxPsi = p;
  }

  let idx = 0;
  let attempts = 0;
  const maxAttempts = count * 200;

  while (idx < count && attempts < maxAttempts) {
    attempts++;
    const r = Math.random() * rMax;
    const theta = Math.acos(2 * Math.random() - 1);
    const phi = Math.random() * 2 * Math.PI;
    const psi2 = psiSquared(n, l, m, r, theta, phi) * r * r;
    const prob = maxPsi > 0 ? psi2 / maxPsi : 0;

    if (prob < threshold || Math.random() > prob) continue;

    const x = r * Math.sin(theta) * Math.cos(phi);
    const y = r * Math.sin(theta) * Math.sin(phi);
    const z = r * Math.cos(theta);

    positions[idx * 4 + 0] = x;
    positions[idx * 4 + 1] = y;
    positions[idx * 4 + 2] = z;
    positions[idx * 4 + 3] = 1.0;

    // Phase coloring based on wave function sign
    const R_val = radialWave(n, l, r);
    const Y_val = sphericalHarmonic(l, m, theta, phi);
    const sign = R_val * Y_val;
    const t = Math.min(prob * 2.0, 1.0);

    if (sign >= 0) {
      colors[idx * 4] = 0.2 + 0.6 * t;
      colors[idx * 4 + 1] = 0.4 + 0.5 * t;
      colors[idx * 4 + 2] = 1.0;
    } else {
      colors[idx * 4] = 1.0;
      colors[idx * 4 + 1] = 0.3 + 0.4 * t;
      colors[idx * 4 + 2] = 0.2 + 0.3 * t;
    }
    colors[idx * 4 + 3] = 0.4 + 0.6 * t;

    idx++;
  }

  return { positions, colors, actual: idx };
}

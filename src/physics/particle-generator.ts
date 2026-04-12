import { psiSquared, radialWave, sphericalHarmonic, psi } from './quantum.js';
import type { GeneratedParticles } from '../types.js';

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

/**
 * Estimate the max of |Σ ψᵢ|² · r² for molecular orbital rejection sampling.
 *
 * Uses the same importance-sampling strategy as the GPU shader: pick a random
 * atom, sample spherically around it, compute the full molecular ψ_total,
 * and track the maximum of |ψ_total|² · r² (where r is from the ref atom).
 */
export function estimateMaxPsiMolecular(
  atomConfigs: AtomConfig[],
  scale: number,
  samples = 20000,
): number {
  let maxVal = 0;
  const numAtoms = atomConfigs.length;

  for (let s = 0; s < samples; s++) {
    // Pick a random atom to sample around
    const refIdx = Math.floor(Math.random() * numAtoms);
    const ref = atomConfigs[refIdx];
    const rMax = scale * ref.n * ref.n;

    const r = Math.random() * rMax;
    const cosTheta = 2 * Math.random() - 1;
    const phi = Math.random() * 2 * Math.PI;
    const sinTheta = Math.sqrt(1 - cosTheta * cosTheta);

    const x = ref.position[0] + r * sinTheta * Math.cos(phi);
    const y = ref.position[1] + r * sinTheta * Math.sin(phi);
    const z = ref.position[2] + r * cosTheta;

    // Compute combined ψ_total = Σ ψᵢ
    let psiTotal = 0;
    for (const atom of atomConfigs) {
      const dx = x - atom.position[0];
      const dy = y - atom.position[1];
      const dz = z - atom.position[2];
      const ra = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (ra < 1e-10) continue;
      const theta_a = Math.acos(Math.max(-1, Math.min(1, dz / ra)));
      const phi_a = Math.atan2(dy, dx);
      psiTotal += psi(atom.n, atom.l, atom.m, ra, theta_a, phi_a);
    }

    const val = psiTotal * psiTotal * r * r;
    if (val > maxVal) maxVal = val;
  }

  return maxVal;
}

/**
 * Estimate max of Σ wᵢ|ψᵢ|² · r² for incoherent (electron density) mode.
 * Each orbital contributes independently, weighted by its electron count.
 */
export function estimateMaxPsiIncoherent(
  atomConfigs: AtomConfig[],
  scale: number,
  samples = 20000,
): number {
  let maxVal = 0;
  const numAtoms = atomConfigs.length;

  for (let s = 0; s < samples; s++) {
    const refIdx = Math.floor(Math.random() * numAtoms);
    const ref = atomConfigs[refIdx];
    const rMax = scale * ref.n * ref.n;

    const r = Math.random() * rMax;
    const cosTheta = 2 * Math.random() - 1;
    const phi = Math.random() * 2 * Math.PI;
    const sinTheta = Math.sqrt(1 - cosTheta * cosTheta);

    const x = ref.position[0] + r * sinTheta * Math.cos(phi);
    const y = ref.position[1] + r * sinTheta * Math.sin(phi);
    const z = ref.position[2] + r * cosTheta;

    let density = 0;
    for (const atom of atomConfigs) {
      const dx = x - atom.position[0];
      const dy = y - atom.position[1];
      const dz = z - atom.position[2];
      const ra = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (ra < 1e-10) continue;
      const theta_a = Math.acos(Math.max(-1, Math.min(1, dz / ra)));
      const phi_a = Math.atan2(dy, dx);
      const psi_a = psi(atom.n, atom.l, atom.m, ra, theta_a, phi_a);
      density += (atom.weight ?? 1) * psi_a * psi_a;
    }

    const val = density * r * r;
    if (val > maxVal) maxVal = val;
  }

  return maxVal;
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

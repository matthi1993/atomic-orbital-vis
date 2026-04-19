import type { Atom } from './atom.js';

/**
 * 3D electric-field grid computed from atom charges.
 *
 * Model:
 *   Each atom contributes a nuclear point charge +Z and an electron cloud −Nₑ.
 *   Electron screening builds up with distance using a Gaussian model so that
 *   near the nucleus the bare proton charge dominates, while at large distance
 *   only the net charge (Z − Nₑ) remains.
 *
 *   E(r) = Σ_atoms [ +Z (r−p)/D³  −  Nₑ (r−p)/D³ · screen(|r−p|) ]
 *
 *   where D = sqrt(|r−p|² + ε²)  (softened Coulomb),
 *   screen(d) = 1 − exp(−d² / (2σ²)), σ ∝ orbital size.
 */

/** Resolution per axis (total grid points = RES³). */
export const FIELD_RES = 32;

/** Half-extent of the cube in world units (grid covers [−EXTENT, +EXTENT]³). */
export const FIELD_EXTENT = 20;

/** Softening length to avoid singularity at the nucleus. */
const SOFTENING = 1.0;

/** Screening width – roughly the characteristic orbital radius in world units. */
const SIGMA = 3.0;
const INV_2_SIGMA2 = 1 / (2 * SIGMA * SIGMA);

export interface FieldData {
  /** Flat array: [Ex, Ey, Ez, Ex, Ey, Ez, …] for each grid point, row-major (x varies fastest). */
  field: Float32Array;
  /** Grid resolution per axis. */
  res: number;
  /** Half-extent in world units. */
  extent: number;
}

/**
 * Compute the electric field on a uniform cubic grid centred at the origin.
 * Call this whenever atoms move or their charge counts change.
 */
export function computeChargeField(atoms: Atom[], scale: number): FieldData {
  const res = FIELD_RES;
  const extent = FIELD_EXTENT;
  const total = res * res * res;
  const field = new Float32Array(total * 3);

  const step = (2 * extent) / (res - 1);
  const sigma = SIGMA * Math.max(scale, 0.5);
  const inv2s2 = 1 / (2 * sigma * sigma);

  for (let iz = 0; iz < res; iz++) {
    const pz = -extent + iz * step;
    for (let iy = 0; iy < res; iy++) {
      const py = -extent + iy * step;
      for (let ix = 0; ix < res; ix++) {
        const px = -extent + ix * step;
        const idx = (iz * res * res + iy * res + ix) * 3;

        let ex = 0, ey = 0, ez = 0;

        for (const atom of atoms) {
          const pos = atom.position;
          const dx = px - pos[0];
          const dy = py - pos[1];
          const dz = pz - pos[2];
          const dist2 = dx * dx + dy * dy + dz * dz;
          const D = Math.sqrt(dist2 + SOFTENING * SOFTENING);
          const invD3 = 1 / (D * D * D);

          const Z = atom.protons;
          const Ne = atom.electrons;

          // Bare nuclear Coulomb
          const nucFactor = Z * invD3;
          ex += nucFactor * dx;
          ey += nucFactor * dy;
          ez += nucFactor * dz;

          // Screened electron cloud (builds up with distance)
          const screen = 1 - Math.exp(-dist2 * inv2s2);
          const eleFactor = Ne * invD3 * screen;
          ex -= eleFactor * dx;
          ey -= eleFactor * dy;
          ez -= eleFactor * dz;
        }

        field[idx + 0] = ex;
        field[idx + 1] = ey;
        field[idx + 2] = ez;
      }
    }
  }

  return { field, res, extent };
}

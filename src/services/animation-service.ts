import type { AtomManager } from '../physics/atom-manager.js';
import type { Atom } from '../physics/atom.js';
import { FIELD_EXTENT } from '../physics/charge-field.js';

/**
 * Computes electrostatic forces on atoms from the charge field
 * and integrates their motion using velocity-Verlet.
 */
export class AnimationService {
  constructor(private atomManager: AtomManager) {}

  /**
   * Advance atom positions by one timestep.
   * Returns true if any atom moved (caller should regenerate particles).
   */
  step(dt: number, scale: number, speed: number, forceScale: number, damping: number): boolean {
    const atoms = this.atomManager.all;
    if (atoms.length < 2) return false; // single atom has no external field

    // Compute forces on each atom from all OTHER atoms
    const forces = this.computeForces(atoms, scale, forceScale);

    let moved = false;

    for (let i = 0; i < atoms.length; i++) {
      const atom = atoms[i];
      const f = forces[i];
      const v = atom.velocity;

      // Semi-implicit Euler: update velocity first, then position
      // Speed scales the simulation rate
      const dampFactor = Math.pow(damping, dt * 60);
      const newVx = (v[0] + f[0] * speed * dt) * dampFactor;
      const newVy = (v[1] + f[1] * speed * dt) * dampFactor;
      const newVz = (v[2] + f[2] * speed * dt) * dampFactor;

      const newX = atom.position[0] + newVx * dt;
      const newY = atom.position[1] + newVy * dt;
      const newZ = atom.position[2] + newVz * dt;

      atom.setVelocity([newVx, newVy, newVz]);

      // Clamp to field extent to keep atoms in view
      const limit = FIELD_EXTENT * 0.8;
      const cx = Math.max(-limit, Math.min(limit, newX));
      const cy = Math.max(-limit, Math.min(limit, newY));
      const cz = Math.max(-limit, Math.min(limit, newZ));

      const pos = atom.position;
      if (Math.abs(cx - pos[0]) > 1e-6 || Math.abs(cy - pos[1]) > 1e-6 || Math.abs(cz - pos[2]) > 1e-6) {
        atom.setPosition([cx, cy, cz]);
        moved = true;
      }
    }

    return moved;
  }

  /**
   * Compute forces on each atom from all other atoms.
   *
   * The model combines:
   * 1. Classical electrostatics (4-term: nuc-nuc, nuc-ele, ele-nuc, ele-ele)
   *    – always repulsive for neutral atoms (Earnshaw's theorem).
   * 2. A Morse-like quantum bonding potential that models the exchange energy
   *    from shared electron clouds. This creates an attractive well at an
   *    equilibrium distance, allowing atoms to form stable bonds.
   *
   * V_morse(r) = De·(1 − exp(−a·(r − re)))² − De
   * F_morse(r) = 2·De·a·exp(−a·(r−re))·(1 − exp(−a·(r−re)))  (along r̂)
   *
   * The bonding strength scales with the minimum electron count of the pair,
   * so ions with no electrons don't bond.
   */
  private computeForces(atoms: Atom[], scale: number, forceScale: number): [number, number, number][] {
    const SOFTENING = 2.0;
    const forces: [number, number, number][] = atoms.map(() => [0, 0, 0]);

    // Morse potential parameters (world units)
    const re = 3.5 * scale;   // equilibrium bond distance
    const De = forceScale * 0.5; // well depth
    const aParam = 1.2 / scale;  // width of the well

    for (let i = 0; i < atoms.length; i++) {
      for (let j = i + 1; j < atoms.length; j++) {
        const a = atoms[i];
        const b = atoms[j];

        const dx = b.position[0] - a.position[0];
        const dy = b.position[1] - a.position[1];
        const dz = b.position[2] - a.position[2];

        const dist2 = dx * dx + dy * dy + dz * dz;
        const dist = Math.sqrt(dist2);
        if (dist < 1e-8) continue;

        const ux = dx / dist;
        const uy = dy / dist;
        const uz = dz / dist;

        // ── 1. Classical Coulomb (softened) ─────────────────────
        // 4-term: nuc↔nuc repulsion, nuc↔ele attraction (×2), ele↔ele repulsion
        // For neutral atoms these nearly cancel, leaving a small residual repulsion.
        const D = Math.sqrt(dist2 + SOFTENING * SOFTENING);
        const invD3 = 1 / (D * D * D);

        const SIGMA = 3.0 * Math.max(scale, 0.5);
        const inv2s2 = 1 / (2 * SIGMA * SIGMA);
        const screenA = 1 - Math.exp(-dist2 * inv2s2);
        const screenB = screenA; // symmetric for equal separation

        const Za = a.protons, Zb = b.protons;
        const Na = a.electrons, Nb = b.electrons;

        // Net Coulomb force (positive = repulsive along A→B direction)
        const fCoulomb = forceScale * (
          Za * Zb                       // nuc-nuc repulsion
          - Za * Nb * screenB           // A-nuc attracted to B-electrons
          - Na * screenA * Zb           // A-electrons attracted to B-nuc
          + Na * screenA * Nb * screenB // ele-ele repulsion
        ) * invD3;

        // ── 2. Quantum bonding (Morse potential) ────────────────
        // Strength scales with shared electrons: min(Na, Nb)
        const bondElectrons = Math.min(Na, Nb);
        let fMorse = 0;
        if (bondElectrons > 0) {
          const expTerm = Math.exp(-aParam * (dist - re));
          // F = -dV/dr = 2·De·a·exp(−a(r−re))·(1 − exp(−a(r−re)))
          // Positive = attractive (pointing A→B), negative = repulsive
          fMorse = 2 * De * aParam * bondElectrons * expTerm * (1 - expTerm);
        }

        // Total radial force on A from B: Coulomb (repulsive +) + Morse (attractive +)
        const fTotal = -fCoulomb + fMorse; // positive = attraction toward B

        forces[i][0] += fTotal * ux;
        forces[i][1] += fTotal * uy;
        forces[i][2] += fTotal * uz;

        // Newton's third law
        forces[j][0] -= fTotal * ux;
        forces[j][1] -= fTotal * uy;
        forces[j][2] -= fTotal * uz;
      }
    }

    return forces;
  }

  /** Reset all atom velocities to zero. */
  resetVelocities(): void {
    for (const atom of this.atomManager.all) {
      atom.setVelocity([0, 0, 0]);
    }
  }
}

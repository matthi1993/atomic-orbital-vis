import { Atom } from './atom.js';
import { OrbitalPipeline } from '../gpu/orbital-pipeline.js';
import type { AtomGPUConfig } from '../gpu/orbital-pipeline.js';
import { estimateMaxPsi } from './particle-generator.js';

/**
 * Manages a collection of Atom instances and coordinates particle generation.
 *
 * Design notes for multi-atom support:
 * - All atoms are fed to a single GPU dispatch that evaluates the coherent
 *   molecular orbital ψ_total = Σ ψᵢ via importance-sampled rejection sampling.
 * - Particles represent the combined |ψ_total|² probability density, producing
 *   true bonding / antibonding orbital shapes.
 * - Only regenerates when any atom's quantum numbers or a global param changes.
 */
export class AtomManager {
  private atoms: Map<string, Atom> = new Map();
  private _selectedId: string | null = null;
  private _molecularParticles: { positions: Float32Array; colors: Float32Array; totalCount: number } | null = null;

  addAtom(n = 1, l = 0, m = 0, position: [number, number, number] = [0, 0, 0]): Atom {
    const atom = new Atom(n, l, m, position);
    this.atoms.set(atom.id, atom);
    if (!this._selectedId) this._selectedId = atom.id;
    return atom;
  }

  removeAtom(id: string): void {
    this.atoms.delete(id);
    if (this._selectedId === id) {
      const first = this.atoms.keys().next();
      this._selectedId = first.done ? null : first.value;
    }
  }

  getAtom(id: string): Atom | undefined {
    return this.atoms.get(id);
  }

  get selectedAtom(): Atom | undefined {
    return this._selectedId ? this.atoms.get(this._selectedId) : undefined;
  }

  selectAtom(id: string): void {
    if (this.atoms.has(id)) this._selectedId = id;
  }

  get all(): Atom[] {
    return Array.from(this.atoms.values());
  }

  get size(): number {
    return this.atoms.size;
  }

  /** Whether any atom needs regeneration */
  get anyDirty(): boolean {
    for (const atom of this.atoms.values()) {
      if (atom.dirty) return true;
    }
    return false;
  }

  /**
   * Build the atom config array expected by the GPU pipeline.
   * Expands each atom into its full electron configuration (all occupied orbitals).
   */
  private buildAtomConfigs(scale: number): AtomGPUConfig[] {
    const configs: AtomGPUConfig[] = [];
    for (const atom of this.all) {
      const orbitals = atom.occupiedOrbitals;
      if (orbitals.length === 0) continue;
      for (const orbital of orbitals) {
        const rMax = scale * orbital.n * orbital.n;
        configs.push({
          n: orbital.n,
          l: orbital.l,
          m: orbital.m,
          position: atom.position,
          rMax,
          maxPsi: estimateMaxPsi(orbital.n, orbital.l, orbital.m, rMax),
        });
      }
    }
    return configs;
  }

  /**
   * Regenerate the molecular orbital via a single GPU dispatch.
   * Evaluates ψ_total = Σ ψᵢ across all atoms and samples |ψ_total|².
   */
  async regenerateAll(
    pipeline: OrbitalPipeline,
    particleCount: number,
    scale: number,
    threshold: number,
  ): Promise<{ positions: Float32Array; colors: Float32Array; totalCount: number }> {
    if (!this.anyDirty && this._molecularParticles) {
      return this._molecularParticles;
    }

    const atomConfigs = this.buildAtomConfigs(scale);

    // Per-orbital maxPsi is already baked into each AtomGPUConfig.
    // Global maxPsi=0 (unused in incoherent mode=0).
    const data = await pipeline.generate(atomConfigs, particleCount, scale, threshold, 0, 0);

    // Mark all atoms clean
    for (const atom of this.atoms.values()) {
      atom.setParticleData(data);
    }

    this._molecularParticles = {
      positions: data.positions,
      colors: data.colors,
      totalCount: data.actual,
    };

    return this._molecularParticles;
  }

  /** Mark all atoms dirty (e.g. when global render params like scale/threshold change). */
  markAllDirty(): void {
    this._molecularParticles = null;
    for (const atom of this.atoms.values()) {
      atom.markDirty();
    }
  }
}

import { Atom } from './atom.js';
import { OrbitalPipeline } from '../gpu/orbital-pipeline.js';
import type { AtomGPUConfig } from '../gpu/orbital-pipeline.js';
import { estimateMaxPsiMolecular } from './particle-generator.js';

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
   */
  private buildAtomConfigs(scale: number): AtomGPUConfig[] {
    return this.all.map((atom) => ({
      n: atom.n,
      l: atom.l,
      m: atom.m,
      position: atom.position,
      rMax: scale * atom.n * atom.n,
    }));
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

    // Estimate max |ψ_total|²·r² for rejection-sampling normalization
    const cpuConfigs = this.all.map((a) => ({
      n: a.n, l: a.l, m: a.m, position: a.position,
    }));
    const maxPsi = estimateMaxPsiMolecular(cpuConfigs, scale);

    const data = await pipeline.generate(atomConfigs, particleCount, scale, threshold, maxPsi);

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

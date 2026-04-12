import { Atom } from './atom.js';
import { OrbitalPipeline } from '../gpu/orbital-pipeline.js';
import { estimateMaxPsi } from './particle-generator.js';

/**
 * Manages a collection of Atom instances and coordinates particle generation.
 *
 * Design notes for multi-atom support:
 * - Each atom generates particles independently via the shared GPU pipeline.
 * - Particles are merged into a single buffer (one draw call = good perf).
 * - Atom positions offset their particles in world space.
 * - Only dirty atoms are regenerated; clean atoms reuse cached data.
 *
 * Future: for true molecular orbital visualization, the GPU shader could
 * evaluate the combined probability density Σ|ψ_i|² (or |Σψ_i|² for
 * coherent superposition) from all atom configs in a single dispatch.
 */
export class AtomManager {
  private atoms: Map<string, Atom> = new Map();
  private _selectedId: string | null = null;

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

  /**
   * Regenerate particles for all dirty atoms, then return merged buffers.
   * Only atoms whose quantum numbers changed since last generation are recomputed.
   */
  async regenerateAll(
    pipeline: OrbitalPipeline,
    particlesPerAtom: number,
    scale: number,
    threshold: number,
  ): Promise<{ positions: Float32Array; colors: Float32Array; totalCount: number }> {
    for (const atom of this.atoms.values()) {
      if (!atom.dirty) continue;

      const { n, l, m } = atom;
      const rMax = scale * n * n;
      const maxPsi = estimateMaxPsi(n, l, m, rMax);
      const data = await pipeline.generate(n, l, m, particlesPerAtom, scale, threshold, maxPsi);
      atom.setParticleData(data);
    }

    return this.getMergedParticles();
  }

  /**
   * Merge all atom particle data into single position/color buffers.
   * Each atom's particles are offset by its world-space position.
   */
  getMergedParticles(): { positions: Float32Array; colors: Float32Array; totalCount: number } {
    let totalCount = 0;
    for (const atom of this.atoms.values()) {
      if (atom.particleData) totalCount += atom.particleData.actual;
    }

    const positions = new Float32Array(totalCount * 4);
    const colors = new Float32Array(totalCount * 4);
    let offset = 0;

    for (const atom of this.atoms.values()) {
      const data = atom.particleData;
      if (!data) continue;

      const [ox, oy, oz] = atom.position;
      for (let i = 0; i < data.actual; i++) {
        const dst = (offset + i) * 4;
        const src = i * 4;
        positions[dst + 0] = data.positions[src + 0] + ox;
        positions[dst + 1] = data.positions[src + 1] + oy;
        positions[dst + 2] = data.positions[src + 2] + oz;
        positions[dst + 3] = data.positions[src + 3];

        colors[dst + 0] = data.colors[src + 0];
        colors[dst + 1] = data.colors[src + 1];
        colors[dst + 2] = data.colors[src + 2];
        colors[dst + 3] = data.colors[src + 3];
      }
      offset += data.actual;
    }

    return { positions, colors, totalCount };
  }

  /** Mark all atoms dirty (e.g. when global render params like scale/threshold change). */
  markAllDirty(): void {
    for (const atom of this.atoms.values()) {
      atom.markDirty();
    }
  }
}

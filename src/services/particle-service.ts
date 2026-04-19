import type { AtomManager } from '../physics/atom-manager.js';
import type { OrbitalPipeline } from '../gpu/orbital-pipeline.js';
import type { PointCloud } from '../renderer/point-cloud.js';
import type { AxesPlots } from '../renderer/axes-plots.js';
import type { SceneManager } from '../renderer/scene-manager.js';
import type { OrbitalParams } from '../types.js';

/**
 * Orchestrates the GPU particle generation pipeline.
 * Converts molecular orbital data from the AtomManager into
 * renderable point-cloud geometry via the OrbitalPipeline.
 */
export class ParticleService {
  private generating = false;

  constructor(
    private atomManager: AtomManager,
    private orbitalPipeline: OrbitalPipeline,
    private pointCloud: PointCloud,
    private axesPlots: AxesPlots,
    private sceneManager: SceneManager,
  ) {}

  async regenerate(params: OrbitalParams): Promise<void> {
    if (this.generating) return;
    this.generating = true;

    const { count, threshold, scale } = params;

    const { positions, colors, totalCount } = await this.atomManager.regenerateAll(
      this.orbitalPipeline, count, scale, threshold,
    );
    const usedCount = Math.max(totalCount, 1);

    const pos3 = new Float32Array(usedCount * 3);
    const sizes = new Float32Array(usedCount);
    for (let i = 0; i < usedCount; i++) {
      pos3[i * 3 + 0] = positions[i * 4 + 0];
      pos3[i * 3 + 1] = positions[i * 4 + 1];
      pos3[i * 3 + 2] = positions[i * 4 + 2];
      // Color alpha encodes probability (0–1); map to size multiplier
      const prob = colors[i * 4 + 3];
      sizes[i] = 0.05 + 0.95 * prob;
    }

    this.pointCloud.create(usedCount, colors, params.pointSize, sizes);
    this.pointCloud.setPositions(pos3);
    this.sceneManager.markDirty();

    // Show wave-function plots for the currently selected atom
    const selected = this.atomManager.selectedAtom;
    if (selected) {
      this.axesPlots.update(selected.n, selected.l, selected.m, scale);
    }
    this.axesPlots.showAxes = params.showAxes;

    this.generating = false;
  }
}

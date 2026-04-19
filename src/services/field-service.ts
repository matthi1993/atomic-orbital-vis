import type { AtomManager } from '../physics/atom-manager.js';
import type { FieldArrows } from '../renderer/field-arrows.js';
import type { SceneManager } from '../renderer/scene-manager.js';
import { computeChargeField } from '../physics/charge-field.js';

/**
 * Coordinates electric-field computation and visualisation.
 * Call `update()` whenever atoms change (position, charge counts, etc.).
 */
export class FieldService {
  private _dirty = true;
  private _lastScale = -1;

  constructor(
    private atomManager: AtomManager,
    private fieldArrows: FieldArrows,
    private sceneManager: SceneManager,
  ) {}

  /** Mark the field for recomputation on next update(). */
  markDirty(): void {
    this._dirty = true;
  }

  /** Recompute the charge field if anything changed, then refresh the arrow mesh. */
  update(scale: number): void {
    if (!this._dirty && scale === this._lastScale) return;
    this._dirty = false;
    this._lastScale = scale;
    const atoms = this.atomManager.all;
    const data = computeChargeField(atoms, scale);
    this.fieldArrows.update(data);
    this.sceneManager.markDirty();
  }
}

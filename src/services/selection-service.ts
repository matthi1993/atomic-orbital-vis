import type { AtomManager } from '../physics/atom-manager.js';
import type { Nucleus } from '../renderer/nucleus.js';
import type { AxisHandles } from '../renderer/axis-handles.js';
import type { RotationHandles } from '../renderer/rotation-handles.js';
import type { SceneManager } from '../renderer/scene-manager.js';

/**
 * Coordinates atom selection state across the data layer (AtomManager)
 * and visual representations (Nucleus highlight, AxisHandles/RotationHandles attachment).
 */
export class SelectionService {
  private _selectedAtomId: string | null = null;

  constructor(
    private atomManager: AtomManager,
    private nucleus: Nucleus,
    private axisHandles: AxisHandles,
    private rotationHandles: RotationHandles,
    private sceneManager: SceneManager,
  ) {}

  get selectedAtomId(): string | null {
    return this._selectedAtomId;
  }

  select(atomId: string): void {
    this._selectedAtomId = atomId;
    this.atomManager.selectAtom(atomId);
    this.nucleus.selectedId = atomId;
    const atom = this.atomManager.getAtom(atomId);
    this.axisHandles.attach(atomId, atom?.position ?? null);
    this.rotationHandles.attach(atomId, atom?.position ?? null);
    this.sceneManager.markDirty();
  }

  deselect(): void {
    this._selectedAtomId = null;
    this.nucleus.selectedId = null;
    this.axisHandles.attach(null, null);
    this.rotationHandles.attach(null, null);
    this.sceneManager.markDirty();
  }

  selectFirstAvailable(): void {
    const all = this.atomManager.all;
    if (all.length > 0) {
      this.select(all[0].id);
    } else {
      this.deselect();
    }
  }
}

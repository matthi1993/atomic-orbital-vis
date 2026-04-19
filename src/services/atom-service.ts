import type { AtomManager } from '../physics/atom-manager.js';
import type { Atom } from '../physics/atom.js';
import type { Nucleus } from '../renderer/nucleus.js';
import type { AxisHandles } from '../renderer/axis-handles.js';
import type { RotationHandles } from '../renderer/rotation-handles.js';
import type { SceneManager } from '../renderer/scene-manager.js';
import type { SelectionService } from './selection-service.js';
import type { HandleDragEvent } from '../renderer/axis-handles.js';
import type { RotationDragEvent } from '../renderer/rotation-handles.js';

/**
 * Handles atom lifecycle (add / remove), property editing,
 * preset application, orbital layer selection, and drag operations.
 * Coordinates mutations across the data model and visual representations.
 */
export class AtomService {
  constructor(
    private atomManager: AtomManager,
    private nucleus: Nucleus,
    private axisHandles: AxisHandles,
    private rotationHandles: RotationHandles,
    private sceneManager: SceneManager,
    private selectionService: SelectionService,
  ) {}

  addAtom(copyFrom?: Atom): Atom {
    const position: [number, number, number] = copyFrom
      ? ([...copyFrom.position] as [number, number, number])
      : [0, 0, 0];
    const atom = this.atomManager.addAtom(1, 0, 0, position);
    atom.setProtons(copyFrom?.protons ?? 1);
    atom.setElectrons(copyFrom?.electrons ?? 1);
    this.nucleus.addNucleus(atom.id, atom.position);
    this.selectionService.select(atom.id);
    this.atomManager.markAllDirty();
    return atom;
  }

  removeAtom(atomId: string): void {
    this.nucleus.removeNucleus(atomId);
    this.atomManager.removeAtom(atomId);
    if (this.selectionService.selectedAtomId === atomId) {
      this.selectionService.selectFirstAvailable();
    }
    this.atomManager.markAllDirty();
  }

  editAtom(atomId: string, key: string, value: number): void {
    const atom = this.atomManager.getAtom(atomId);
    if (!atom) return;

    switch (key) {
      case 'protons':
        atom.setProtons(value);
        break;
      case 'electrons':
        atom.setElectrons(value);
        break;
      case 'posX':
      case 'posY':
      case 'posZ': {
        const pos = [...atom.position] as [number, number, number];
        const idx = key === 'posX' ? 0 : key === 'posY' ? 1 : 2;
        pos[idx] = value;
        atom.setPosition(pos);
        this.nucleus.updatePosition(atomId, pos);
        this.axisHandles.updatePosition(pos);
        this.rotationHandles.updatePosition(pos);
        break;
      }
      case 'rotX':
      case 'rotY':
      case 'rotZ': {
        const rot = [...atom.rotation] as [number, number, number];
        const idx = key === 'rotX' ? 0 : key === 'rotY' ? 1 : 2;
        rot[idx] = value;
        atom.setRotation(rot);
        break;
      }
    }

    this.atomManager.markAllDirty();
  }

  applyPreset(atomId: string, protons: number, electrons: number): void {
    const atom = this.atomManager.getAtom(atomId);
    if (!atom) return;
    atom.setProtons(protons);
    atom.setElectrons(electrons);
    atom.setSelectedLayer('outer');
    atom.setSelectedOrbitalIndex(null);
    this.atomManager.markAllDirty();
  }

  selectOrbital(atomId: string, layer: string, orbitalIndex: number | null): void {
    const atom = this.atomManager.getAtom(atomId);
    if (!atom) return;
    atom.setSelectedLayer(layer);
    atom.setSelectedOrbitalIndex(orbitalIndex);
    this.atomManager.markAllDirty();
  }

  flipSpin(atomId: string): void {
    const atom = this.atomManager.getAtom(atomId);
    if (!atom) return;
    atom.flipSpin();
    this.atomManager.markAllDirty();
  }

  handleDrag(evt: HandleDragEvent): void {
    const atom = this.atomManager.getAtom(evt.atomId);
    if (!atom) return;
    const snapped: [number, number, number] = [
      Math.round(evt.position[0] * 2) / 2,
      Math.round(evt.position[1] * 2) / 2,
      Math.round(evt.position[2] * 2) / 2,
    ];
    atom.setPosition(snapped);
    this.nucleus.updatePosition(evt.atomId, snapped);
    this.axisHandles.updatePosition(snapped);
    this.rotationHandles.updatePosition(snapped);
    this.sceneManager.markDirty();
  }

  handleDragEnd(): void {
    this.atomManager.markAllDirty();
  }

  handleRotationDrag(evt: RotationDragEvent): void {
    const atom = this.atomManager.getAtom(evt.atomId);
    if (!atom) return;
    atom.setRotation(evt.rotation);
    this.sceneManager.markDirty();
  }

  handleRotationDragEnd(): void {
    this.atomManager.markAllDirty();
  }
}

import type { GeneratedParticles } from '../types.js';
import { electronConfiguration, configurationString, valenceOrbitals, subshells } from './electron-config.js';
import type { OrbitalOccupancy, Subshell } from './electron-config.js';

let nextId = 1;

/**
 * Represents a single atom with its quantum state and cached particle data.
 * Each atom has an independent set of quantum numbers and a 3D position,
 * plus proton/electron counts for display purposes.
 * Particle data is regenerated only when quantum numbers change (dirty flag).
 *
 * Spin convention:
 *   _spinUp = true  → unpaired electrons are spin-up (+½) by default (Hund's rule)
 *   _spinUp = false → unpaired electrons are spin-down (−½), flipped state
 *   Paired electrons always have one of each spin.
 */
export class Atom {
  readonly id: string;
  private _n: number;
  private _l: number;
  private _m: number;
  private _position: [number, number, number];
  private _rotation: [number, number, number]; // Euler angles in degrees (X, Y, Z)
  private _protons: number;
  private _electrons: number;
  private _dirty = true;
  private _particleData: GeneratedParticles | null = null;
  private _selectedLayer: string = 'outer'; // 'outer', 'all', or 'n-l' key
  private _selectedOrbitalIndex: number | null = null; // null = all in layer
  private _spinUp: boolean; // true = unpaired electrons are spin-up (random at creation)

  constructor(n = 1, l = 0, m = 0, position: [number, number, number] = [0, 0, 0]) {
    this.id = `atom-${nextId++}`;
    this._n = n;
    this._l = l;
    this._m = m;
    this._position = position;
    this._rotation = [0, 0, 0];
    this._protons = 1;
    this._electrons = 1;
    this._spinUp = Math.random() < 0.5;
  }

  get n(): number { return this._n; }
  get l(): number { return this._l; }
  get m(): number { return this._m; }
  get position(): [number, number, number] { return this._position; }
  get rotation(): [number, number, number] { return this._rotation; }
  get protons(): number { return this._protons; }
  get electrons(): number { return this._electrons; }
  get dirty(): boolean { return this._dirty; }
  get particleData(): GeneratedParticles | null { return this._particleData; }

  /** All subshells in Aufbau order */
  get subshellList(): Subshell[] {
    return subshells(this._electrons);
  }

  /** Orbitals for the currently selected layer */
  get occupiedOrbitals(): OrbitalOccupancy[] {
    const all = electronConfiguration(this._electrons);
    if (this._selectedLayer === 'all') return all;
    if (this._selectedLayer === 'outer') return valenceOrbitals(this._electrons);
    const [n, l] = this._selectedLayer.split('-').map(Number);
    return all.filter(o => o.n === n && o.l === l);
  }

  /** Orbitals to actually render (filtered by layer then individual selection) */
  get renderOrbitals(): OrbitalOccupancy[] {
    const layerOrbitals = this.occupiedOrbitals;
    if (this._selectedOrbitalIndex === null || this._selectedOrbitalIndex >= layerOrbitals.length) return layerOrbitals;
    return [layerOrbitals[this._selectedOrbitalIndex]];
  }

  get spinUp(): boolean { return this._spinUp; }

  get selectedLayer(): string { return this._selectedLayer; }
  get selectedOrbitalIndex(): number | null { return this._selectedOrbitalIndex; }

  setSelectedLayer(layer: string): void {
    if (this._selectedLayer === layer) return;
    this._selectedLayer = layer;
    this._selectedOrbitalIndex = null; // reset individual selection
    this._dirty = true;
  }

  setSelectedOrbitalIndex(idx: number | null): void {
    if (this._selectedOrbitalIndex === idx) return;
    this._selectedOrbitalIndex = idx;
    this._dirty = true;
  }

  get configString(): string {
    return configurationString(this._electrons);
  }

  setQuantumNumbers(n: number, l: number, m: number): void {
    if (this._n === n && this._l === l && this._m === m) return;
    this._n = n;
    this._l = l;
    this._m = m;
    this._dirty = true;
  }

  setPosition(pos: [number, number, number]): void {
    if (this._position[0] === pos[0] && this._position[1] === pos[1] && this._position[2] === pos[2]) return;
    this._position = pos;
    this._dirty = true;
  }

  setRotation(rot: [number, number, number]): void {
    if (this._rotation[0] === rot[0] && this._rotation[1] === rot[1] && this._rotation[2] === rot[2]) return;
    this._rotation = rot;
    this._dirty = true;
  }

  setProtons(count: number): void {
    this._protons = Math.max(1, Math.round(count));
  }

  setElectrons(count: number): void {
    const newCount = Math.max(0, Math.round(count));
    if (this._electrons === newCount) return;
    this._electrons = newCount;
    // Auto-set quantum numbers to the outermost occupied orbital
    const orbitals = electronConfiguration(this._electrons);
    if (orbitals.length > 0) {
      const last = orbitals[orbitals.length - 1];
      this._n = last.n;
      this._l = last.l;
      this._m = last.m;
    }
    this._dirty = true;
  }

  setParticleData(data: GeneratedParticles): void {
    this._particleData = data;
    this._dirty = false;
  }

  /** Flip the spin of ALL electrons in this atom. */
  flipSpin(): void {
    this._spinUp = !this._spinUp;
    this._dirty = true;
  }

  markDirty(): void {
    this._dirty = true;
  }
}

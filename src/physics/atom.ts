import type { GeneratedParticles } from '../types.js';
import { electronConfiguration, configurationString, valenceOrbitals } from './electron-config.js';
import type { OrbitalOccupancy } from './electron-config.js';

let nextId = 1;

/**
 * Represents a single atom with its quantum state and cached particle data.
 * Each atom has an independent set of quantum numbers and a 3D position,
 * plus proton/electron counts for display purposes.
 * Particle data is regenerated only when quantum numbers change (dirty flag).
 */
export class Atom {
  readonly id: string;
  private _n: number;
  private _l: number;
  private _m: number;
  private _position: [number, number, number];
  private _protons: number;
  private _electrons: number;
  private _dirty = true;
  private _particleData: GeneratedParticles | null = null;
  private _selectedOrbitalIndex: number | null = null; // null = all

  constructor(n = 1, l = 0, m = 0, position: [number, number, number] = [0, 0, 0]) {
    this.id = `atom-${nextId++}`;
    this._n = n;
    this._l = l;
    this._m = m;
    this._position = position;
    this._protons = 1;
    this._electrons = 1;
  }

  get n(): number { return this._n; }
  get l(): number { return this._l; }
  get m(): number { return this._m; }
  get position(): [number, number, number] { return this._position; }
  get protons(): number { return this._protons; }
  get electrons(): number { return this._electrons; }
  get dirty(): boolean { return this._dirty; }
  get particleData(): GeneratedParticles | null { return this._particleData; }

  get occupiedOrbitals(): OrbitalOccupancy[] {
    return valenceOrbitals(this._electrons);
  }

  /** Orbitals to actually render (filtered by selection) */
  get renderOrbitals(): OrbitalOccupancy[] {
    const all = this.occupiedOrbitals;
    if (this._selectedOrbitalIndex === null || this._selectedOrbitalIndex >= all.length) return all;
    return [all[this._selectedOrbitalIndex]];
  }

  get selectedOrbitalIndex(): number | null { return this._selectedOrbitalIndex; }

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

  markDirty(): void {
    this._dirty = true;
  }
}

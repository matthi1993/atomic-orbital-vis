import * as THREE from 'three';

const RING_COLOR_DEFAULT = 0xffff88; // light yellow
const RING_COLOR_SELECTED = 0x44ff44; // green
/** Minimum ring radius when no orbital info is available yet */
const DEFAULT_RING_RADIUS = 4;

interface NucleusEntry {
  id: string;
  mesh: THREE.Mesh;
  meshMat: THREE.MeshBasicMaterial;
  radius: number;            // current ring / hit-test radius
  ring: THREE.Line;
  ringMat: THREE.LineBasicMaterial;
}

/**
 * Manages one or more nucleus visualisations in the scene.
 * Each nucleus is identified by a string key (typically an Atom ID).
 * Supports raycasting for click-to-select and visual selection highlight.
 */
export class Nucleus {
  private scene: THREE.Scene;
  private entries: Map<string, NucleusEntry> = new Map();
  private _selectedId: string | null = null;
  private _showRings = true;

  /* Shared geometry – created once, reused for every nucleus */
  private coreGeo = new THREE.SphereGeometry(0.3, 32, 32);

  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  set showRings(v: boolean) {
    if (this._showRings === v) return;
    this._showRings = v;
    for (const entry of this.entries.values()) {
      entry.ring.visible = v;
    }
  }

  addNucleus(id: string, position: [number, number, number] = [0, 0, 0]): void {
    if (this.entries.has(id)) return;

    const meshMat = new THREE.MeshBasicMaterial({ color: 0xffffaa });
    const mesh = new THREE.Mesh(this.coreGeo, meshMat);
    mesh.position.set(...position);
    this.scene.add(mesh);

    const radius = DEFAULT_RING_RADIUS;
    const ring = this.createRing(radius);
    ring.position.set(...position);
    ring.visible = this._showRings;
    this.scene.add(ring);

    const entry: NucleusEntry = {
      id, mesh, meshMat,
      radius,
      ring,
      ringMat: ring.material as THREE.LineBasicMaterial,
    };
    this.entries.set(id, entry);
  }

  removeNucleus(id: string): void {
    const entry = this.entries.get(id);
    if (!entry) return;

    this.scene.remove(entry.mesh);
    this.scene.remove(entry.ring);
    entry.meshMat.dispose();
    entry.ringMat.dispose();
    entry.ring.geometry.dispose();
    this.entries.delete(id);
    if (this._selectedId === id) this._selectedId = null;
  }

  updatePosition(id: string, position: [number, number, number]): void {
    const entry = this.entries.get(id);
    if (!entry) return;
    entry.mesh.position.set(...position);
    entry.ring.position.set(...position);
  }

  /** Update the ring / hit-test radius for this atom (should match the rendered orbital extent). */
  updateRadius(id: string, radius: number): void {
    const entry = this.entries.get(id);
    if (!entry) return;
    if (Math.abs(entry.radius - radius) < 0.01) return;
    entry.radius = radius;
    // Rebuild ring geometry with new radius
    this.scene.remove(entry.ring);
    entry.ring.geometry.dispose();
    const newRing = this.createRing(radius);
    newRing.position.copy(entry.mesh.position);
    newRing.visible = this._showRings;
    entry.ring = newRing;
    entry.ringMat = newRing.material as THREE.LineBasicMaterial;
    this.scene.add(newRing);
  }

  get selectedId(): string | null { return this._selectedId; }
  set selectedId(id: string | null) { this._selectedId = id; }

  /**
  * Test a click (NDC coordinates) against all nucleus meshes.
  * Returns the atom id of the closest hit, or null.
  */
  hitTest(ndcX: number, ndcY: number, camera: THREE.Camera): string | null {
    this.mouse.set(ndcX, ndcY);
    this.raycaster.setFromCamera(this.mouse, camera);

    const meshes: THREE.Mesh[] = [];
    const idByMesh = new Map<THREE.Mesh, string>();
    for (const entry of this.entries.values()) {
      // Per-atom hit sphere scaled to its electron-count-based radius
      const hitGeo = new THREE.SphereGeometry(entry.radius, 16, 16);
      const hitMesh = new THREE.Mesh(hitGeo);
      hitMesh.position.copy(entry.mesh.position);
      hitMesh.updateMatrixWorld(true);
      meshes.push(hitMesh);
      idByMesh.set(hitMesh, entry.id);
    }

    const hits = this.raycaster.intersectObjects(meshes, false);
    // Dispose temp geometries
    for (const m of meshes) m.geometry.dispose();

    if (hits.length > 0) {
      return idByMesh.get(hits[0].object as THREE.Mesh) ?? null;
    }
    return null;
  }

  update(time: number, camera?: THREE.Camera): void {
    const pulse = 1.0 + 0.05 * Math.sin(time * 2);
    for (const entry of this.entries.values()) {
      const isSelected = entry.id === this._selectedId;
      const baseScale = isSelected ? 1.3 : 1.0;
      entry.mesh.scale.setScalar(pulse * baseScale);
      entry.meshMat.color = isSelected
        ? new THREE.Color(0xffffff)
        : new THREE.Color(0xffffaa);

      // Update ring colour based on selection
      entry.ringMat.color.setHex(isSelected ? RING_COLOR_SELECTED : RING_COLOR_DEFAULT);
      entry.ringMat.opacity = isSelected ? 0.9 : 0.5;

      // Billboard the ring to face the camera
      if (camera) {
        entry.ring.quaternion.copy(camera.quaternion);
      }
    }
  }

  /* ─── Helpers ──────────────────────────────────── */

  private createRing(radius: number): THREE.Line {
    const segments = 64;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(theta) * radius, Math.sin(theta) * radius, 0));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({
      color: RING_COLOR_DEFAULT,
      transparent: true,
      opacity: 0.5,
      depthTest: false,
    });
    const ring = new THREE.Line(geo, mat);
    ring.renderOrder = 999;
    return ring;
  }
}

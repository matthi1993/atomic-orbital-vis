import * as THREE from 'three';

interface NucleusEntry {
  id: string;
  mesh: THREE.Mesh;
  meshMat: THREE.MeshBasicMaterial;
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

  /* Shared geometry – created once, reused for every nucleus */
  private coreGeo = new THREE.SphereGeometry(0.3, 32, 32);
  /* Larger invisible sphere for easier clicking */
  private hitGeo = new THREE.SphereGeometry(1.2, 16, 16);

  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  addNucleus(id: string, position: [number, number, number] = [0, 0, 0]): void {
    if (this.entries.has(id)) return;

    const meshMat = new THREE.MeshBasicMaterial({ color: 0xffffaa });
    const mesh = new THREE.Mesh(this.coreGeo, meshMat);
    mesh.position.set(...position);

    this.scene.add(mesh);
    this.entries.set(id, { id, mesh, meshMat });
  }

  removeNucleus(id: string): void {
    const entry = this.entries.get(id);
    if (!entry) return;

    this.scene.remove(entry.mesh);
    entry.meshMat.dispose();
    this.entries.delete(id);
    if (this._selectedId === id) this._selectedId = null;
  }

  updatePosition(id: string, position: [number, number, number]): void {
    const entry = this.entries.get(id);
    if (!entry) return;
    entry.mesh.position.set(...position);
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

    // Collect all core meshes for intersection test
    const meshes: THREE.Mesh[] = [];
    const idByMesh = new Map<THREE.Mesh, string>();
    for (const entry of this.entries.values()) {
      // Use a temporary invisible hit sphere at the same position
      const hitMesh = new THREE.Mesh(this.hitGeo);
      hitMesh.position.copy(entry.mesh.position);
      hitMesh.updateMatrixWorld(true);
      meshes.push(hitMesh);
      idByMesh.set(hitMesh, entry.id);
    }

    const hits = this.raycaster.intersectObjects(meshes, false);
    if (hits.length > 0) {
      return idByMesh.get(hits[0].object as THREE.Mesh) ?? null;
    }
    return null;
  }

  update(time: number): void {
    const pulse = 1.0 + 0.05 * Math.sin(time * 2);
    for (const entry of this.entries.values()) {
      const isSelected = entry.id === this._selectedId;
      const baseScale = isSelected ? 1.3 : 1.0;
      entry.mesh.scale.setScalar(pulse * baseScale);
      entry.meshMat.color = isSelected
        ? new THREE.Color(0xffffff)
        : new THREE.Color(0xffffaa);
    }
  }
}

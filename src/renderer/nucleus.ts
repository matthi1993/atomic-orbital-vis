import * as THREE from 'three';

interface NucleusEntry {
  mesh: THREE.Mesh;
  glow: THREE.Mesh;
  meshMat: THREE.MeshBasicMaterial;
  glowMat: THREE.MeshBasicMaterial;
}

/**
 * Manages one or more nucleus visualisations in the scene.
 * Each nucleus is identified by a string key (typically an Atom ID).
 */
export class Nucleus {
  private scene: THREE.Scene;
  private entries: Map<string, NucleusEntry> = new Map();

  /* Shared geometry – created once, reused for every nucleus */
  private coreGeo = new THREE.SphereGeometry(0.3, 32, 32);
  private glowGeo = new THREE.SphereGeometry(0.6, 32, 32);

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  addNucleus(id: string, position: [number, number, number] = [0, 0, 0]): void {
    if (this.entries.has(id)) return;

    const meshMat = new THREE.MeshBasicMaterial({ color: 0xffffaa });
    const mesh = new THREE.Mesh(this.coreGeo, meshMat);
    mesh.position.set(...position);

    const glowMat = new THREE.MeshBasicMaterial({ color: 0xffffcc, transparent: true, opacity: 0.15 });
    const glow = new THREE.Mesh(this.glowGeo, glowMat);
    glow.position.set(...position);

    this.scene.add(mesh);
    this.scene.add(glow);
    this.entries.set(id, { mesh, glow, meshMat, glowMat });
  }

  removeNucleus(id: string): void {
    const entry = this.entries.get(id);
    if (!entry) return;

    this.scene.remove(entry.mesh);
    this.scene.remove(entry.glow);
    entry.meshMat.dispose();
    entry.glowMat.dispose();
    this.entries.delete(id);
  }

  updatePosition(id: string, position: [number, number, number]): void {
    const entry = this.entries.get(id);
    if (!entry) return;
    entry.mesh.position.set(...position);
    entry.glow.position.set(...position);
  }

  update(time: number): void {
    const pulse = 1.0 + 0.05 * Math.sin(time * 2);
    for (const { mesh, glow } of this.entries.values()) {
      mesh.scale.setScalar(pulse);
      glow.scale.setScalar(pulse * 1.8);
    }
  }
}

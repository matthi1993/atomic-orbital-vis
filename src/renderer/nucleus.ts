import * as THREE from 'three';

export class Nucleus {
  private mesh: THREE.Mesh;
  private glow: THREE.Mesh;

  constructor(scene: THREE.Scene) {
    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xffffaa }),
    );
    scene.add(this.mesh);

    this.glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.6, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xffffcc, transparent: true, opacity: 0.15 }),
    );
    scene.add(this.glow);
  }

  update(time: number): void {
    const pulse = 1.0 + 0.05 * Math.sin(time * 2);
    this.mesh.scale.setScalar(pulse);
    this.glow.scale.setScalar(pulse * 1.8);
  }
}

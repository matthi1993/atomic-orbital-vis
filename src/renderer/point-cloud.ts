import * as THREE from 'three';

export class PointCloud {
  private mesh: THREE.Points | null = null;
  private geometry: THREE.BufferGeometry | null = null;
  private material: THREE.PointsMaterial | null = null;
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  create(count: number, colors: Float32Array, pointSize: number): void {
    this.dispose();

    const positionArray = new Float32Array(count * 3);
    const colorArray = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      colorArray[i * 3 + 0] = colors[i * 4 + 0];
      colorArray[i * 3 + 1] = colors[i * 4 + 1];
      colorArray[i * 3 + 2] = colors[i * 4 + 2];
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positionArray, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));

    this.material = new THREE.PointsMaterial({
      size: pointSize,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.mesh = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.mesh);
  }

  updatePositions(positions: Float32Array): void {
    if (!this.geometry) return;
    const attr = this.geometry.attributes.position as THREE.BufferAttribute;
    (attr.array as Float32Array).set(positions);
    attr.needsUpdate = true;
  }

  set pointSize(size: number) {
    if (this.material && this.material.size !== size) {
      this.material.size = size;
      (this.material as any).needsUpdate = true;
    }
  }

  dispose(): void {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.geometry?.dispose();
      this.material?.dispose();
      this.mesh = null;
      this.geometry = null;
      this.material = null;
    }
  }
}

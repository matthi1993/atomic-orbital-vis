import * as THREE from 'three';

const CIRCLE_SEGMENTS = 8;
const SIZE_SCALE = 0.03;

export class PointCloud {
  private mesh: THREE.InstancedMesh | null = null;
  private geometry: THREE.CircleGeometry | null = null;
  private material: THREE.MeshBasicMaterial | null = null;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private _pointSize = 4.0;
  private count = 0;

  private readonly _mat = new THREE.Matrix4();
  private readonly _pos = new THREE.Vector3();
  private readonly _scl = new THREE.Vector3();

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;
  }

  create(count: number, colors: Float32Array, pointSize: number): void {
    this.dispose();
    this.count = count;
    this._pointSize = pointSize;

    this.geometry = new THREE.CircleGeometry(0.5, CIRCLE_SEGMENTS);

    this.material = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, count);

    // Set per-instance colors
    const colorArray = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      colorArray[i * 3 + 0] = colors[i * 4 + 0];
      colorArray[i * 3 + 1] = colors[i * 4 + 1];
      colorArray[i * 3 + 2] = colors[i * 4 + 2];
    }
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(colorArray, 3);

    this.scene.add(this.mesh);
  }

  updatePositions(positions: Float32Array): void {
    if (!this.mesh) return;

    const q = this.camera.quaternion;
    const s = this._pointSize * SIZE_SCALE;
    this._scl.set(s, s, s);

    for (let i = 0; i < this.count; i++) {
      this._pos.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
      this._mat.compose(this._pos, q, this._scl);
      this.mesh.setMatrixAt(i, this._mat);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  set pointSize(size: number) {
    this._pointSize = size;
  }

  dispose(): void {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.geometry?.dispose();
      this.material?.dispose();
      this.mesh.dispose();
      this.mesh = null;
      this.geometry = null;
      this.material = null;
    }
  }
}

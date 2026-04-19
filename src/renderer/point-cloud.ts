import * as THREE from 'three';

const CIRCLE_SEGMENTS = 8;
const SIZE_SCALE = 0.03;

export class PointCloud {
  private mesh: THREE.InstancedMesh | null = null;
  private geometry: THREE.CircleGeometry | null = null;
  private material: THREE.MeshBasicMaterial | null = null;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  private _pointSize = 4.0;
  private _variablePointSize = true;
  private _opacity = 0.75;
  private _opaqueMode = false;
  private _visible = true;
  private _cutPlane: 'none' | 'x' | 'y' | 'z' = 'none';
  private _fixedScreenSize = false;
  private count = 0;

  private readonly _mat = new THREE.Matrix4();
  private readonly _pos = new THREE.Vector3();
  private readonly _scl = new THREE.Vector3();

  private storedPositions: Float32Array | null = null;
  private storedSizes: Float32Array | null = null;
  private matrixDirty = true;
  private lastQuaternion = new THREE.Quaternion();
  private lastPointSize = 0;
  private lastCutPlane: 'none' | 'x' | 'y' | 'z' = 'none';
  private lastFixedScreenSize = false;
  private lastCameraPosition = new THREE.Vector3();

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera | THREE.OrthographicCamera) {
    this.scene = scene;
    this.camera = camera;
  }

  create(count: number, colors: Float32Array, pointSize: number, sizes?: Float32Array): void {
    this.dispose();
    this.count = count;
    this._pointSize = pointSize;

    this.geometry = new THREE.CircleGeometry(0.5, CIRCLE_SEGMENTS);

    const opaque = this._opaqueMode;
    this.material = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: this._opacity,
      blending: opaque ? THREE.NormalBlending : THREE.AdditiveBlending,
      depthWrite: opaque,
      depthTest: true,
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

    this.storedSizes = sizes ?? null;
    this.scene.add(this.mesh);
  }

  setPositions(positions: Float32Array): void {
    this.storedPositions = positions;
    this.matrixDirty = true;
  }

  updateIfNeeded(): void {
    if (!this.mesh || !this.storedPositions || !this._visible) return;

    const cq = this.camera.quaternion;
    const lq = this.lastQuaternion;
    const qChanged = cq.x !== lq.x || cq.y !== lq.y || cq.z !== lq.z || cq.w !== lq.w;
    const sizeChanged = this._pointSize !== this.lastPointSize;
    const cutChanged = this._cutPlane !== this.lastCutPlane;
    const fixedChanged = this._fixedScreenSize !== this.lastFixedScreenSize;
    const cp = this.camera.position;
    const lp = this.lastCameraPosition;
    const posChanged = this._fixedScreenSize && (cp.x !== lp.x || cp.y !== lp.y || cp.z !== lp.z);

    if (!this.matrixDirty && !qChanged && !sizeChanged && !cutChanged && !fixedChanged && !posChanged) return;

    this.lastQuaternion.copy(this.camera.quaternion);
    this.lastPointSize = this._pointSize;
    this.lastCutPlane = this._cutPlane;
    this.lastFixedScreenSize = this._fixedScreenSize;
    this.lastCameraPosition.copy(this.camera.position);
    this.matrixDirty = false;

    this.rebuildMatrices();
  }

  private rebuildMatrices(): void {
    if (!this.mesh || !this.storedPositions) return;

    const positions = this.storedPositions;
    const sizes = this._variablePointSize ? this.storedSizes : null;
    const q = this.camera.quaternion;
    const baseSize = this._pointSize * SIZE_SCALE;
    const fixed = this._fixedScreenSize;
    const camPos = this.camera.position;

    // For fixed screen-size mode, compute a reference distance so the
    // apparent size at the camera target stays the same as non-fixed mode.
    let distScale = 1;
    if (fixed && this.camera instanceof THREE.PerspectiveCamera) {
      // Scale each point by its distance so perspective foreshortening is cancelled.
      // We normalise against a reference distance so the slider value still
      // controls absolute appearance at the orbit target.
      distScale = 1;
    } else if (fixed && this.camera instanceof THREE.OrthographicCamera) {
      // Ortho zoom is encoded in the camera projection; dividing top by the
      // initial half-height gives us the inverse zoom factor.
      distScale = (this.camera.top) / 10;
    }

    const cut = this._cutPlane;
    const zeroScale = new THREE.Vector3(0, 0, 0);

    for (let i = 0; i < this.count; i++) {
      const px = positions[i * 3];
      const py = positions[i * 3 + 1];
      const pz = positions[i * 3 + 2];
      this._pos.set(px, py, pz);

      const clipped =
        (cut === 'x' && px > 0) ||
        (cut === 'y' && py > 0) ||
        (cut === 'z' && pz > 0);

      let s = sizes ? baseSize * sizes[i] : baseSize;

      if (fixed) {
        if (this.camera instanceof THREE.PerspectiveCamera) {
          const dx = px - camPos.x;
          const dy = py - camPos.y;
          const dz = pz - camPos.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          s *= dist * 0.1;
        } else {
          s *= distScale;
        }
      }

      this._scl.set(s, s, s);
      this._mat.compose(this._pos, q, clipped ? zeroScale : this._scl);
      this.mesh.setMatrixAt(i, this._mat);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  set pointSize(size: number) {
    this._pointSize = size;
  }

  set variablePointSize(value: boolean) {
    if (this._variablePointSize === value) return;
    this._variablePointSize = value;
    this.matrixDirty = true;
  }

  set opacity(value: number) {
    this._opacity = value;
    if (this.material) {
      this.material.opacity = value;
    }
  }

  set visible(value: boolean) {
    this._visible = value;
    if (this.mesh) this.mesh.visible = value;
  }

  set activeCamera(cam: THREE.PerspectiveCamera | THREE.OrthographicCamera) {
    this.camera = cam;
  }

  set opaqueMode(value: boolean) {
    if (this._opaqueMode === value) return;
    this._opaqueMode = value;
    if (this.material) {
      if (value) {
        this.material.blending = THREE.NormalBlending;
        this.material.depthWrite = true;
        this.material.depthTest = true;
      } else {
        this.material.blending = THREE.AdditiveBlending;
        this.material.depthWrite = false;
        this.material.depthTest = true;
      }
      this.material.needsUpdate = true;
    }
  }

  set cutPlane(axis: 'none' | 'x' | 'y' | 'z') {
    this._cutPlane = axis;
  }

  set fixedScreenSize(value: boolean) {
    if (this._fixedScreenSize === value) return;
    this._fixedScreenSize = value;
    this.matrixDirty = true;
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

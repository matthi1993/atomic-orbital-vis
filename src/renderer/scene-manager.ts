import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class SceneManager {
  readonly renderer: THREE.WebGPURenderer;
  readonly scene: THREE.Scene;
  readonly perspCamera: THREE.PerspectiveCamera;
  readonly orthoCamera: THREE.OrthographicCamera;
  readonly controls: OrbitControls;
  private _orthographic = false;
  private _needsRender = true;
  private _lastCamPos = new THREE.Vector3();
  private _lastCamQuat = new THREE.Quaternion();

  constructor(container: HTMLElement) {
    this.renderer = new THREE.WebGPURenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x050510);

    this.scene = new THREE.Scene();
    this.perspCamera = new THREE.PerspectiveCamera(55, 1, 0.01, 1000);
    this.perspCamera.position.set(0, 15, 30);

    this.orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, -5000, 5000);
    this.orthoCamera.position.copy(this.perspCamera.position);

    container.appendChild(this.renderer.domElement);
    this.resize(container.clientWidth, container.clientHeight);

    this.controls = new OrbitControls(this.perspCamera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 0.5;
    this.controls.maxDistance = 1000;
    this.controls.autoRotate = false;
    this.controls.autoRotateSpeed = 0;
  }

  get camera(): THREE.PerspectiveCamera | THREE.OrthographicCamera {
    return this._orthographic ? this.orthoCamera : this.perspCamera;
  }

  set orthographic(enabled: boolean) {
    if (enabled === this._orthographic) return;
    this._orthographic = enabled;

    const from = enabled ? this.perspCamera : this.orthoCamera;
    const to = enabled ? this.orthoCamera : this.perspCamera;

    to.position.copy(from.position);
    to.quaternion.copy(from.quaternion);

    if (enabled) {
      const dist = from.position.length();
      const halfH = dist * Math.tan(THREE.MathUtils.degToRad(this.perspCamera.fov / 2));
      const halfW = halfH * this.perspCamera.aspect;
      this.orthoCamera.left = -halfW;
      this.orthoCamera.right = halfW;
      this.orthoCamera.top = halfH;
      this.orthoCamera.bottom = -halfH;
      this.orthoCamera.updateProjectionMatrix();
    }

    this.controls.object = to;
    this.controls.update();
  }

  set autoRotateSpeed(speed: number) {
    this.controls.autoRotate = speed > 0;
    this.controls.autoRotateSpeed = speed * 10;
  }

  async init(): Promise<void> {
    await this.renderer.init();
  }

  get device(): GPUDevice {
    return (this.renderer as any).backend.device;
  }

  resize(width: number, height: number): void {
    const aspect = width / height;
    this.perspCamera.aspect = aspect;
    this.perspCamera.updateProjectionMatrix();

    if (this._orthographic) {
      const dist = this.orthoCamera.position.length();
      const halfH = dist * Math.tan(THREE.MathUtils.degToRad(this.perspCamera.fov / 2));
      const halfW = halfH * aspect;
      this.orthoCamera.left = -halfW;
      this.orthoCamera.right = halfW;
      this.orthoCamera.top = halfH;
      this.orthoCamera.bottom = -halfH;
      this.orthoCamera.updateProjectionMatrix();
    }

    this.renderer.setSize(width, height);
  }

  markDirty(): void {
    this._needsRender = true;
  }

  render(): boolean {
    this.controls.update();

    // Detect if camera actually moved since last frame
    const cam = this.camera;
    const posChanged = !(cam.position as any).equals(this._lastCamPos);
    const quatChanged = !(cam.quaternion as any).equals(this._lastCamQuat);
    if (posChanged || quatChanged) {
      this._needsRender = true;
      this._lastCamPos.copy(cam.position);
      this._lastCamQuat.copy(cam.quaternion);
    }

    if (!this._needsRender) return false;
    this._needsRender = false;

    if (this._orthographic) {
      const dist = this.orthoCamera.position.length();
      const halfH = dist * Math.tan(THREE.MathUtils.degToRad(this.perspCamera.fov / 2));
      const halfW = halfH * this.perspCamera.aspect;
      this.orthoCamera.left = -halfW;
      this.orthoCamera.right = halfW;
      this.orthoCamera.top = halfH;
      this.orthoCamera.bottom = -halfH;
      this.orthoCamera.updateProjectionMatrix();
    }

    this.renderer.render(this.scene, this.camera);
    return true;
  }

  /** Snap the active camera to look along a world axis. */
  lookAlongAxis(axis: 'x' | 'y' | 'z'): void {
    const dist = this.camera.position.length() || 30;
    const cam = this.camera;
    switch (axis) {
      case 'x': cam.position.set(dist, 0, 0); break;
      case 'y': cam.position.set(0, dist, 0); break;
      case 'z': cam.position.set(0, 0, dist); break;
    }
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }
}

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { FieldData } from '../physics/charge-field.js';

/**
 * Renders an electric-field vector field as small 3D arrows using InstancedMesh.
 *
 * Each arrow is a merged cone+cylinder geometry pointing along +Y by default.
 * Per-instance matrices orient & scale arrows along the local field vector.
 * Per-instance colours map field magnitude to a cool→warm gradient.
 */
export class FieldArrows {
  private scene: THREE.Scene;
  private mesh: THREE.InstancedMesh | null = null;
  private geometry: THREE.BufferGeometry | null = null;
  private material: THREE.MeshBasicMaterial | null = null;
  private _visible = true;
  private maxCount = 0;

  /** Pre-allocated helpers */
  private readonly _mat = new THREE.Matrix4();
  private readonly _up = new THREE.Vector3(0, 1, 0);
  private readonly _dir = new THREE.Vector3();
  private readonly _quat = new THREE.Quaternion();
  private readonly _pos = new THREE.Vector3();
  private readonly _scl = new THREE.Vector3();
  private readonly _col = new THREE.Color();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /* ─── Public API ──────────────────────────────────── */

  set visible(v: boolean) {
    this._visible = v;
    if (this.mesh) this.mesh.visible = v;
  }

  get visible(): boolean {
    return this._visible;
  }

  /**
   * Rebuild arrow instances from field data.
   */
  update(data: FieldData): void {
    const { field, res, extent } = data;
    const total = res * res * res;
    const step = (2 * extent) / (res - 1);

    // Find max magnitude for normalisation
    let maxMag = 0;
    for (let i = 0; i < total; i++) {
      const ex = field[i * 3 + 0];
      const ey = field[i * 3 + 1];
      const ez = field[i * 3 + 2];
      const mag = Math.sqrt(ex * ex + ey * ey + ez * ez);
      if (mag > maxMag) maxMag = mag;
    }
    if (maxMag === 0) maxMag = 1;

    // Max visual arrow length = 80 % of grid spacing
    const maxLen = step * 0.8;

    // (Re)create mesh if needed
    if (!this.mesh || this.maxCount !== total) {
      this.dispose();
      this.geometry = FieldArrows.buildArrowGeometry();
      this.material = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        depthTest: true,
      });
      this.mesh = new THREE.InstancedMesh(this.geometry, this.material, total);
      this.mesh.instanceColor = new THREE.InstancedBufferAttribute(
        new Float32Array(total * 3), 3,
      );
      this.mesh.frustumCulled = false;
      this.mesh.visible = this._visible;
      this.scene.add(this.mesh);
      this.maxCount = total;
    }

    const colorArr = (this.mesh.instanceColor as THREE.InstancedBufferAttribute).array as Float32Array;

    for (let iz = 0; iz < res; iz++) {
      const pz = -extent + iz * step;
      for (let iy = 0; iy < res; iy++) {
        const py = -extent + iy * step;
        for (let ix = 0; ix < res; ix++) {
          const idx = iz * res * res + iy * res + ix;
          const ex = field[idx * 3 + 0];
          const ey = field[idx * 3 + 1];
          const ez = field[idx * 3 + 2];
          const mag = Math.sqrt(ex * ex + ey * ey + ez * ez);

          const px = -extent + ix * step;
          this._pos.set(px, py, pz);

          // Normalised magnitude (0–1) using log scale for better range
          const t = Math.log1p(mag) / Math.log1p(maxMag);

          // Scale arrow length with magnitude; cap at maxLen * 0.6
          const arrowLen = maxLen * 0.6 * t;

          if (mag < 1e-12 || t < 0.05) {
            // Below threshold or zero-field: hide by scaling to zero
            this._mat.makeScale(0, 0, 0);
            this._mat.setPosition(this._pos);
          } else {
            // Direction
            this._dir.set(ex / mag, ey / mag, ez / mag);
            this._quat.setFromUnitVectors(this._up, this._dir);
            this._scl.set(arrowLen, arrowLen, arrowLen);
            this._mat.compose(this._pos, this._quat, this._scl);
          }

          this.mesh.setMatrixAt(idx, this._mat);

          // Colour: cool (blue-cyan) → warm (yellow-red) via t
          this.fieldColor(t, this._col);
          colorArr[idx * 3 + 0] = this._col.r;
          colorArr[idx * 3 + 1] = this._col.g;
          colorArr[idx * 3 + 2] = this._col.b;
        }
      }
    }

    this.mesh.instanceMatrix.needsUpdate = true;
    (this.mesh.instanceColor as THREE.InstancedBufferAttribute).needsUpdate = true;
  }

  dispose(): void {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.dispose();
      this.mesh = null;
    }
    this.geometry?.dispose();
    this.geometry = null;
    this.material?.dispose();
    this.material = null;
    this.maxCount = 0;
  }

  /* ─── Internals ───────────────────────────────────── */

  /** Map t ∈ [0,1] to a dim→vivid colour.  Weak fields are dim, strong are bright saturated. */
  private fieldColor(t: number, out: THREE.Color): void {
    // Hue: blue (weak) → cyan → yellow → red (strong)
    // Brightness scales with t so weak arrows are faint
    const brightness = 0.15 + 0.85 * t;
    if (t < 0.5) {
      const s = t * 2; // 0→1
      out.r = 0.1 * s * brightness;
      out.g = (0.3 + 0.7 * s) * brightness;
      out.b = (0.6 + 0.4 * (1 - s)) * brightness;
    } else {
      const s = (t - 0.5) * 2; // 0→1
      out.r = (0.8 + 0.2 * s) * brightness;
      out.g = (0.8 - 0.5 * s) * brightness;
      out.b = 0.05 * (1 - s) * brightness;
    }
  }

  /**
   * Build a unit arrow geometry pointing along +Y.
   * Shaft: cylinder  (radius 0.04, height 0.65, centred at y=0.325)
   * Head:  cone      (radius 0.12, height 0.35, centred at y=0.825)
   */
  private static buildArrowGeometry(): THREE.BufferGeometry {
    const shaft = new THREE.CylinderGeometry(0.04, 0.04, 0.65, 6, 1);
    shaft.translate(0, 0.325, 0);

    const head = new THREE.ConeGeometry(0.12, 0.35, 6);
    head.translate(0, 0.825, 0);

    const merged = mergeGeometries([shaft, head], false);

    shaft.dispose();
    head.dispose();

    return merged;
  }
}

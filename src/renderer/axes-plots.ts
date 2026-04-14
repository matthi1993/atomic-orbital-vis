import * as THREE from 'three';
import { radialWave, sphericalHarmonic } from '../physics/quantum.js';

/**
 * Draws coordinate axes and 2D wave-function cross-section curves
 * directly in the 3D scene so the user can see which radial / angular
 * components combine to form the orbital shape.
 *
 *  • R(r)   – radial wave function plotted along +X (height in Y)
 *  • Y(θ)   – polar plot of |Y_l^m(θ, φ=0/π)| in the XZ plane
 *  • Y(φ)   – polar plot of |Y_l^m(π/2, φ)|   in the XY plane
 *
 * Positive-phase regions are drawn in blue, negative in red –
 * matching the orbital point-cloud colouring convention.
 */
export class AxesPlots {
  private root = new THREE.Group();
  private axesGroup = new THREE.Group();
  private radialGroup = new THREE.Group();
  private combinedGroup = new THREE.Group();
  private thetaGroup = new THREE.Group();
  private phiGroup = new THREE.Group();
  private disposables: { geometry?: THREE.BufferGeometry; material?: THREE.Material; texture?: THREE.Texture }[] = [];

  /** Currently targeted group for addLine / addSprite helpers */
  private _target!: THREE.Group;

  constructor(private scene: THREE.Scene) {
    this.root.renderOrder = 999;
    this.root.add(this.axesGroup, this.radialGroup, this.combinedGroup, this.thetaGroup, this.phiGroup);
    scene.add(this.root);
  }

  /* ── visibility toggles ────────────────────────────────────────── */

  set showAxes(v: boolean) { this.axesGroup.visible = v; }
  get showAxes(): boolean { return this.axesGroup.visible; }

  set showRadialPlot(v: boolean) { this.radialGroup.visible = v; }
  get showRadialPlot(): boolean { return this.radialGroup.visible; }

  set showCombinedPlot(v: boolean) { this.combinedGroup.visible = v; }
  get showCombinedPlot(): boolean { return this.combinedGroup.visible; }

  set showThetaPlot(v: boolean) { this.thetaGroup.visible = v; }
  get showThetaPlot(): boolean { return this.thetaGroup.visible; }

  set showPhiPlot(v: boolean) { this.phiGroup.visible = v; }
  get showPhiPlot(): boolean { return this.phiGroup.visible; }

  /* ── rebuild everything for the current quantum numbers ────────── */

  update(n: number, l: number, m: number, scale: number): void {
    this.clear();

    const rMax = scale * n * n;
    const axisLen = rMax * 0.8;

    this._target = this.axesGroup;
    this.buildAxes(axisLen);

    // Keep plot groups hidden (plots removed from UI)
    this.radialGroup.visible = false;
    this.combinedGroup.visible = false;
    this.thetaGroup.visible = false;
    this.phiGroup.visible = false;
  }

  /* ── coordinate axes ──────────────────────────────────────────── */

  private buildAxes(extent: number): void {
    const axes: { dir: THREE.Vector3; color: number; label: string }[] = [
      { dir: new THREE.Vector3(1, 0, 0), color: 0xff4444, label: 'x' },
      { dir: new THREE.Vector3(0, 1, 0), color: 0x44ff44, label: 'y' },
      { dir: new THREE.Vector3(0, 0, 1), color: 0x4488ff, label: 'z' },
    ];

    for (const { dir, color, label } of axes) {
      /* thin axis line */
      this.addLine(
        [dir.clone().multiplyScalar(-extent), dir.clone().multiplyScalar(extent)],
        color,
        0.35,
      );

      /* label sprite at positive end */
      const sprite = this.makeLabel(label, color);
      sprite.position.copy(dir.clone().multiplyScalar(extent * 1.1));
      sprite.scale.set(1.2, 0.3, 1);
      this._target.add(sprite);
    }
  }

  /* ── Radial wave-function R(r) along +X (height in Y) ─────────── */

  private buildRadialPlot(n: number, l: number, rMax: number, axisLen: number): void {
    const STEPS = 300;
    const values: number[] = [];
    let peak = 0;

    for (let i = 0; i <= STEPS; i++) {
      const r = (i / STEPS) * rMax;
      const R = radialWave(n, l, r);
      values.push(R);
      peak = Math.max(peak, Math.abs(R));
    }
    if (peak === 0) return;

    const plotH = axisLen * 0.35;

    /* R(r) is the same in every direction – plot once along +X */
    this.buildRadialAlongDir(
      values, STEPS, rMax, axisLen, plotH, peak,
      new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0),
    );

    /* label on the +X axis at the end of the plot */
    const lbl = this.makeLabel('R(r)', 0x88bbff);
    lbl.position.set(axisLen * 1.05, 0, 0);
    lbl.scale.set(axisLen * 0.1, axisLen * 0.025, 1);
    this._target.add(lbl);
  }

  /** Trace R(r) along a single axis half-line with height in a perpendicular direction. */
  private buildRadialAlongDir(
    values: number[], steps: number, rMax: number, axisLen: number,
    plotH: number, peak: number, axis: THREE.Vector3, perp: THREE.Vector3,
  ): void {
    let seg: THREE.Vector3[] = [];
    let sign = 0;

    const flush = () => {
      if (seg.length >= 2) {
        this.addLine(seg, sign >= 0 ? 0x4499ff : 0xff4466, 0.85, 2);
      }
    };

    for (let i = 0; i <= steps; i++) {
      const r = (i / steps) * rMax;
      const R = values[i];
      const s = R >= 0 ? 1 : -1;
      const dist = (r / rMax) * axisLen;
      const height = (R / peak) * plotH;
      const pt = axis.clone().multiplyScalar(dist).add(perp.clone().multiplyScalar(height));

      if (i > 0 && s !== sign) {
        seg.push(pt);
        flush();
        seg = [pt];
      } else {
        seg.push(pt);
      }
      sign = s;
    }
    flush();
  }

  /* ── Combined ψ = R(r)·Y(θ,φ) along each axis direction ───────── */

  private buildCombinedPlot(n: number, l: number, m: number, rMax: number, axisLen: number): void {
    const STEPS = 300;
    const plotH = axisLen * 0.35;

    /* each half-axis with its fixed (θ, φ) in spherical coords */
    const dirs: { axis: THREE.Vector3; perp: THREE.Vector3; theta: number; phi: number }[] = [
      { axis: new THREE.Vector3(1, 0, 0),  perp: new THREE.Vector3(0, 1, 0), theta: Math.PI / 2, phi: 0 },
      { axis: new THREE.Vector3(-1, 0, 0), perp: new THREE.Vector3(0, 1, 0), theta: Math.PI / 2, phi: Math.PI },
      { axis: new THREE.Vector3(0, 1, 0),  perp: new THREE.Vector3(1, 0, 0), theta: Math.PI / 2, phi: Math.PI / 2 },
      { axis: new THREE.Vector3(0, -1, 0), perp: new THREE.Vector3(1, 0, 0), theta: Math.PI / 2, phi: 3 * Math.PI / 2 },
      { axis: new THREE.Vector3(0, 0, 1),  perp: new THREE.Vector3(0, 1, 0), theta: 0,          phi: 0 },
      { axis: new THREE.Vector3(0, 0, -1), perp: new THREE.Vector3(0, 1, 0), theta: Math.PI,     phi: 0 },
    ];

    /* find global peak across all directions for consistent scaling */
    let peak = 0;
    for (const { theta, phi } of dirs) {
      const Y = sphericalHarmonic(l, m, theta, phi);
      for (let i = 0; i <= STEPS; i++) {
        const r = (i / STEPS) * rMax;
        const R = radialWave(n, l, r);
        peak = Math.max(peak, Math.abs(R * Y));
      }
    }
    if (peak === 0) return;

    for (const { axis, perp, theta, phi } of dirs) {
      const Y = sphericalHarmonic(l, m, theta, phi);
      if (Math.abs(Y) < 1e-12) continue;

      let seg: THREE.Vector3[] = [];
      let sign = 0;

      const flush = () => {
        if (seg.length >= 2) {
          this.addLine(seg, sign >= 0 ? 0x44ddff : 0xff8844, 0.9, 2);
        }
      };

      for (let i = 0; i <= STEPS; i++) {
        const r = (i / STEPS) * rMax;
        const R = radialWave(n, l, r);
        const psi = R * Y;
        const s = psi >= 0 ? 1 : -1;
        const dist = (r / rMax) * axisLen;
        const height = (psi / peak) * plotH;
        const pt = axis.clone().multiplyScalar(dist).add(perp.clone().multiplyScalar(height));

        if (i > 0 && s !== sign) {
          seg.push(pt);
          flush();
          seg = [pt];
        } else {
          seg.push(pt);
        }
        sign = s;
      }
      flush();
    }

    /* label on the −X axis at the end of the plot */
    const lbl = this.makeLabel('ψ(r)', 0x44ddff);
    lbl.position.set(-axisLen * 1.05, 0, 0);
    lbl.scale.set(axisLen * 0.1, axisLen * 0.025, 1);
    this._target.add(lbl);
  }

  /* ── Angular θ-cross-section (XZ plane, containing polar axis Z) ── */

  private buildAngularThetaPlot(l: number, m: number, axisLen: number): void {
    const STEPS = 200;
    const plotR = axisLen * 0.45;

    /* find peak |Y| for normalisation */
    let peak = 0;
    for (let i = 0; i <= STEPS; i++) {
      const theta = (i / STEPS) * Math.PI;
      peak = Math.max(peak, Math.abs(sphericalHarmonic(l, m, theta, 0)));
      peak = Math.max(peak, Math.abs(sphericalHarmonic(l, m, theta, Math.PI)));
    }
    if (peak === 0) return;

    /* right half: φ = 0, θ ∈ [0, π] */
    this.polarHalf(STEPS, plotR, peak, (theta) => sphericalHarmonic(l, m, theta, 0), false);
    /* left half:  φ = π, θ ∈ [0, π] (mirrored to −x) */
    this.polarHalf(STEPS, plotR, peak, (theta) => sphericalHarmonic(l, m, theta, Math.PI), true);

    /* label on the +Z axis at the edge of the polar plot */
    const lbl = this.makeLabel('Y(θ)', 0xaaddaa);
    lbl.position.set(0, 0, plotR * 1.15);
    lbl.scale.set(axisLen * 0.1, axisLen * 0.025, 1);
    this._target.add(lbl);
  }

  /** Trace one half of the θ polar diagram in the XZ plane. */
  private polarHalf(
    steps: number,
    plotR: number,
    peak: number,
    fn: (theta: number) => number,
    flipX: boolean,
  ): void {
    let seg: THREE.Vector3[] = [];
    let sign = 0;

    const flush = () => {
      if (seg.length >= 2) {
        this.addLine(seg, sign >= 0 ? 0x4499ff : 0xff4466, 0.75, 2);
      }
    };

    for (let i = 0; i <= steps; i++) {
      const theta = (i / steps) * Math.PI;
      const Y = fn(theta);
      const r = (Math.abs(Y) / peak) * plotR;
      const s = Y >= 0 ? 1 : -1;

      let x = r * Math.sin(theta);
      if (flipX) x = -x;
      const z = r * Math.cos(theta);

      const pt = new THREE.Vector3(x, 0, z);

      if (i > 0 && s !== sign) {
        seg.push(pt);
        flush();
        seg = [pt];
      } else {
        seg.push(pt);
      }
      sign = s;
    }
    flush();
  }

  /* ── Angular φ-cross-section (XY plane, equatorial θ = π/2) ─────── */

  private buildAngularPhiPlot(l: number, m: number, axisLen: number): void {
    const STEPS = 300;
    const plotR = axisLen * 0.45;

    let peak = 0;
    for (let i = 0; i <= STEPS; i++) {
      const phi = (i / STEPS) * 2 * Math.PI;
      peak = Math.max(peak, Math.abs(sphericalHarmonic(l, m, Math.PI / 2, phi)));
    }
    if (peak === 0) return;

    let seg: THREE.Vector3[] = [];
    let sign = 0;

    const flush = () => {
      if (seg.length >= 2) {
        this.addLine(seg, sign >= 0 ? 0x4499ff : 0xff4466, 0.75, 2);
      }
    };

    for (let i = 0; i <= STEPS; i++) {
      const phi = (i / STEPS) * 2 * Math.PI;
      const Y = sphericalHarmonic(l, m, Math.PI / 2, phi);
      const r = (Math.abs(Y) / peak) * plotR;
      const s = Y >= 0 ? 1 : -1;

      const x = r * Math.cos(phi);
      const y = r * Math.sin(phi);
      const pt = new THREE.Vector3(x, y, 0);

      if (i > 0 && s !== sign) {
        seg.push(pt);
        flush();
        seg = [pt];
      } else {
        seg.push(pt);
      }
      sign = s;
    }
    flush();

    /* label on the +Y axis at the edge of the polar plot */
    const lbl = this.makeLabel('Y(φ)', 0xddaadd);
    lbl.position.set(0, plotR * 1.15, 0);
    lbl.scale.set(axisLen * 0.1, axisLen * 0.025, 1);
    this._target.add(lbl);
  }

  /* ── helpers ──────────────────────────────────────────────────── */

  private addLine(
    points: THREE.Vector3[],
    color: number,
    opacity: number,
    linewidth = 1,
  ): void {
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity,
      linewidth,
      depthTest: false,
      depthWrite: false,
    });
    const line = new THREE.Line(geo, mat);
    line.renderOrder = 999;
    this._target.add(line);
    this.disposables.push({ geometry: geo, material: mat });
  }

  private makeLabel(text: string, color: number): THREE.Sprite {
    const w = 256;
    const h = 64;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.renderOrder = 999;
    this.disposables.push({ material: mat, texture });
    return sprite;
  }

  private clearGroup(group: THREE.Group): void {
    while (group.children.length) {
      group.remove(group.children[0]);
    }
  }

  private clear(): void {
    for (const d of this.disposables) {
      d.geometry?.dispose();
      d.material?.dispose();
      d.texture?.dispose();
    }
    this.disposables.length = 0;
    this.clearGroup(this.axesGroup);
    this.clearGroup(this.radialGroup);
    this.clearGroup(this.combinedGroup);
    this.clearGroup(this.thetaGroup);
    this.clearGroup(this.phiGroup);
  }

  dispose(): void {
    this.clear();
    this.scene.remove(this.root);
  }
}

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
  private group = new THREE.Group();
  private disposables: { geometry?: THREE.BufferGeometry; material?: THREE.Material; texture?: THREE.Texture }[] = [];

  constructor(private scene: THREE.Scene) {
    scene.add(this.group);
  }

  /* ── visibility toggle ─────────────────────────────────────────── */

  set visible(v: boolean) {
    this.group.visible = v;
  }

  get visible(): boolean {
    return this.group.visible;
  }

  /* ── rebuild everything for the current quantum numbers ────────── */

  update(n: number, l: number, m: number, scale: number): void {
    this.clear();

    const rMax = scale * n * n;
    const axisLen = rMax * 0.8;

    this.buildAxes(axisLen);
    this.buildRadialPlot(n, l, rMax, axisLen);
    this.buildAngularThetaPlot(l, m, axisLen);
    this.buildAngularPhiPlot(l, m, axisLen);
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
      sprite.scale.setScalar(extent * 0.09);
      this.group.add(sprite);
    }
  }

  /* ── Radial wave-function R(r) along +X, height in Y ──────────── */

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

    /* walk along the curve; every time the sign flips we flush
       the current segment so positive → blue, negative → red.   */
    let seg: THREE.Vector3[] = [];
    let sign = 0;

    const flush = () => {
      if (seg.length >= 2) {
        this.addLine(seg, sign >= 0 ? 0x4499ff : 0xff4466, 0.85, 2);
      }
    };

    for (let i = 0; i <= STEPS; i++) {
      const r = (i / STEPS) * rMax;
      const R = values[i];
      const s = R >= 0 ? 1 : -1;
      const x = (r / rMax) * axisLen;
      const y = (R / peak) * plotH;
      const pt = new THREE.Vector3(x, y, 0);

      if (i > 0 && s !== sign) {
        /* include the crossing point in both segments */
        seg.push(pt);
        flush();
        seg = [pt];
      } else {
        seg.push(pt);
      }
      sign = s;
    }
    flush();

    /* label */
    const lbl = this.makeLabel('R(r)', 0x88bbff);
    lbl.position.set(axisLen * 0.5, plotH * 1.15, 0);
    lbl.scale.setScalar(axisLen * 0.07);
    this.group.add(lbl);
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

    const lbl = this.makeLabel('Y(θ)', 0xaaddaa);
    lbl.position.set(plotR * 0.6, 0, plotR * 0.85);
    lbl.scale.setScalar(axisLen * 0.07);
    this.group.add(lbl);
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

    const lbl = this.makeLabel('Y(φ)', 0xddaadd);
    lbl.position.set(plotR * 0.85, plotR * 0.6, 0);
    lbl.scale.setScalar(axisLen * 0.07);
    this.group.add(lbl);
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
      depthTest: true,
    });
    const line = new THREE.Line(geo, mat);
    this.group.add(line);
    this.disposables.push({ geometry: geo, material: mat });
  }

  private makeLabel(text: string, color: number): THREE.Sprite {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
    ctx.font = 'bold 72px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, size / 2, size / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    });
    const sprite = new THREE.Sprite(mat);
    this.disposables.push({ material: mat, texture });
    return sprite;
  }

  private clear(): void {
    for (const d of this.disposables) {
      d.geometry?.dispose();
      d.material?.dispose();
      d.texture?.dispose();
    }
    this.disposables.length = 0;
    while (this.group.children.length) {
      this.group.remove(this.group.children[0]);
    }
  }

  dispose(): void {
    this.clear();
    this.scene.remove(this.group);
  }
}

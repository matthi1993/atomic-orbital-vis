import * as THREE from 'three';

/**
 * Draws infinite coordinate axes (x / y / z) as simple lines in the
 * 3D scene.  GL lines are always 1 px wide on screen regardless of
 * zoom.  Label sprites are rescaled each frame to stay constant size.
 */
export class AxesPlots {
  private root = new THREE.Group();
  private axesGroup = new THREE.Group();
  private disposables: { geometry?: THREE.BufferGeometry; material?: THREE.Material; texture?: THREE.Texture }[] = [];

  constructor(private scene: THREE.Scene) {
    this.root.renderOrder = 999;
    this.root.add(this.axesGroup);
    scene.add(this.root);
  }

  /* ── visibility toggle ─────────────────────────────────────────── */

  set showAxes(v: boolean) { this.axesGroup.visible = v; }
  get showAxes(): boolean { return this.axesGroup.visible; }

  /* ── rebuild axes ──────────────────────────────────────────────── */

  update(_n: number, _l: number, _m: number, _scale: number): void {
    this.clear();
    this.buildAxes();
  }

  /** No-op kept for API compatibility with the render loop. */
  updateScale(_camera: THREE.Camera): void {}

  /* ── coordinate axes ──────────────────────────────────────────── */

  private buildAxes(): void {
    const FAR = 500;               // effectively infinite

    const axes: { dir: THREE.Vector3; color: number; label: string }[] = [
      { dir: new THREE.Vector3(1, 0, 0), color: 0xff4444, label: 'x' },
      { dir: new THREE.Vector3(0, 1, 0), color: 0x44ff44, label: 'y' },
      { dir: new THREE.Vector3(0, 0, 1), color: 0x4488ff, label: 'z' },
    ];

    for (const { dir, color, label } of axes) {
      const geo = new THREE.BufferGeometry().setFromPoints([
        dir.clone().multiplyScalar(-FAR),
        dir.clone().multiplyScalar(FAR),
      ]);
      const mat = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.45,
        depthTest: false,
        depthWrite: false,
      });
      const line = new THREE.Line(geo, mat);
      line.renderOrder = 999;
      this.axesGroup.add(line);
      this.disposables.push({ geometry: geo, material: mat });
    }
  }

  /* ── helpers ──────────────────────────────────────────────────── */

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
  }

  dispose(): void {
    this.clear();
    this.scene.remove(this.root);
  }
}

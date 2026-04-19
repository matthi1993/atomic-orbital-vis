import * as THREE from 'three';

type Axis = 'x' | 'y' | 'z';

const AXIS_COLORS: Record<Axis, number> = { x: 0xff4444, y: 0x44ff44, z: 0x4488ff };
const HANDLE_LENGTH = 3.0;
const CONE_RADIUS = 0.2;
const CONE_HEIGHT = 0.7;
const SHAFT_RADIUS = 0.04;

export interface HandleDragEvent {
  atomId: string;
  axis: Axis;
  position: [number, number, number];
}

/**
 * Per-axis arrow handle: a thin cylinder shaft + cone arrowhead.
 * Invisible hit meshes are slightly larger for easier clicking.
 */
interface AxisHandle {
  axis: Axis;
  group: THREE.Group;
  shaftMesh: THREE.Mesh;
  coneMesh: THREE.Mesh;
  hitMesh: THREE.Mesh;            // invisible, larger hit area
  material: THREE.MeshBasicMaterial;
  hoverMaterial: THREE.MeshBasicMaterial;
  isHovered: boolean;
}

/**
 * Displays XYZ translation handles on the selected atom and manages
 * pointer-based dragging to move the atom along a single world axis.
 */
export class AxisHandles {
  private scene: THREE.Scene;
  private root = new THREE.Group();
  private handles: AxisHandle[] = [];
  private _visible = false;
  private _atomId: string | null = null;

  /* Drag state */
  private dragging: AxisHandle | null = null;
  private dragPlane = new THREE.Plane();
  private dragStartWorld = new THREE.Vector3();
  private dragStartPos = new THREE.Vector3();

  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private tmpVec = new THREE.Vector3();

  /** Called by the host when the atom position changed due to a drag */
  onDrag: ((evt: HandleDragEvent) => void) | null = null;
  /** Called when drag ends so the host can regenerate */
  onDragEnd: (() => void) | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.root.visible = false;
    this.scene.add(this.root);
    this.buildHandles();
  }

  /* ─── public API ─────────────────────────────────── */

  /** Attach handles to the given atom position. Pass null to hide. */
  attach(atomId: string | null, position: [number, number, number] | null): void {
    this._atomId = atomId;
    if (atomId && position) {
      this.root.position.set(...position);
      this.root.visible = true;
      this._visible = true;
    } else {
      this.root.visible = false;
      this._visible = false;
    }
  }

  updatePosition(position: [number, number, number]): void {
    this.root.position.set(...position);
  }

  get visible(): boolean { return this._visible; }
  get isDragging(): boolean { return this.dragging !== null; }

  /** Scale handles so they appear constant-size regardless of camera distance */
  updateScale(camera: THREE.Camera): void {
    if (!this._visible) return;
    const dist = camera.position.distanceTo(this.root.position);
    const scale = Math.max(dist * 0.06, 0.5);
    this.root.scale.setScalar(scale);
  }

  /* ─── pointer events (called from the host component) ── */

  /** Returns true if a handle was hit (caller should suppress orbit controls). */
  pointerDown(ndcX: number, ndcY: number, camera: THREE.Camera): boolean {
    if (!this._visible || !this._atomId) return false;

    this.mouse.set(ndcX, ndcY);
    this.raycaster.setFromCamera(this.mouse, camera);

    const hitMeshes = this.handles.map(h => h.hitMesh);
    const hits = this.raycaster.intersectObjects(hitMeshes, false);
    if (hits.length === 0) return false;

    const hitMesh = hits[0].object as THREE.Mesh;
    const handle = this.handles.find(h => h.hitMesh === hitMesh);
    if (!handle) return false;

    this.dragging = handle;
    this.dragStartPos.copy(this.root.position);

    // Build a drag plane: contains the axis direction and faces the camera
    const axisDir = this.axisVector(handle.axis);
    const camDir = new THREE.Vector3().subVectors(camera.position, this.root.position).normalize();
    // Plane normal = cross(axis, cross(camDir, axis)) — perpendicular to axis, facing camera
    const planeNormal = new THREE.Vector3().crossVectors(camDir, axisDir).cross(axisDir).normalize();
    if (planeNormal.lengthSq() < 1e-6) {
      // Axis is parallel to camera direction; use camera up as fallback
      planeNormal.crossVectors(camera.up, axisDir).normalize();
    }
    this.dragPlane.setFromNormalAndCoplanarPoint(planeNormal, this.root.position);

    // Record the initial intersection point
    this.raycaster.ray.intersectPlane(this.dragPlane, this.dragStartWorld);

    return true;
  }

  pointerMove(ndcX: number, ndcY: number, camera: THREE.Camera): boolean {
    if (!this._visible) return false;

    // Hover detection
    this.mouse.set(ndcX, ndcY);
    this.raycaster.setFromCamera(this.mouse, camera);

    if (!this.dragging) {
      const hitMeshes = this.handles.map(h => h.hitMesh);
      const hits = this.raycaster.intersectObjects(hitMeshes, false);
      const hoveredMesh = hits.length > 0 ? hits[0].object : null;

      for (const h of this.handles) {
        const nowHovered = h.hitMesh === hoveredMesh;
        if (nowHovered !== h.isHovered) {
          h.isHovered = nowHovered;
          const mat = nowHovered ? h.hoverMaterial : h.material;
          h.shaftMesh.material = mat;
          h.coneMesh.material = mat;
        }
      }
      return false;
    }

    // Active drag
    const intersect = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(this.dragPlane, intersect)) return true;

    const delta = intersect.sub(this.dragStartWorld);
    const axisDir = this.axisVector(this.dragging.axis);
    const projected = axisDir.multiplyScalar(delta.dot(axisDir));

    this.tmpVec.copy(this.dragStartPos).add(projected);
    this.root.position.copy(this.tmpVec);

    if (this.onDrag && this._atomId) {
      this.onDrag({
        atomId: this._atomId,
        axis: this.dragging.axis,
        position: [this.tmpVec.x, this.tmpVec.y, this.tmpVec.z],
      });
    }
    return true;
  }

  pointerUp(): void {
    if (this.dragging) {
      this.dragging = null;
      if (this.onDragEnd) this.onDragEnd();
    }
  }

  /* ─── internals ──────────────────────────────────── */

  private axisVector(axis: Axis): THREE.Vector3 {
    switch (axis) {
      case 'x': return new THREE.Vector3(1, 0, 0);
      case 'y': return new THREE.Vector3(0, 1, 0);
      case 'z': return new THREE.Vector3(0, 0, 1);
    }
  }

  private buildHandles(): void {
    const axes: Axis[] = ['x', 'y', 'z'];
    const shaftGeo = new THREE.CylinderGeometry(SHAFT_RADIUS, SHAFT_RADIUS, HANDLE_LENGTH, 8);
    shaftGeo.translate(0, HANDLE_LENGTH / 2, 0);
    const coneGeo = new THREE.ConeGeometry(CONE_RADIUS, CONE_HEIGHT, 12);
    coneGeo.translate(0, HANDLE_LENGTH + CONE_HEIGHT / 2, 0);
    // Invisible hit area: a wider cylinder covering shaft + cone
    const hitGeo = new THREE.CylinderGeometry(CONE_RADIUS * 1.8, CONE_RADIUS * 1.8, HANDLE_LENGTH + CONE_HEIGHT, 8);
    hitGeo.translate(0, (HANDLE_LENGTH + CONE_HEIGHT) / 2, 0);

    for (const axis of axes) {
      const color = AXIS_COLORS[axis];
      const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, depthTest: false });
      const hoverMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthTest: false });

      const shaftMesh = new THREE.Mesh(shaftGeo, material);
      shaftMesh.renderOrder = 999;
      const coneMesh = new THREE.Mesh(coneGeo, material);
      coneMesh.renderOrder = 999;
      const hitMesh = new THREE.Mesh(hitGeo, new THREE.MeshBasicMaterial({ visible: false }));

      const group = new THREE.Group();
      group.add(shaftMesh);
      group.add(coneMesh);
      group.add(hitMesh);

      // Rotate so the handle points along the correct axis
      // Default geometry points along +Y
      if (axis === 'x') group.rotation.z = -Math.PI / 2;
      if (axis === 'z') group.rotation.x = Math.PI / 2;
      // 'y' needs no rotation

      this.root.add(group);

      this.handles.push({ axis, group, shaftMesh, coneMesh, hitMesh, material, hoverMaterial, isHovered: false });
    }
  }

  dispose(): void {
    this.scene.remove(this.root);
    for (const h of this.handles) {
      h.material.dispose();
      h.hoverMaterial.dispose();
    }
  }
}

import * as THREE from 'three';

type Axis = 'x' | 'y' | 'z';

const AXIS_COLORS: Record<Axis, number> = { x: 0xff4444, y: 0x44ff44, z: 0x4488ff };
const RING_RADIUS = 2.5;
const TUBE_RADIUS = 0.035;
const HIT_TUBE_RADIUS = 0.35;

/* ─── Quaternion helpers matching the GPU shader convention ─────────
 *
 * The GPU shader builds Rz·Ry·Rx (extrinsic XYZ / intrinsic ZYX).
 * The corresponding quaternion is  Q = Qz · Qy · Qx.
 * ------------------------------------------------------------------ */
type Q = [number, number, number, number]; // [x,y,z,w]

function eulerToQ(xDeg: number, yDeg: number, zDeg: number): Q {
  const toRad = Math.PI / 180;
  const s1 = Math.sin(xDeg * toRad / 2), c1 = Math.cos(xDeg * toRad / 2);
  const s2 = Math.sin(yDeg * toRad / 2), c2 = Math.cos(yDeg * toRad / 2);
  const s3 = Math.sin(zDeg * toRad / 2), c3 = Math.cos(zDeg * toRad / 2);
  // Q = Qz · Qy · Qx
  return [
    c3 * c2 * s1 - s3 * s2 * c1,
    c3 * s2 * c1 + s3 * c2 * s1,
    s3 * c2 * c1 - c3 * s2 * s1,
    c3 * c2 * c1 + s3 * s2 * s1,
  ];
}

function axisAngleToQ(axis: Axis, deg: number): Q {
  const half = deg * Math.PI / 360;
  const s = Math.sin(half), c = Math.cos(half);
  return [
    axis === 'x' ? s : 0,
    axis === 'y' ? s : 0,
    axis === 'z' ? s : 0,
    c,
  ];
}

function mulQ(a: Q, b: Q): Q {
  return [
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
  ];
}

function qToEuler(q: Q): [number, number, number] {
  const [x, y, z, w] = q;
  const toDeg = 180 / Math.PI;
  // Extraction matching Rz·Ry·Rx matrix:
  //   M[2][0] = -sy = 2(xz - wy)
  //   M[2][1] = sx·cy = 2(yz + wx)
  //   M[2][2] = cx·cy = 1 - 2(x² + y²)
  //   M[1][0] = cy·sz = 2(xy + wz)
  //   M[0][0] = cy·cz = 1 - 2(y² + z²)
  const sinBeta = 2 * (w * y - z * x);
  if (Math.abs(sinBeta) >= 0.9999) {
    // Gimbal lock
    const beta = Math.sign(sinBeta) * 90;
    const alpha = Math.atan2(2 * (w * x + y * z), 1 - 2 * (x * x + y * y)) * toDeg;
    return [alpha, beta, 0];
  }
  const beta = Math.asin(sinBeta) * toDeg;
  const alpha = Math.atan2(2 * (w * x + y * z), 1 - 2 * (x * x + y * y)) * toDeg;
  const gamma = Math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z)) * toDeg;
  return [alpha, beta, gamma];
}

/** Apply a world-space axis rotation to an existing Euler rotation. */
function composeWorldRotation(
  startEuler: [number, number, number], axis: Axis, deltaDeg: number,
): [number, number, number] {
  const startQ = eulerToQ(startEuler[0], startEuler[1], startEuler[2]);
  const deltaQ = axisAngleToQ(axis, deltaDeg);
  const newQ = mulQ(deltaQ, startQ); // world-space: delta on the LEFT
  return qToEuler(newQ);
}

export interface RotationDragEvent {
  atomId: string;
  axis: Axis;
  rotation: [number, number, number]; // Euler angles in degrees
}

interface RingHandle {
  axis: Axis;
  ringMesh: THREE.Mesh;
  hitMesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  hoverMaterial: THREE.MeshBasicMaterial;
  isHovered: boolean;
}

/**
 * Displays XYZ rotation ring handles on the selected atom and manages
 * pointer-based dragging to rotate the atom around a single world axis.
 */
export class RotationHandles {
  private scene: THREE.Scene;
  private root = new THREE.Group();
  private handles: RingHandle[] = [];
  private _visible = false;
  private _atomId: string | null = null;

  /* Drag state */
  private dragging: RingHandle | null = null;
  private dragPlane = new THREE.Plane();
  private dragStartAngle = 0;
  private dragStartRotation: [number, number, number] = [0, 0, 0];

  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  /** Called by the host when the atom rotation changed due to a drag */
  onDrag: ((evt: RotationDragEvent) => void) | null = null;
  /** Called when drag ends so the host can regenerate */
  onDragEnd: (() => void) | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.root.visible = false;
    this.scene.add(this.root);
    this.buildHandles();
  }

  /* ─── public API ─────────────────────────────────── */

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

  updateScale(camera: THREE.Camera): void {
    if (!this._visible) return;
    const dist = camera.position.distanceTo(this.root.position);
    const scale = Math.max(dist * 0.06, 0.5);
    this.root.scale.setScalar(scale);
  }

  /* ─── pointer events ─────────────────────────────── */

  pointerDown(ndcX: number, ndcY: number, camera: THREE.Camera, currentRotation: [number, number, number]): boolean {
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
    this.dragStartRotation = [...currentRotation];

    // The drag plane is perpendicular to the rotation axis, passing through the root
    const normal = this.axisVector(handle.axis);
    this.dragPlane.setFromNormalAndCoplanarPoint(normal, this.root.position);

    // Record starting angle
    const intersect = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(this.dragPlane, intersect)) {
      this.dragStartAngle = this.getAngleOnPlane(intersect, handle.axis);
    }

    return true;
  }

  pointerMove(ndcX: number, ndcY: number, camera: THREE.Camera): boolean {
    if (!this._visible) return false;

    this.mouse.set(ndcX, ndcY);
    this.raycaster.setFromCamera(this.mouse, camera);

    if (!this.dragging) {
      // Hover detection
      const hitMeshes = this.handles.map(h => h.hitMesh);
      const hits = this.raycaster.intersectObjects(hitMeshes, false);
      const hoveredMesh = hits.length > 0 ? hits[0].object : null;

      for (const h of this.handles) {
        const nowHovered = h.hitMesh === hoveredMesh;
        if (nowHovered !== h.isHovered) {
          h.isHovered = nowHovered;
          const mat = nowHovered ? h.hoverMaterial : h.material;
          h.ringMesh.material = mat;
        }
      }
      return false;
    }

    // Active drag
    const intersect = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(this.dragPlane, intersect)) return true;

    const currentAngle = this.getAngleOnPlane(intersect, this.dragging.axis);
    let deltaAngle = (currentAngle - this.dragStartAngle) * (180 / Math.PI);

    // Snap to 5-degree increments
    deltaAngle = Math.round(deltaAngle / 5) * 5;

    // Compose in world space: newQ = axisRot(delta) * startQ → back to Euler XYZ
    const newRotation = composeWorldRotation(
      this.dragStartRotation, this.dragging.axis, deltaAngle,
    );

    if (this.onDrag && this._atomId) {
      this.onDrag({
        atomId: this._atomId,
        axis: this.dragging.axis,
        rotation: newRotation,
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

  /** Get angle of a world point projected onto the rotation plane. */
  private getAngleOnPlane(worldPoint: THREE.Vector3, axis: Axis): number {
    const local = worldPoint.clone().sub(this.root.position);
    switch (axis) {
      case 'x': return Math.atan2(local.z, local.y);
      case 'y': return Math.atan2(local.x, local.z);
      case 'z': return Math.atan2(local.y, local.x);
    }
  }

  private buildHandles(): void {
    const axes: Axis[] = ['x', 'y', 'z'];
    const ringGeo = new THREE.TorusGeometry(RING_RADIUS, TUBE_RADIUS, 8, 64);
    const hitGeo = new THREE.TorusGeometry(RING_RADIUS, HIT_TUBE_RADIUS, 8, 64);

    for (const axis of axes) {
      const color = AXIS_COLORS[axis];
      const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, depthTest: false });
      const hoverMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthTest: false });

      const ringMesh = new THREE.Mesh(ringGeo, material);
      ringMesh.renderOrder = 998;
      const hitMesh = new THREE.Mesh(hitGeo, new THREE.MeshBasicMaterial({ visible: false }));

      // TorusGeometry lies in XY plane by default. Rotate to align with the correct axis.
      if (axis === 'x') {
        ringMesh.rotation.y = Math.PI / 2;
        hitMesh.rotation.y = Math.PI / 2;
      } else if (axis === 'y') {
        ringMesh.rotation.x = Math.PI / 2;
        hitMesh.rotation.x = Math.PI / 2;
      }
      // 'z' needs no rotation (torus already in XY plane = rotation around Z)

      this.root.add(ringMesh);
      this.root.add(hitMesh);

      this.handles.push({ axis, ringMesh, hitMesh, material, hoverMaterial, isHovered: false });
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

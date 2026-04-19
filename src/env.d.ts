/// <reference types="vite/client" />

// Lean Three.js type declarations for the WebGPU build
declare module 'three' {
  export class Vector3 {
    constructor(x?: number, y?: number, z?: number);
    x: number; y: number; z: number;
    set(x: number, y: number, z: number): this;
    setScalar(scalar: number): this;
    clone(): Vector3;
    copy(v: Vector3): this;
    add(v: Vector3): this;
    multiplyScalar(scalar: number): this;
    length(): number;
    distanceTo(v: Vector3): number;
  }

  export class Euler {
    constructor(x?: number, y?: number, z?: number, order?: string);
    x: number; y: number; z: number;
  }

  export class Color {
    constructor(color?: number | string);
  }

  export class Quaternion {
    constructor(x?: number, y?: number, z?: number, w?: number);
    x: number; y: number; z: number; w: number;
    copy(q: Quaternion): this;
  }

  export class Matrix4 {
    constructor();
    compose(position: Vector3, quaternion: Quaternion, scale: Vector3): this;
  }

  export class Object3D {
    add(...objects: Object3D[]): this;
    remove(...objects: Object3D[]): this;
    scale: Vector3;
    position: Vector3;
    rotation: Euler;
    quaternion: Quaternion;
    visible: boolean;
    children: Object3D[];
    renderOrder: number;
    updateMatrixWorld(force?: boolean): void;
  }

  export class Group extends Object3D {}

  export class Scene extends Object3D {}

  export class Camera extends Object3D {}

  export class PerspectiveCamera extends Camera {
    constructor(fov?: number, aspect?: number, near?: number, far?: number);
    fov: number;
    aspect: number;
    updateProjectionMatrix(): void;
  }

  export class OrthographicCamera extends Camera {
    constructor(left?: number, right?: number, top?: number, bottom?: number, near?: number, far?: number);
    left: number;
    right: number;
    top: number;
    bottom: number;
    updateProjectionMatrix(): void;
  }

  export class BufferAttribute {
    constructor(array: ArrayLike<number>, itemSize: number);
    array: ArrayLike<number>;
    needsUpdate: boolean;
  }

  export class BufferGeometry {
    setAttribute(name: string, attribute: BufferAttribute): this;
    setFromPoints(points: Vector3[]): this;
    attributes: Record<string, BufferAttribute>;
    dispose(): void;
  }

  export class Material {
    dispose(): void;
  }

  export class Texture {
    dispose(): void;
  }

  export class CanvasTexture extends Texture {
    constructor(canvas: HTMLCanvasElement);
  }

  export class PointsMaterial extends Material {
    constructor(params?: {
      size?: number;
      vertexColors?: boolean;
      transparent?: boolean;
      opacity?: number;
      sizeAttenuation?: boolean;
      blending?: number;
      depthWrite?: boolean;
    });
    size: number;
  }

  export class Points extends Object3D {
    constructor(geometry?: BufferGeometry, material?: PointsMaterial);
  }

  export class SphereGeometry extends BufferGeometry {
    constructor(radius?: number, widthSegments?: number, heightSegments?: number);
  }

  export class CylinderGeometry extends BufferGeometry {
    constructor(radiusTop?: number, radiusBottom?: number, height?: number, radialSegments?: number, heightSegments?: number);
    translate(x: number, y: number, z: number): this;
  }

  export class MeshBasicMaterial extends Material {
    constructor(params?: {
      color?: number | string;
      transparent?: boolean;
      opacity?: number;
      blending?: number;
      depthWrite?: boolean;
      depthTest?: boolean;
    });
    color: Color;
    opacity: number;
    blending: number;
    depthWrite: boolean;
    depthTest: boolean;
    needsUpdate: boolean;
  }

  export class Mesh extends Object3D {
    constructor(geometry?: BufferGeometry, material?: Material);
  }

  export class Line extends Object3D {
    constructor(geometry?: BufferGeometry, material?: Material);
  }

  export class LineBasicMaterial extends Material {
    constructor(params?: {
      color?: number | string;
      transparent?: boolean;
      opacity?: number;
      linewidth?: number;
      depthTest?: boolean;
      depthWrite?: boolean;
    });
  }

  export class SpriteMaterial extends Material {
    constructor(params?: {
      map?: Texture;
      transparent?: boolean;
      depthTest?: boolean;
      depthWrite?: boolean;
    });
  }

  export class Sprite extends Object3D {
    constructor(material?: SpriteMaterial);
  }

  export class CircleGeometry extends BufferGeometry {
    constructor(radius?: number, segments?: number);
  }

  export class InstancedBufferAttribute extends BufferAttribute {
    constructor(array: ArrayLike<number>, itemSize: number);
  }

  export class InstancedMesh extends Object3D {
    constructor(geometry: BufferGeometry, material: Material, count: number);
    instanceMatrix: InstancedBufferAttribute;
    instanceColor: InstancedBufferAttribute | null;
    count: number;
    setMatrixAt(index: number, matrix: Matrix4): void;
    setColorAt(index: number, color: Color): void;
    dispose(): void;
  }

  export const AdditiveBlending: number;
  export const NormalBlending: number;

  export namespace MathUtils {
    function degToRad(degrees: number): number;
  }

  export class WebGPURenderer {
    constructor(params?: { antialias?: boolean });
    domElement: HTMLCanvasElement;
    backend: { device: GPUDevice };
    setSize(width: number, height: number): void;
    setPixelRatio(ratio: number): void;
    setClearColor(color: number | Color, alpha?: number): void;
    render(scene: Scene, camera: Camera): void;
    init(): Promise<void>;
  }

  export class Vector2 {
    constructor(x?: number, y?: number);
    x: number; y: number;
    set(x: number, y: number): this;
  }

  export interface Intersection {
    distance: number;
    point: Vector3;
    object: Object3D;
  }

  export class Raycaster {
    constructor();
    setFromCamera(coords: Vector2, camera: Camera): void;
    intersectObjects(objects: Object3D[], recursive?: boolean): Intersection[];
  }
}

declare module 'three/examples/jsm/controls/OrbitControls.js' {
  import { Camera, Vector3 } from 'three';

  export class OrbitControls {
    constructor(camera: Camera, domElement: HTMLElement);
    object: Camera;
    target: Vector3;
    enableDamping: boolean;
    dampingFactor: number;
    minDistance: number;
    maxDistance: number;
    autoRotate: boolean;
    autoRotateSpeed: number;
    update(): void;
    dispose(): void;
  }
}

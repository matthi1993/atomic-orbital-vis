/// <reference types="vite/client" />

// Lean Three.js type declarations for the WebGPU build
declare module 'three' {
  export class Vector3 {
    constructor(x?: number, y?: number, z?: number);
    x: number; y: number; z: number;
    set(x: number, y: number, z: number): this;
    setScalar(scalar: number): this;
  }

  export class Color {
    constructor(color?: number | string);
  }

  export class Object3D {
    add(...objects: Object3D[]): this;
    remove(...objects: Object3D[]): this;
    scale: Vector3;
    position: Vector3;
  }

  export class Scene extends Object3D {}

  export class Camera extends Object3D {}

  export class PerspectiveCamera extends Camera {
    constructor(fov?: number, aspect?: number, near?: number, far?: number);
    aspect: number;
    updateProjectionMatrix(): void;
  }

  export class BufferAttribute {
    constructor(array: ArrayLike<number>, itemSize: number);
    array: ArrayLike<number>;
    needsUpdate: boolean;
  }

  export class BufferGeometry {
    setAttribute(name: string, attribute: BufferAttribute): this;
    attributes: Record<string, BufferAttribute>;
    dispose(): void;
  }

  export class Material {
    dispose(): void;
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

  export class MeshBasicMaterial extends Material {
    constructor(params?: {
      color?: number | string;
      transparent?: boolean;
      opacity?: number;
    });
  }

  export class Mesh extends Object3D {
    constructor(geometry?: BufferGeometry, material?: Material);
  }

  export const AdditiveBlending: number;

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
}

declare module 'three/examples/jsm/controls/OrbitControls.js' {
  import { Camera } from 'three';

  export class OrbitControls {
    constructor(camera: Camera, domElement: HTMLElement);
    enableDamping: boolean;
    dampingFactor: number;
    minDistance: number;
    maxDistance: number;
    update(): void;
    dispose(): void;
  }
}

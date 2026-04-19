import type { SceneManager } from '../renderer/scene-manager.js';
import type { Nucleus } from '../renderer/nucleus.js';
import type { AxisHandles } from '../renderer/axis-handles.js';

export type PointerDownResult =
  | { type: 'handle' }
  | { type: 'nucleus'; atomId: string }
  | { type: 'miss' };

/**
 * Translates raw pointer events into semantic interaction results.
 * Handles NDC conversion, hit-testing against nuclei, and
 * forwarding axis-handle pointer state.
 */
export class InteractionService {
  constructor(
    private sceneManager: SceneManager,
    private nucleus: Nucleus,
    private axisHandles: AxisHandles,
  ) {}

  get canvas(): HTMLCanvasElement {
    return this.sceneManager.renderer.domElement;
  }

  handlePointerDown(e: PointerEvent): PointerDownResult {
    const [ndcX, ndcY] = this.getNdc(e);

    if (this.axisHandles.pointerDown(ndcX, ndcY, this.sceneManager.camera)) {
      (this.sceneManager.controls as any).enabled = false;
      this.sceneManager.markDirty();
      return { type: 'handle' };
    }

    const hitId = this.nucleus.hitTest(ndcX, ndcY, this.sceneManager.camera);
    if (hitId) {
      return { type: 'nucleus', atomId: hitId };
    }

    return { type: 'miss' };
  }

  handlePointerMove(e: PointerEvent): boolean {
    const [ndcX, ndcY] = this.getNdc(e);
    if (this.axisHandles.pointerMove(ndcX, ndcY, this.sceneManager.camera)) {
      this.sceneManager.markDirty();
      return true;
    }
    return false;
  }

  handlePointerUp(): void {
    if (this.axisHandles.isDragging) {
      (this.sceneManager.controls as any).enabled = true;
    }
    this.axisHandles.pointerUp();
  }

  private getNdc(e: PointerEvent): [number, number] {
    const canvas = this.sceneManager.renderer.domElement;
    const rect = canvas.getBoundingClientRect();
    return [
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    ];
  }
}

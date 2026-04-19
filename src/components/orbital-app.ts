import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import type { OrbitalParams } from '../types.js';
import { DEFAULT_PARAMS } from '../config/params.js';
import { AtomManager } from '../physics/atom-manager.js';
import { OrbitalPipeline } from '../gpu/orbital-pipeline.js';
import { SceneManager } from '../renderer/scene-manager.js';
import { PointCloud } from '../renderer/point-cloud.js';
import { Nucleus } from '../renderer/nucleus.js';
import { AxesPlots } from '../renderer/axes-plots.js';
import { AxisHandles } from '../renderer/axis-handles.js';
import { RotationHandles } from '../renderer/rotation-handles.js';
import { SelectionService } from '../services/selection-service.js';
import { AtomService } from '../services/atom-service.js';
import { ParticleService } from '../services/particle-service.js';
import { RenderLoopService } from '../services/render-loop-service.js';
import { InteractionService } from '../services/interaction-service.js';
import { theme } from './styles/index.js';
import './render-panel.js';
import './atom-editor.js';
import './atom-list.js';
import type { AtomEditorChange, AtomPresetChange, AtomOrbitalSelect, AtomSpinFlip } from './atom-editor.js';
import type { AtomAddRequest, AtomDeleteRequest, AtomSelectRequest } from './atom-list.js';

/** Compute the delta quaternion (current · start⁻¹) from two Euler rotations (radians).
 *  Convention matches the GPU shader: Rz·Ry·Rx  →  Q = Qz·Qy·Qx.
 */
function eulerDelta(
  sx: number, sy: number, sz: number,
  cx: number, cy: number, cz: number,
): [number, number, number, number] {
  // Euler → quaternion (Q = Qz·Qy·Qx, extrinsic XYZ)
  const toQ = (x: number, y: number, z: number): [number, number, number, number] => {
    const s1 = Math.sin(x / 2), c1 = Math.cos(x / 2);
    const s2 = Math.sin(y / 2), c2 = Math.cos(y / 2);
    const s3 = Math.sin(z / 2), c3 = Math.cos(z / 2);
    return [
      c3 * c2 * s1 - s3 * s2 * c1,
      c3 * s2 * c1 + s3 * c2 * s1,
      s3 * c2 * c1 - c3 * s2 * s1,
      c3 * c2 * c1 + s3 * s2 * s1,
    ];
  };
  const sq = toQ(sx, sy, sz);
  const cq = toQ(cx, cy, cz);
  // invert start quaternion (conjugate for unit quaternions)
  const invX = -sq[0], invY = -sq[1], invZ = -sq[2], invW = sq[3];
  // delta = current * start⁻¹
  return [
    cq[3] * invX + cq[0] * invW + cq[1] * invZ - cq[2] * invY,
    cq[3] * invY - cq[0] * invZ + cq[1] * invW + cq[2] * invX,
    cq[3] * invZ + cq[0] * invY - cq[1] * invX + cq[2] * invW,
    cq[3] * invW - cq[0] * invX - cq[1] * invY - cq[2] * invZ,
  ];
}

@customElement('orbital-app')
export class OrbitalApp extends LitElement {
  @state() private params: OrbitalParams = { ...DEFAULT_PARAMS };
  @state() private webgpuAvailable = 'gpu' in navigator;
  @state() private selectedAtomId: string | null = null;
  @state() private atomVersion = 0;

  private atomManager = new AtomManager();
  private sceneManager!: SceneManager;
  private pointCloud!: PointCloud;
  private selectionService!: SelectionService;
  private atomService!: AtomService;
  private particleService!: ParticleService;
  private renderLoopService!: RenderLoopService;
  private interactionService!: InteractionService;

  /* Drag-start tracking for real-time point-cloud transform */
  private _translationDragStart: [number, number, number] | null = null;
  private _rotationDragStart: [number, number, number] | null = null;

  /* Click vs drag detection for selection */
  private _pointerDownPos: { x: number; y: number } | null = null;
  private _pointerDownResult: import('../services/interaction-service.js').PointerDownResult | null = null;
  private static readonly CLICK_THRESHOLD = 5; // px

  static styles = [
    ...theme,
    css`
      :host {
        display: block;
        width: 100vw;
        height: 100vh;
        position: relative;
      }

      .canvas-container { width: 100%; height: 100%; }
      .canvas-container canvas { display: block; }

      .bottom-right {
        position: absolute;
        bottom: var(--sp-lg);
        right: var(--sp-lg);
        z-index: 10;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: var(--sp-sm);
        font-family: var(--font-family);
        pointer-events: none;
      }

      .legend {
        display: flex;
        flex-direction: column;
        gap: 5px;
        background: rgba(10, 10, 30, 0.7);
        border: 1px solid var(--c-border-subtle);
        border-radius: 6px;
        padding: 8px 12px;
        font-size: var(--fs-sm);
        color: var(--c-text-muted);
      }

      .legend-title {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--c-text-dim);
        margin-bottom: 2px;
      }

      .legend-row {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .legend-swatch {
        width: 12px;
        height: 12px;
        border-radius: 3px;
        flex-shrink: 0;
      }

      .info {
        font-size: var(--fs-sm);
        color: var(--c-text-dim);
      }

      .no-webgpu {
        display: flex;
        position: fixed;
        inset: 0;
        background: #111;
        justify-content: center;
        align-items: center;
        flex-direction: column;
        font-size: 20px;
        color: var(--c-text-error);
        text-align: center;
        padding: 40px;
        font-family: var(--font-family);
      }

      .no-webgpu .hint {
        font-size: var(--fs-md);
        color: var(--c-text-dim);
        margin-top: var(--sp-sm);
      }

      .left-column {
        position: absolute;
        top: var(--sp-lg);
        left: var(--sp-lg);
        z-index: 10;
        display: flex;
        flex-direction: column;
        gap: var(--sp-md);
        max-height: calc(100vh - 2 * var(--sp-lg));
        overflow-y: auto;
      }

      .left-column atom-list,
      .left-column atom-editor {
        position: static;
      }
    `,
  ];

  render() {
    if (!this.webgpuAvailable) {
      return html`
        <div class="no-webgpu">
          WebGPU is not available in this browser.
          <span class="hint">Try Chrome 113+ or Edge 113+ with WebGPU enabled.</span>
        </div>
      `;
    }

    return html`
      <div class="canvas-container"></div>
      <div class="left-column">
        <atom-list
          .atoms=${this.atomManager.all}
          .selectedAtomId=${this.selectedAtomId}
          .version=${this.atomVersion}
          @atom-select=${this.onAtomSelect}
          @atom-add=${this.onAtomAdd}
          @atom-delete=${this.onAtomDelete}
        ></atom-list>
        <atom-editor
          .atom=${this.selectedAtomId ? this.atomManager.getAtom(this.selectedAtomId) ?? null : null}
          .version=${this.atomVersion}
          @atom-edit=${this.onAtomEdit}
          @atom-preset=${this.onAtomPreset}
          @atom-orbital-select=${this.onAtomOrbitalSelect}
          @atom-spin-flip=${this.onAtomSpinFlip}
        ></atom-editor>
      </div>
      <render-panel
        .params=${this.params}
        @param-change=${this.onParamChange}
        @camera-view=${this.onCameraView}
      ></render-panel>
      <div class="bottom-right">
        <div class="legend">
          <div class="legend-title">Orbital colours</div>
          <div class="legend-row">
            <span class="legend-swatch" style="background: rgb(51, 102, 255)"></span>
            <span>Half-filled (ψ +)</span>
          </div>
          <div class="legend-row">
            <span class="legend-swatch" style="background: rgb(204, 77, 25)"></span>
            <span>Half-filled (ψ −)</span>
          </div>
          <div class="legend-row">
            <span class="legend-swatch" style="background: rgb(38, 255, 255)"></span>
            <span>Full (ψ +)</span>
          </div>
          <div class="legend-row">
            <span class="legend-swatch" style="background: rgb(255, 230, 13)"></span>
            <span>Full (ψ −)</span>
          </div>
        </div>
        <div class="info">Drag to rotate · Scroll to zoom · Click nucleus to select</div>
      </div>
    `;
  }

  /* ─── Lifecycle ─────────────────────────────────── */

  async firstUpdated() {
    if (!this.webgpuAvailable) return;

    const container = this.shadowRoot!.querySelector('.canvas-container') as HTMLElement;
    this.sceneManager = new SceneManager(container);
    await this.sceneManager.init();

    const pipeline = new OrbitalPipeline(this.sceneManager.device);
    const pointCloud = new PointCloud(this.sceneManager.scene, this.sceneManager.camera);
    this.pointCloud = pointCloud;
    const nucleus = new Nucleus(this.sceneManager.scene);
    const axesPlots = new AxesPlots(this.sceneManager.scene);
    const axisHandles = new AxisHandles(this.sceneManager.scene);
    const rotationHandles = new RotationHandles(this.sceneManager.scene);

    // Wire up domain services
    this.selectionService = new SelectionService(this.atomManager, nucleus, axisHandles, rotationHandles, this.sceneManager);
    this.atomService = new AtomService(this.atomManager, nucleus, axisHandles, rotationHandles, this.sceneManager, this.selectionService);
    this.particleService = new ParticleService(this.atomManager, pipeline, pointCloud, nucleus, axesPlots, this.sceneManager);
    this.renderLoopService = new RenderLoopService(pointCloud, nucleus, axisHandles, rotationHandles, axesPlots, this.sceneManager);
    this.interactionService = new InteractionService(this.sceneManager, nucleus, axisHandles, rotationHandles);

    axisHandles.onDrag = this.onHandleDrag;
    axisHandles.onDragEnd = this.onHandleDragEnd;
    rotationHandles.onDrag = this.onRotationDrag;
    rotationHandles.onDragEnd = this.onRotationDragEnd;

    // Create initial hydrogen atom at the origin
    this.atomService.addAtom();
    this.selectedAtomId = this.selectionService.selectedAtomId;

    this.renderLoopService.params = this.params;
    await this.particleService.regenerate(this.params);
    this.renderLoopService.start();

    const canvas = this.interactionService.canvas;
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('resize', this.onResize);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.renderLoopService?.stop();
    const canvas = this.interactionService?.canvas;
    canvas?.removeEventListener('pointerdown', this.onPointerDown);
    canvas?.removeEventListener('pointermove', this.onPointerMove);
    canvas?.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('resize', this.onResize);
  }

  /* ─── Event handlers (thin delegation to services) ── */

  private onResize = () => {
    const container = this.shadowRoot?.querySelector('.canvas-container') as HTMLElement | null;
    if (container) this.sceneManager.resize(container.clientWidth, container.clientHeight);
  };

  private onParamChange = (e: CustomEvent<{ key: string; value: number | boolean | string }>) => {
    const { key, value } = e.detail;
    this.params = { ...this.params, [key]: value };
    this.renderLoopService.params = this.params;

    if (key === 'count' || key === 'threshold' || key === 'scale') {
      this.atomManager.markAllDirty();
      this.particleService.regenerate(this.params);
    }
  };

  private onCameraView = (e: CustomEvent<{ axis: string }>) => {
    this.sceneManager.lookAlongAxis(e.detail.axis as 'x' | 'y' | 'z');
  };

  private onPointerDown = (e: PointerEvent) => {
    // Provide current rotation for rotation handle drag start
    if (this.selectedAtomId) {
      const atom = this.atomManager.getAtom(this.selectedAtomId);
      if (atom) this.interactionService.currentRotation = [...atom.rotation];
    }

    const result = this.interactionService.handlePointerDown(e);
    if (result.type === 'handle' || result.type === 'rotation-handle') return;

    // Defer selection to pointerup so camera drags don't affect it
    this._pointerDownPos = { x: e.clientX, y: e.clientY };
    this._pointerDownResult = result;
  };

  private onPointerMove = (e: PointerEvent) => {
    this.interactionService.handlePointerMove(e);
  };

  private onPointerUp = (e: PointerEvent) => {
    this.interactionService.handlePointerUp();

    // Only select/deselect if pointer didn't move (click, not drag)
    if (this._pointerDownPos && this._pointerDownResult) {
      const dx = e.clientX - this._pointerDownPos.x;
      const dy = e.clientY - this._pointerDownPos.y;
      if (dx * dx + dy * dy < OrbitalApp.CLICK_THRESHOLD * OrbitalApp.CLICK_THRESHOLD) {
        if (this._pointerDownResult.type === 'nucleus') {
          this.selectionService.select(this._pointerDownResult.atomId);
        } else {
          this.selectionService.deselect();
        }
        this.selectedAtomId = this.selectionService.selectedAtomId;
        this.atomVersion++;
      }
    }
    this._pointerDownPos = null;
    this._pointerDownResult = null;
  };

  private onAtomSelect = (e: CustomEvent<AtomSelectRequest>) => {
    this.selectionService.select(e.detail.atomId);
    this.selectedAtomId = this.selectionService.selectedAtomId;
    this.atomVersion++;
  };

  private onAtomAdd = (_e: CustomEvent<AtomAddRequest>) => {
    const copyFrom = this.selectedAtomId ? this.atomManager.getAtom(this.selectedAtomId) : undefined;
    this.atomService.addAtom(copyFrom);
    this.selectedAtomId = this.selectionService.selectedAtomId;
    this.particleService.regenerate(this.params);
    this.atomVersion++;
  };

  private onAtomDelete = (e: CustomEvent<AtomDeleteRequest>) => {
    this.atomService.removeAtom(e.detail.atomId);
    this.selectedAtomId = this.selectionService.selectedAtomId;
    this.particleService.regenerate(this.params);
    this.atomVersion++;
  };

  private onAtomEdit = (e: CustomEvent<AtomEditorChange>) => {
    this.atomService.editAtom(e.detail.atomId, e.detail.key, e.detail.value);
    this.particleService.regenerate(this.params);
    this.atomVersion++;
  };

  private onAtomPreset = (e: CustomEvent<AtomPresetChange>) => {
    const { atomId, preset } = e.detail;
    this.atomService.applyPreset(atomId, preset.Z, preset.e);
    this.particleService.regenerate(this.params);
    this.atomVersion++;
  };

  private onAtomOrbitalSelect = (e: CustomEvent<AtomOrbitalSelect>) => {
    this.atomService.selectOrbital(e.detail.atomId, e.detail.layer, e.detail.orbitalIndex);
    this.particleService.regenerate(this.params);
    this.atomVersion++;
  };

  private onAtomSpinFlip = (e: CustomEvent<AtomSpinFlip>) => {
    this.atomService.flipSpin(e.detail.atomId);
    this.particleService.regenerate(this.params);
    this.atomVersion++;
  };

  private onHandleDrag = (evt: import('../renderer/axis-handles.js').HandleDragEvent) => {
    // Capture pre-drag position on first event
    if (!this._translationDragStart) {
      const atom = this.atomManager.getAtom(evt.atomId);
      if (atom) {
        this._translationDragStart = [...atom.position] as [number, number, number];
        const centers = new Map(this.atomManager.all.map(a => [a.id, a.position] as const));
        this.pointCloud.saveDragStart(centers, evt.atomId);
      }
    }
    this.atomService.handleDrag(evt);
    // Apply visual offset to point cloud
    if (this._translationDragStart) {
      const atom = this.atomManager.getAtom(evt.atomId);
      if (atom) {
        this.pointCloud.setDragTranslation(
          atom.position[0] - this._translationDragStart[0],
          atom.position[1] - this._translationDragStart[1],
          atom.position[2] - this._translationDragStart[2],
        );
        this.sceneManager.markDirty();
      }
    }
    this.atomVersion++;
  };

  private onHandleDragEnd = async () => {
    this._translationDragStart = null;
    this.atomService.handleDragEnd();
    await this.particleService.regenerate(this.params);
    this.pointCloud.clearDragTransform();
  };

  private onRotationDrag = (evt: import('../renderer/rotation-handles.js').RotationDragEvent) => {
    // Capture pre-drag rotation on first event
    if (!this._rotationDragStart) {
      const atom = this.atomManager.getAtom(evt.atomId);
      if (atom) {
        this._rotationDragStart = [...atom.rotation] as [number, number, number];
        const centers = new Map(this.atomManager.all.map(a => [a.id, a.position] as const));
        this.pointCloud.saveDragStart(centers, evt.atomId);
      }
    }
    this.atomService.handleRotationDrag(evt);
    // Apply visual rotation to point cloud around atom pivot
    if (this._rotationDragStart) {
      const atom = this.atomManager.getAtom(evt.atomId);
      if (atom) {
        const toRad = Math.PI / 180;
        const dq = eulerDelta(
          this._rotationDragStart[0] * toRad,
          this._rotationDragStart[1] * toRad,
          this._rotationDragStart[2] * toRad,
          atom.rotation[0] * toRad,
          atom.rotation[1] * toRad,
          atom.rotation[2] * toRad,
        );
        this.pointCloud.setDragRotation(dq[0], dq[1], dq[2], dq[3], atom.position);
        this.sceneManager.markDirty();
      }
    }
    this.atomVersion++;
  };

  private onRotationDragEnd = async () => {
    this._rotationDragStart = null;
    this.atomService.handleRotationDragEnd();
    await this.particleService.regenerate(this.params);
    this.pointCloud.clearDragTransform();
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'orbital-app': OrbitalApp;
  }
}

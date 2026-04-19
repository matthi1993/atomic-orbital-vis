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

@customElement('orbital-app')
export class OrbitalApp extends LitElement {
  @state() private params: OrbitalParams = { ...DEFAULT_PARAMS };
  @state() private webgpuAvailable = 'gpu' in navigator;
  @state() private selectedAtomId: string | null = null;
  @state() private atomVersion = 0;

  private atomManager = new AtomManager();
  private sceneManager!: SceneManager;
  private selectionService!: SelectionService;
  private atomService!: AtomService;
  private particleService!: ParticleService;
  private renderLoopService!: RenderLoopService;
  private interactionService!: InteractionService;

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

      .info {
        position: absolute;
        bottom: var(--sp-lg);
        left: var(--sp-lg);
        font-size: var(--fs-sm);
        color: var(--c-text-dim);
        font-family: var(--font-family);
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
      <div class="info">Drag to rotate · Scroll to zoom · Click nucleus to select · WebGPU Compute Shader</div>
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
    const nucleus = new Nucleus(this.sceneManager.scene);
    const axesPlots = new AxesPlots(this.sceneManager.scene);
    const axisHandles = new AxisHandles(this.sceneManager.scene);

    // Wire up domain services
    this.selectionService = new SelectionService(this.atomManager, nucleus, axisHandles, this.sceneManager);
    this.atomService = new AtomService(this.atomManager, nucleus, axisHandles, this.sceneManager, this.selectionService);
    this.particleService = new ParticleService(this.atomManager, pipeline, pointCloud, axesPlots, this.sceneManager);
    this.renderLoopService = new RenderLoopService(pointCloud, nucleus, axisHandles, axesPlots, this.sceneManager);
    this.interactionService = new InteractionService(this.sceneManager, nucleus, axisHandles);

    axisHandles.onDrag = this.onHandleDrag;
    axisHandles.onDragEnd = this.onHandleDragEnd;

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
    const result = this.interactionService.handlePointerDown(e);
    if (result.type === 'handle') return;

    if (result.type === 'nucleus') {
      this.selectionService.select(result.atomId);
    } else {
      this.selectionService.deselect();
    }
    this.selectedAtomId = this.selectionService.selectedAtomId;
    this.atomVersion++;
  };

  private onPointerMove = (e: PointerEvent) => {
    this.interactionService.handlePointerMove(e);
  };

  private onPointerUp = () => {
    this.interactionService.handlePointerUp();
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
    this.atomService.handleDrag(evt);
    this.atomVersion++;
  };

  private onHandleDragEnd = () => {
    this.atomService.handleDragEnd();
    this.particleService.regenerate(this.params);
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'orbital-app': OrbitalApp;
  }
}

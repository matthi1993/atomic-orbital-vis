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
import { theme } from './styles/index.js';
import './render-panel.js';
import './atom-editor.js';
import type { AtomEditorChange, AtomPresetChange, AtomOrbitalSelect } from './atom-editor.js';

@customElement('orbital-app')
export class OrbitalApp extends LitElement {
  @state() private params: OrbitalParams = { ...DEFAULT_PARAMS };
  @state() private webgpuAvailable = 'gpu' in navigator;
  @state() private selectedAtomId: string | null = null;
  @state() private atomVersion = 0;

  private sceneManager!: SceneManager;
  private orbitalPipeline!: OrbitalPipeline;
  private pointCloud!: PointCloud;
  private nucleus!: Nucleus;
  private axesPlots!: AxesPlots;
  private atomManager = new AtomManager();
  private lastTime = 0;
  private elapsedTime = 0;
  private generating = false;
  private animationId = 0;

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
      <atom-editor
        .atom=${this.selectedAtomId ? this.atomManager.getAtom(this.selectedAtomId) ?? null : null}
        .version=${this.atomVersion}
        @atom-edit=${this.onAtomEdit}
        @atom-preset=${this.onAtomPreset}
        @atom-orbital-select=${this.onAtomOrbitalSelect}
      ></atom-editor>
      <render-panel
        .params=${this.params}
        @param-change=${this.onParamChange}
        @camera-view=${this.onCameraView}
      ></render-panel>
      <div class="info">Drag to rotate · Scroll to zoom · Click nucleus to edit · WebGPU Compute Shader</div>
    `;
  }

  async firstUpdated() {
    if (!this.webgpuAvailable) return;

    const container = this.shadowRoot!.querySelector('.canvas-container') as HTMLElement;
    this.sceneManager = new SceneManager(container);
    await this.sceneManager.init();

    this.orbitalPipeline = new OrbitalPipeline(this.sceneManager.device);
    this.pointCloud = new PointCloud(this.sceneManager.scene, this.sceneManager.camera);
    this.nucleus = new Nucleus(this.sceneManager.scene);
    this.axesPlots = new AxesPlots(this.sceneManager.scene);

    // Create a single hydrogen atom at the origin
    const { n, l, m } = this.params;
    const atom = this.atomManager.addAtom(n, l, m, [0, 0, 0]);
    atom.setProtons(1);
    atom.setElectrons(1);
    this.nucleus.addNucleus(atom.id, atom.position);
    this.selectedAtomId = atom.id;
    this.nucleus.selectedId = atom.id;

    await this.regenerate();
    this.lastTime = performance.now();
    this.tick();

    this.sceneManager.renderer.domElement.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('resize', this.onResize);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    cancelAnimationFrame(this.animationId);
    this.sceneManager?.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('resize', this.onResize);
  }

  private onResize = () => {
    const container = this.shadowRoot?.querySelector('.canvas-container') as HTMLElement | null;
    if (container) {
      this.sceneManager.resize(container.clientWidth, container.clientHeight);
    }
  };

  private onParamChange = (e: CustomEvent<{ key: string; value: number | boolean | string }>) => {
    const { key, value } = e.detail;
    const next = { ...this.params, [key]: value };

    this.params = next;

    // Global render params that affect generation → mark all atoms dirty
    if (key === 'count' || key === 'threshold' || key === 'scale') {
      this.atomManager.markAllDirty();
      this.regenerate();
    }
  };

  private onCameraView = (e: CustomEvent<{ axis: string }>) => {
    this.sceneManager.lookAlongAxis(e.detail.axis as 'x' | 'y' | 'z');
  };

  private onPointerDown = (e: PointerEvent) => {
    const canvas = this.sceneManager.renderer.domElement;
    const rect = canvas.getBoundingClientRect();
    const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const hitId = this.nucleus.hitTest(ndcX, ndcY, this.sceneManager.camera);
    if (hitId) {
      this.selectedAtomId = hitId;
      this.atomManager.selectAtom(hitId);
      this.nucleus.selectedId = hitId;
      this.sceneManager.markDirty();
    }
  };

  private onAtomEdit = (e: CustomEvent<AtomEditorChange>) => {
    const { atomId, key, value } = e.detail;
    const atom = this.atomManager.getAtom(atomId);
    if (!atom) return;

    switch (key) {
      case 'protons':
        atom.setProtons(value);
        break;
      case 'electrons':
        atom.setElectrons(value);
        break;
      case 'posX': {
        const pos = [...atom.position] as [number, number, number];
        pos[0] = value;
        atom.setPosition(pos);
        this.nucleus.updatePosition(atomId, pos);
        break;
      }
      case 'posY': {
        const pos = [...atom.position] as [number, number, number];
        pos[1] = value;
        atom.setPosition(pos);
        this.nucleus.updatePosition(atomId, pos);
        break;
      }
      case 'posZ': {
        const pos = [...atom.position] as [number, number, number];
        pos[2] = value;
        atom.setPosition(pos);
        this.nucleus.updatePosition(atomId, pos);
        break;
      }
    }

    // Any atom property change invalidates the molecular orbital
    this.atomManager.markAllDirty();
    this.regenerate();
    // Bump version to force atom-editor re-render (same object reference)
    this.atomVersion++;
  };

  private onAtomPreset = (e: CustomEvent<AtomPresetChange>) => {
    const { atomId, preset } = e.detail;
    const atom = this.atomManager.getAtom(atomId);
    if (!atom) return;

    atom.setProtons(preset.Z);
    atom.setElectrons(preset.e); // n/l/m auto-derived from electron config

    this.atomManager.markAllDirty();
    this.regenerate();
    this.atomVersion++;
  };

  private onAtomOrbitalSelect = (e: CustomEvent<AtomOrbitalSelect>) => {
    const { atomId, orbitalIndex } = e.detail;
    const atom = this.atomManager.getAtom(atomId);
    if (!atom) return;

    atom.setSelectedOrbitalIndex(orbitalIndex);
    this.atomManager.markAllDirty();
    this.regenerate();
    this.atomVersion++;
  };

  private async regenerate() {
    if (this.generating) return;
    this.generating = true;

    const { count, threshold, scale } = this.params;

    // Regenerate only dirty atoms, then merge all particle data
    const { positions, colors, totalCount } = await this.atomManager.regenerateAll(
      this.orbitalPipeline, count, scale, threshold,
    );
    const usedCount = Math.max(totalCount, 1);

    // Extract stride-3 positions from stride-4 orbital output
    const pos3 = new Float32Array(usedCount * 3);
    for (let i = 0; i < usedCount; i++) {
      pos3[i * 3 + 0] = positions[i * 4 + 0];
      pos3[i * 3 + 1] = positions[i * 4 + 1];
      pos3[i * 3 + 2] = positions[i * 4 + 2];
    }

    this.pointCloud.create(usedCount, colors, this.params.pointSize);
    this.pointCloud.setPositions(pos3);
    this.sceneManager.markDirty();

    // Show wave-function plots for the currently selected atom
    const selected = this.atomManager.selectedAtom;
    if (selected) {
      this.axesPlots.update(selected.n, selected.l, selected.m, scale);
    }
    this.axesPlots.showAxes = this.params.showAxes;

    this.generating = false;
  }

  private tick = () => {
    this.animationId = requestAnimationFrame(this.tick);

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;
    this.elapsedTime += dt;

    this.pointCloud.pointSize = this.params.pointSize;
    this.pointCloud.opacity = this.params.electronOpacity;
    this.pointCloud.opaqueMode = this.params.opaqueMode;
    this.pointCloud.visible = this.params.showElectrons;
    this.pointCloud.cutPlane = this.params.cutPlane;
    this.sceneManager.orthographic = this.params.orthographic;
    this.pointCloud.activeCamera = this.sceneManager.camera;
    this.sceneManager.autoRotateSpeed = this.params.rotSpeed;
    this.axesPlots.showAxes = this.params.showAxes;

    this.pointCloud.updateIfNeeded();
    this.nucleus.update(this.elapsedTime);
    const rendered = this.sceneManager.render();
    // If nothing rendered, skip next frame's heavy work unless something changes
    if (!rendered) return;
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'orbital-app': OrbitalApp;
  }
}

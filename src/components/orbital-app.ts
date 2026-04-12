import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import type { OrbitalParams } from '../types.js';
import { DEFAULT_PARAMS } from '../config/params.js';
import { estimateMaxPsi } from '../physics/particle-generator.js';
import { ComputePipeline } from '../gpu/compute-pipeline.js';
import { OrbitalPipeline } from '../gpu/orbital-pipeline.js';
import { SceneManager } from '../renderer/scene-manager.js';
import { PointCloud } from '../renderer/point-cloud.js';
import { Nucleus } from '../renderer/nucleus.js';
import './control-panel.js';
import './render-panel.js';

const REGENERATE_KEYS = new Set(['n', 'l', 'm', 'count', 'threshold', 'scale']);

@customElement('orbital-app')
export class OrbitalApp extends LitElement {
  @state() private params: OrbitalParams = { ...DEFAULT_PARAMS };
  @state() private webgpuAvailable = 'gpu' in navigator;

  private sceneManager!: SceneManager;
  private compute!: ComputePipeline;
  private orbitalPipeline!: OrbitalPipeline;
  private pointCloud!: PointCloud;
  private nucleus!: Nucleus;
  private lastTime = 0;
  private elapsedTime = 0;
  private generating = false;
  private animationId = 0;

  static styles = css`
    :host {
      display: block;
      width: 100vw;
      height: 100vh;
      position: relative;
    }

    .canvas-container {
      width: 100%;
      height: 100%;
    }

    .canvas-container canvas {
      display: block;
    }

    .info {
      position: absolute;
      bottom: 16px;
      left: 16px;
      font-size: 11px;
      color: #556;
      font-family: 'Segoe UI', system-ui, sans-serif;
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
      color: #f66;
      text-align: center;
      padding: 40px;
      font-family: 'Segoe UI', system-ui, sans-serif;
    }

    .no-webgpu .hint {
      font-size: 14px;
      color: #888;
      margin-top: 8px;
    }
  `;

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
      <control-panel
        .params=${this.params}
        @param-change=${this.onParamChange}
        @preset-change=${this.onPresetChange}
      ></control-panel>
      <render-panel
        .params=${this.params}
        @param-change=${this.onParamChange}
      ></render-panel>
      <div class="info">Drag to rotate · Scroll to zoom · WebGPU Compute Shader</div>
    `;
  }

  async firstUpdated() {
    if (!this.webgpuAvailable) return;

    const container = this.shadowRoot!.querySelector('.canvas-container') as HTMLElement;
    this.sceneManager = new SceneManager(container);
    await this.sceneManager.init();

    this.compute = new ComputePipeline(this.sceneManager.device);
    this.orbitalPipeline = new OrbitalPipeline(this.sceneManager.device);
    this.pointCloud = new PointCloud(this.sceneManager.scene, this.sceneManager.camera);
    this.nucleus = new Nucleus(this.sceneManager.scene);

    await this.regenerate();
    this.lastTime = performance.now();
    this.tick();

    window.addEventListener('resize', this.onResize);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.onResize);
  }

  private onResize = () => {
    const container = this.shadowRoot?.querySelector('.canvas-container') as HTMLElement | null;
    if (container) {
      this.sceneManager.resize(container.clientWidth, container.clientHeight);
    }
  };

  private onParamChange = (e: CustomEvent<{ key: string; value: number | boolean }>) => {
    const { key, value } = e.detail;
    const next = { ...this.params, [key]: value };

    // Constrain quantum numbers
    if (key === 'n' || key === 'l') {
      if (next.l >= next.n) next.l = next.n - 1;
      if (next.m < -next.l) next.m = -next.l;
      if (next.m > next.l) next.m = next.l;
    }

    this.params = next;

    if (REGENERATE_KEYS.has(key)) {
      this.regenerate();
    }
  };

  private onPresetChange = (e: CustomEvent<{ n: number; l: number; m: number }>) => {
    const { n, l, m } = e.detail;
    this.params = { ...this.params, n, l, m };
    this.regenerate();
  };

  private async regenerate() {
    if (this.generating) return;
    this.generating = true;

    const { n, l, m, count, threshold, scale } = this.params;
    const rMax = scale * n * n;
    const maxPsi = estimateMaxPsi(n, l, m, rMax);
    const { positions, colors, actual } = await this.orbitalPipeline.generate(
      n, l, m, count, scale, threshold, maxPsi,
    );
    const usedCount = Math.max(actual, 1);

    this.compute.createResources(usedCount);
    this.compute.uploadParticles(positions);
    this.pointCloud.create(usedCount, colors, this.params.pointSize);

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
    this.sceneManager.autoRotateSpeed = this.params.rotSpeed;

    const encoder = this.compute.dispatch(this.elapsedTime, dt, 0);
    this.compute.submitAndReadback(encoder, (positions) => {
      this.pointCloud.updatePositions(positions);
    });

    this.nucleus.update(this.elapsedTime);
    this.sceneManager.render();
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'orbital-app': OrbitalApp;
  }
}

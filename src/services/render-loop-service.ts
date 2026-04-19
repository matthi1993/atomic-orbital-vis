import type { PointCloud } from '../renderer/point-cloud.js';
import type { Nucleus } from '../renderer/nucleus.js';
import type { AxisHandles } from '../renderer/axis-handles.js';
import type { RotationHandles } from '../renderer/rotation-handles.js';
import type { AxesPlots } from '../renderer/axes-plots.js';
import type { SceneManager } from '../renderer/scene-manager.js';
import type { OrbitalParams } from '../types.js';

/**
 * Drives the requestAnimationFrame loop, syncing OrbitalParams
 * to the visual components each frame and triggering renders.
 */
export class RenderLoopService {
  private animationId = 0;
  private lastTime = 0;
  private elapsedTime = 0;
  private _params!: OrbitalParams;

  constructor(
    private pointCloud: PointCloud,
    private nucleus: Nucleus,
    private axisHandles: AxisHandles,
    private rotationHandles: RotationHandles,
    private axesPlots: AxesPlots,
    private sceneManager: SceneManager,
  ) {}

  set params(p: OrbitalParams) {
    this._params = p;
  }

  start(): void {
    this.lastTime = performance.now();
    this.tick();
  }

  stop(): void {
    cancelAnimationFrame(this.animationId);
  }

  private tick = (): void => {
    this.animationId = requestAnimationFrame(this.tick);

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;
    this.elapsedTime += dt;

    const p = this._params;
    this.pointCloud.pointSize = p.pointSize;
    this.pointCloud.variablePointSize = p.variablePointSize;
    this.pointCloud.opacity = p.electronOpacity;
    this.pointCloud.opaqueMode = p.opaqueMode;
    this.pointCloud.visible = p.showElectrons;
    this.pointCloud.cutPlane = p.cutPlane;
    this.pointCloud.fixedScreenSize = p.fixedScreenSize;
    this.sceneManager.orthographic = p.orthographic;
    this.pointCloud.activeCamera = this.sceneManager.camera;
    this.sceneManager.autoRotateSpeed = p.rotSpeed;
    this.axesPlots.showAxes = p.showAxes;

    this.pointCloud.updateIfNeeded();
    this.nucleus.update(this.elapsedTime);
    this.axisHandles.updateScale(this.sceneManager.camera);
    this.rotationHandles.updateScale(this.sceneManager.camera);
    this.axesPlots.updateScale(this.sceneManager.camera);
    this.sceneManager.render();
  };
}

import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { OrbitalParams } from '../types.js';
import { PARAM_DEFS } from '../config/params.js';
import type { SliderDef } from '../config/params.js';
import { theme, controls, buttons, layout } from './styles/index.js';
import './collapsible-panel.js';

@customElement('render-panel')
export class RenderPanel extends LitElement {
  @property({ type: Object }) params!: OrbitalParams;

  static styles = [
    ...theme,
    controls,
    buttons,
    layout,
    css`
      :host {
        position: absolute;
        top: var(--sp-lg);
        right: var(--sp-lg);
        z-index: 10;
      }

      .axis-buttons {
        display: flex;
        gap: var(--sp-xs);
        margin-bottom: var(--sp-sm);
      }

      .btn-sm.x { color: var(--c-axis-x); border-color: var(--c-axis-x-dim); }
      .btn-sm.y { color: var(--c-axis-y); border-color: var(--c-axis-y-dim); }
      .btn-sm.z { color: var(--c-axis-z); border-color: var(--c-axis-z-dim); }

      .cut-buttons {
        display: flex;
        gap: var(--sp-xs);
      }

      .cut-x { color: var(--c-axis-x); }
      .cut-x.active { border-color: var(--c-axis-x); }
      .cut-y { color: var(--c-axis-y); }
      .cut-y.active { border-color: var(--c-axis-y); }
      .cut-z { color: var(--c-axis-z); }
      .cut-z.active { border-color: var(--c-axis-z); }
    `,
  ];

  /* ── track which sub-sections are open ─────────────── */
  private _openSections: Record<string, boolean> = {
    overlays: false,
    pointCloud: false,
    camera: false,
    cutPlane: false,
  };

  private toggleSection(name: string) {
    this._openSections[name] = !this._openSections[name];
    this.requestUpdate();
  }

  private emit(key: string, value: number | boolean | string) {
    this.dispatchEvent(
      new CustomEvent('param-change', {
        detail: { key, value },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private emitView(axis: string) {
    this.dispatchEvent(
      new CustomEvent('camera-view', {
        detail: { axis },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private sliderFromDef(key: keyof OrbitalParams, def: SliderDef, paramVal: number) {
    const toSlider = def.toSlider ?? ((v: number) => v);
    const toParam = def.toParam ?? ((v: number) => v);
    const display = def.display ?? ((v: number) => String(v));
    return html`
      <div class="control-group">
        <label>${def.label}</label>
        <div class="row">
          <input
            type="range"
            .value=${String(toSlider(paramVal))}
            min=${def.min}
            max=${def.max}
            step=${def.step}
            @change=${(e: Event) =>
              this.emit(key, toParam(+(e.target as HTMLInputElement).value))}
          />
          <span class="val">${display(paramVal)}</span>
        </div>
      </div>
    `;
  }

  private renderSection(name: string, title: string, content: unknown) {
    const open = this._openSections[name] ?? false;
    return html`
      <div class="section">
        <div class="section-header" @click=${() => this.toggleSection(name)}>
          <span class="section-title">${title}</span>
          <span class="section-chevron ${open ? 'open' : ''}">▼</span>
        </div>
        <div class="section-body ${open ? 'open' : ''}">
          ${content}
        </div>
      </div>
    `;
  }

  render() {
    if (!this.params) return html``;
    const p = this.params;

    return html`
      <collapsible-panel heading="Rendering">

        ${this.renderSection('overlays', 'Overlays', html`
          <div class="toggle-row">
            <input
              type="checkbox"
              id="showAxes"
              .checked=${p.showAxes}
              @change=${(e: Event) =>
                this.emit('showAxes', (e.target as HTMLInputElement).checked)}
            />
            <label for="showAxes">Axes</label>
          </div>
          <div class="toggle-row">
            <input
              type="checkbox"
              id="showElectrons"
              .checked=${p.showElectrons}
              @change=${(e: Event) =>
                this.emit('showElectrons', (e.target as HTMLInputElement).checked)}
            />
            <label for="showElectrons">Electron Cloud</label>
          </div>
          <div class="toggle-row">
            <input
              type="checkbox"
              id="showOutlines"
              .checked=${p.showOutlines}
              @change=${(e: Event) =>
                this.emit('showOutlines', (e.target as HTMLInputElement).checked)}
            />
            <label for="showOutlines">Atom Outlines</label>
          </div>
          <div class="toggle-row">
            <input
              type="checkbox"
              id="showHandles"
              .checked=${p.showHandles}
              @change=${(e: Event) =>
                this.emit('showHandles', (e.target as HTMLInputElement).checked)}
            />
            <label for="showHandles">Handles</label>
          </div>
        `)}

        ${this.renderSection('pointCloud', 'Point Cloud', html`
          ${this.sliderFromDef('count', PARAM_DEFS.count!, p.count)}
          ${this.sliderFromDef('threshold', PARAM_DEFS.threshold!, p.threshold)}
          ${this.sliderFromDef('scale', PARAM_DEFS.scale!, p.scale)}
          ${this.sliderFromDef('pointSize', PARAM_DEFS.pointSize!, p.pointSize)}
          <div class="toggle-row">
            <input
              type="checkbox"
              id="variablePointSize"
              .checked=${p.variablePointSize}
              @change=${(e: Event) =>
                this.emit('variablePointSize', (e.target as HTMLInputElement).checked)}
            />
            <label for="variablePointSize">Variable Point Size</label>
          </div>
          ${this.sliderFromDef('electronOpacity', PARAM_DEFS.electronOpacity!, p.electronOpacity)}
          <div class="toggle-row">
            <input
              type="checkbox"
              id="fixedScreenSize"
              .checked=${p.fixedScreenSize}
              @change=${(e: Event) =>
                this.emit('fixedScreenSize', (e.target as HTMLInputElement).checked)}
            />
            <label for="fixedScreenSize">Fixed Screen Size</label>
          </div>
          <div class="toggle-row">
            <input
              type="checkbox"
              id="opaqueMode"
              .checked=${p.opaqueMode}
              @change=${(e: Event) =>
                this.emit('opaqueMode', (e.target as HTMLInputElement).checked)}
            />
            <label for="opaqueMode">Opaque Rendering</label>
          </div>
        `)}

        ${this.renderSection('camera', 'Camera', html`
          ${this.sliderFromDef('rotSpeed', PARAM_DEFS.rotSpeed!, p.rotSpeed)}
          <div class="toggle-row">
            <input
              type="checkbox"
              id="orthographic"
              .checked=${p.orthographic}
              @change=${(e: Event) =>
                this.emit('orthographic', (e.target as HTMLInputElement).checked)}
            />
            <label for="orthographic">Orthographic Camera</label>
          </div>
          <label>Camera View</label>
          <div class="axis-buttons">
            <button class="btn-sm x" @click=${() => this.emitView('x')}>X</button>
            <button class="btn-sm y" @click=${() => this.emitView('y')}>Y</button>
            <button class="btn-sm z" @click=${() => this.emitView('z')}>Z</button>
          </div>
        `)}

        ${this.renderSection('cutPlane', 'Cut Plane', html`
          <div class="cut-buttons">
            <button
              class="btn-sm ${p.cutPlane === 'none' ? 'active' : ''}"
              @click=${() => this.emit('cutPlane', 'none')}
            >None</button>
            <button
              class="btn-sm cut-x ${p.cutPlane === 'x' ? 'active' : ''}"
              @click=${() => this.emit('cutPlane', 'x')}
            >X</button>
            <button
              class="btn-sm cut-y ${p.cutPlane === 'y' ? 'active' : ''}"
              @click=${() => this.emit('cutPlane', 'y')}
            >Y</button>
            <button
              class="btn-sm cut-z ${p.cutPlane === 'z' ? 'active' : ''}"
              @click=${() => this.emit('cutPlane', 'z')}
            >Z</button>
          </div>
        `)}

      </collapsible-panel>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'render-panel': RenderPanel;
  }
}

import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { OrbitalParams } from '../types.js';
import { PARAM_DEFS } from '../config/params.js';
import type { SliderDef } from '../config/params.js';
import './collapsible-panel.js';

@customElement('render-panel')
export class RenderPanel extends LitElement {
  @property({ type: Object }) params!: OrbitalParams;

  static styles = css`
    :host {
      position: absolute;
      top: 16px;
      right: 16px;
      z-index: 10;
    }

    .control-group {
      margin-bottom: 14px;
    }

    label {
      display: block;
      font-size: 12px;
      margin-bottom: 4px;
      color: #aac;
    }

    .row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    input[type='range'] {
      flex: 1;
      accent-color: #58f;
    }

    .val {
      font-size: 12px;
      min-width: 32px;
      text-align: right;
      color: #8cf;
    }

    .toggle-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 14px;
    }

    .toggle-row label {
      font-size: 12px;
      color: #aac;
      margin: 0;
    }

    input[type='checkbox'] {
      accent-color: #58f;
    }
  `;

  private emit(key: string, value: number | boolean) {
    this.dispatchEvent(
      new CustomEvent('param-change', {
        detail: { key, value },
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

  render() {
    if (!this.params) return html``;
    const p = this.params;

    return html`
      <collapsible-panel heading="Rendering">
        ${this.sliderFromDef('count', PARAM_DEFS.count!, p.count)}
        ${this.sliderFromDef('threshold', PARAM_DEFS.threshold!, p.threshold)}
        ${this.sliderFromDef('scale', PARAM_DEFS.scale!, p.scale)}
        ${this.sliderFromDef('pointSize', PARAM_DEFS.pointSize!, p.pointSize)}
        ${this.sliderFromDef('rotSpeed', PARAM_DEFS.rotSpeed!, p.rotSpeed)}
        ${this.sliderFromDef('electronOpacity', PARAM_DEFS.electronOpacity!, p.electronOpacity)}
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
      </collapsible-panel>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'render-panel': RenderPanel;
  }
}

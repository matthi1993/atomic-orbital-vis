import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { OrbitalParams } from '../types.js';
import { PARAM_DEFS } from '../config/params.js';
import type { SliderDef } from '../config/params.js';
import { theme, controls, buttons, layout } from './styles/index.js';
import './collapsible-panel.js';

interface OrbitalPreset {
  label: string;
  n: number;
  l: number;
  m: number;
}

const PRESETS: OrbitalPreset[] = [
  { label: '1s', n: 1, l: 0, m: 0 },
  { label: '2s', n: 2, l: 0, m: 0 },
  { label: '2pz', n: 2, l: 1, m: 0 },
  { label: '2px', n: 2, l: 1, m: 1 },
  { label: '2py', n: 2, l: 1, m: -1 },
  { label: '3s', n: 3, l: 0, m: 0 },
  { label: '3pz', n: 3, l: 1, m: 0 },
  { label: '3px', n: 3, l: 1, m: 1 },
  { label: '3dz²', n: 3, l: 2, m: 0 },
  { label: '3dxz', n: 3, l: 2, m: 1 },
  { label: '3dxy', n: 3, l: 2, m: 2 },
  { label: '4s', n: 4, l: 0, m: 0 },
  { label: '4fz³', n: 4, l: 3, m: 0 },
];

@customElement('control-panel')
export class ControlPanel extends LitElement {
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
        left: var(--sp-lg);
        z-index: 10;
      }

      .presets { margin-bottom: var(--sp-md); }
      .presets label { margin-bottom: var(--sp-xs); }

      .preset-grid {
        display: flex;
        flex-wrap: wrap;
        gap: var(--sp-xs);
      }
    `,
  ];

  private emit(key: string, value: number) {
    this.dispatchEvent(
      new CustomEvent('param-change', {
        detail: { key, value },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private applyPreset(preset: OrbitalPreset) {
    this.dispatchEvent(
      new CustomEvent('preset-change', {
        detail: { n: preset.n, l: preset.l, m: preset.m },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private sliderFromDef(
    key: keyof OrbitalParams,
    def: SliderDef,
    paramVal: number,
    minOverride?: number,
    maxOverride?: number,
  ) {
    const toSlider = def.toSlider ?? ((v: number) => v);
    const toParam = def.toParam ?? ((v: number) => v);
    const display = def.display ?? ((v: number) => String(v));
    const min = minOverride ?? def.min;
    const max = maxOverride ?? def.max;
    return html`
      <div class="control-group">
        <label>${def.label}</label>
        <div class="row">
          <input
            type="range"
            .value=${String(toSlider(paramVal))}
            min=${min}
            max=${max}
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
    const { n, l, m } = this.params;

    return html`
      <collapsible-panel heading="Orbital Visualizer">
        <div class="presets">
          <label>Quick Presets</label>
          <div class="preset-grid">
            ${PRESETS.map(
              (p) => html`
                <button
                  class="btn ${p.n === n && p.l === l && p.m === m ? 'active' : ''}"
                  @click=${() => this.applyPreset(p)}
                >${p.label}</button>
              `,
            )}
          </div>
        </div>

        <div class="section-divider">
          <h3>Quantum Numbers</h3>
          ${this.sliderFromDef('n', PARAM_DEFS.n!, n)}
          ${this.sliderFromDef('l', PARAM_DEFS.l!, l, 0, n - 1)}
          ${this.sliderFromDef('m', PARAM_DEFS.m!, m, -l, l)}
        </div>
      </collapsible-panel>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'control-panel': ControlPanel;
  }
}

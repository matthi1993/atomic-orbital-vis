import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { OrbitalParams } from '../types.js';
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

  static styles = css`
    :host {
      position: absolute;
      top: 16px;
      left: 16px;
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

    .presets {
      margin-bottom: 14px;
    }

    .presets label {
      margin-bottom: 6px;
    }

    .preset-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .preset-btn {
      background: rgba(100, 140, 255, 0.12);
      border: 1px solid rgba(100, 140, 255, 0.3);
      border-radius: 6px;
      color: #adf;
      font-size: 12px;
      padding: 4px 10px;
      cursor: pointer;
      font-family: 'Segoe UI', system-ui, sans-serif;
      transition: background 0.15s, border-color 0.15s;
    }

    .preset-btn:hover {
      background: rgba(100, 140, 255, 0.25);
      border-color: rgba(100, 140, 255, 0.5);
    }

    .preset-btn.active {
      background: rgba(100, 140, 255, 0.35);
      border-color: #58f;
      color: #fff;
    }

    .section {
      border-top: 1px solid rgba(100, 140, 255, 0.15);
      padding-top: 12px;
      margin-top: 12px;
    }

    .section h3 {
      font-size: 13px;
      margin: 0 0 8px;
      color: #7af;
    }
  `;

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

  private slider(
    label: string,
    key: string,
    sliderVal: number,
    min: number,
    max: number,
    step: number,
    display: string,
    toParam: (v: number) => number = (v) => v,
  ) {
    return html`
      <div class="control-group">
        <label>${label}</label>
        <div class="row">
          <input
            type="range"
            .value=${String(sliderVal)}
            min=${min}
            max=${max}
            step=${step}
            @change=${(e: Event) =>
              this.emit(key, toParam(+(e.target as HTMLInputElement).value))}
          />
          <span class="val">${display}</span>
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
                  class="preset-btn ${p.n === n && p.l === l && p.m === m ? 'active' : ''}"
                  @click=${() => this.applyPreset(p)}
                >${p.label}</button>
              `,
            )}
          </div>
        </div>

        <div class="section">
          <h3>Quantum Numbers</h3>
          ${this.slider('n (shell)', 'n', n, 1, 5, 1, String(n))}
          ${this.slider('l (angular)', 'l', l, 0, n - 1, 1, String(l))}
          ${this.slider('m (magnetic)', 'm', m, -l, l, 1, String(m))}
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

import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { OrbitalParams } from '../types.js';

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

    .panel {
      background: rgba(10, 10, 30, 0.85);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(100, 140, 255, 0.25);
      border-radius: 12px;
      padding: 20px;
      width: 300px;
      max-height: calc(100vh - 32px);
      overflow-y: auto;
      color: #eee;
      font-family: 'Segoe UI', system-ui, sans-serif;
    }

    h2 {
      font-size: 16px;
      margin: 0 0 12px;
      color: #8af;
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
            @input=${(e: Event) =>
              this.emit(key, toParam(+(e.target as HTMLInputElement).value))}
          />
          <span class="val">${display}</span>
        </div>
      </div>
    `;
  }

  render() {
    if (!this.params) return html``;
    const { n, l, m, count, threshold, scale, pointSize, rotSpeed } = this.params;

    return html`
      <div class="panel">
        <h2>Atom Orbital Visualizer</h2>

        ${this.slider('Quantum Number n (shell)', 'n', n, 1, 5, 1, String(n))}
        ${this.slider('Quantum Number l (angular)', 'l', l, 0, n - 1, 1, String(l))}
        ${this.slider('Quantum Number m (magnetic)', 'm', m, -l, l, 1, String(m))}

        <div class="section">
          <h3>Rendering</h3>
          ${this.slider(
            'Particle Count (×1000)', 'count',
            count / 1000, 1, 500, 1,
            `${count / 1000}k`,
            (v) => v * 1000,
          )}
          ${this.slider(
            'Density Threshold', 'threshold',
            threshold * 100, 0, 100, 1,
            threshold.toFixed(2),
            (v) => v / 100,
          )}
          ${this.slider('Orbital Scale', 'scale', scale, 1, 30, 1, String(scale))}
          ${this.slider(
            'Point Size', 'pointSize',
            pointSize, 1, 8, 0.5,
            pointSize.toFixed(1),
          )}
          ${this.slider(
            'Rotation Speed', 'rotSpeed',
            rotSpeed * 100, 0, 100, 1,
            rotSpeed.toFixed(2),
            (v) => v / 100,
          )}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'control-panel': ControlPanel;
  }
}

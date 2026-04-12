import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { OrbitalParams } from '../types.js';
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
    const { count, threshold, scale, pointSize, rotSpeed, electronOpacity } = this.params;

    return html`
      <collapsible-panel heading="Rendering">
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
        ${this.slider(
          'Electron Opacity', 'electronOpacity',
          electronOpacity * 100, 5, 100, 1,
          electronOpacity.toFixed(2),
          (v) => v / 100,
        )}
      </collapsible-panel>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'render-panel': RenderPanel;
  }
}

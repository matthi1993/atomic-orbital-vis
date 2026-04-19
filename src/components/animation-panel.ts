import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { OrbitalParams } from '../types.js';
import { PARAM_DEFS } from '../config/params.js';
import type { SliderDef } from '../config/params.js';
import { theme, controls, buttons, layout } from './styles/index.js';
import './collapsible-panel.js';

@customElement('animation-panel')
export class AnimationPanel extends LitElement {
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
    `,
  ];

  private emit(key: string, value: number | boolean | string) {
    this.dispatchEvent(
      new CustomEvent('param-change', {
        detail: { key, value },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private emitReset() {
    this.dispatchEvent(
      new CustomEvent('animation-reset', {
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
      <collapsible-panel heading="Animation">
        <div class="toggle-row">
          <input
            type="checkbox"
            id="animationEnabled"
            .checked=${p.animationEnabled}
            @change=${(e: Event) =>
              this.emit('animationEnabled', (e.target as HTMLInputElement).checked)}
          />
          <label for="animationEnabled">Enable</label>
        </div>
        ${this.sliderFromDef('animationSpeed', PARAM_DEFS.animationSpeed!, p.animationSpeed)}
        ${this.sliderFromDef('forceScale', PARAM_DEFS.forceScale!, p.forceScale)}
        ${this.sliderFromDef('damping', PARAM_DEFS.damping!, p.damping)}
        ${this.sliderFromDef('targetFps', PARAM_DEFS.targetFps!, p.targetFps)}
        <button class="btn-sm" @click=${this.emitReset}>Reset Velocities</button>
      </collapsible-panel>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'animation-panel': AnimationPanel;
  }
}

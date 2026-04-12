import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { Atom } from '../physics/atom.js';
import './collapsible-panel.js';

export interface AtomEditorChange {
  atomId: string;
  key: 'n' | 'l' | 'm' | 'protons' | 'electrons' | 'posX' | 'posY' | 'posZ';
  value: number;
}

export interface AtomPresetChange {
  atomId: string;
  preset: ElementPreset;
}

/** Element preset: ground-state outermost orbital for the first 10 elements */
export interface ElementPreset {
  symbol: string;
  name: string;
  Z: number;       // protons
  e: number;        // electrons (neutral)
  n: number;        // principal quantum number of outermost orbital
  l: number;        // angular momentum of outermost orbital
  m: number;        // magnetic quantum number (default orientation)
}

const ELEMENT_PRESETS: ElementPreset[] = [
  { symbol: 'H',  name: 'Hydrogen',  Z: 1,  e: 1,  n: 1, l: 0, m: 0 },
  { symbol: 'He', name: 'Helium',    Z: 2,  e: 2,  n: 1, l: 0, m: 0 },
  { symbol: 'Li', name: 'Lithium',   Z: 3,  e: 3,  n: 2, l: 0, m: 0 },
  { symbol: 'Be', name: 'Beryllium', Z: 4,  e: 4,  n: 2, l: 0, m: 0 },
  { symbol: 'B',  name: 'Boron',     Z: 5,  e: 5,  n: 2, l: 1, m: 0 },
  { symbol: 'C',  name: 'Carbon',    Z: 6,  e: 6,  n: 2, l: 1, m: 0 },
  { symbol: 'N',  name: 'Nitrogen',  Z: 7,  e: 7,  n: 2, l: 1, m: 0 },
  { symbol: 'O',  name: 'Oxygen',    Z: 8,  e: 8,  n: 2, l: 1, m: 0 },
  { symbol: 'F',  name: 'Fluorine',  Z: 9,  e: 9,  n: 2, l: 1, m: 0 },
  { symbol: 'Ne', name: 'Neon',      Z: 10, e: 10, n: 2, l: 1, m: 0 },
];

@customElement('atom-editor')
export class AtomEditor extends LitElement {
  @property({ attribute: false }) atom: Atom | null = null;
  @property({ type: Number }) version = 0;

  static styles = css`
    :host {
      position: absolute;
      top: 16px;
      left: 16px;
      z-index: 10;
    }

    .grid {
      display: grid;
      grid-template-columns: 100px 1fr 44px;
      gap: 6px 8px;
      align-items: center;
    }

    label {
      font-size: 12px;
      color: #aac;
      text-align: right;
    }

    input[type='range'] {
      width: 100%;
      accent-color: #58f;
    }

    input[type='number'] {
      width: 100%;
      background: rgba(255,255,255,0.07);
      border: 1px solid rgba(100,140,255,0.3);
      border-radius: 4px;
      color: #8cf;
      font-size: 12px;
      padding: 3px 6px;
      text-align: center;
      font-family: 'Segoe UI', system-ui, sans-serif;
    }

    input[type='number']:focus {
      outline: none;
      border-color: #58f;
    }

    .val {
      font-size: 12px;
      color: #8cf;
      text-align: center;
    }

    .section-label {
      grid-column: 1 / -1;
      font-size: 13px;
      color: #7af;
      margin: 8px 0 2px;
      padding-top: 8px;
      border-top: 1px solid rgba(100,140,255,0.15);
    }

    .section-label:first-child {
      border-top: none;
      margin-top: 0;
      padding-top: 0;
    }

    .atom-id {
      grid-column: 1 / -1;
      font-size: 11px;
      color: #667;
      text-align: center;
      margin-bottom: 4px;
    }

    .presets {
      margin-bottom: 14px;
    }

    .presets label {
      display: block;
      font-size: 12px;
      margin-bottom: 6px;
      color: #aac;
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
      min-width: 32px;
      text-align: center;
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

    .preset-btn .z-num {
      font-size: 9px;
      opacity: 0.6;
      display: block;
      line-height: 1;
    }
  `;

  private emit(key: AtomEditorChange['key'], value: number) {
    if (!this.atom) return;
    this.dispatchEvent(
      new CustomEvent('atom-edit', {
        detail: { atomId: this.atom.id, key, value } satisfies AtomEditorChange,
        bubbles: true,
        composed: true,
      }),
    );
  }

  private applyPreset(preset: ElementPreset) {
    if (!this.atom) return;
    this.dispatchEvent(
      new CustomEvent('atom-preset', {
        detail: { atomId: this.atom.id, preset } satisfies AtomPresetChange,
        bubbles: true,
        composed: true,
      }),
    );
  }

  private onSlider(key: AtomEditorChange['key'], e: Event) {
    this.emit(key, +(e.target as HTMLInputElement).value);
  }

  private onNumber(key: AtomEditorChange['key'], e: Event) {
    this.emit(key, +(e.target as HTMLInputElement).value);
  }

  render() {
    const atom = this.atom;
    if (!atom) return nothing;

    const { n, l, m } = atom;

    return html`
      <collapsible-panel heading="Atom: ${atom.id}" .collapsed=${false}>
        <div class="presets">
          <label>Element Presets</label>
          <div class="preset-grid">
            ${ELEMENT_PRESETS.map(
              (p) => html`
                <button
                  class="preset-btn ${atom.protons === p.Z ? 'active' : ''}"
                  @click=${() => this.applyPreset(p)}
                  title="${p.name} (Z=${p.Z}): ${p.n}${['s','p','d','f'][p.l]}"
                >
                  ${p.symbol}
                  <span class="z-num">${p.Z}</span>
                </button>
              `,
            )}
          </div>
        </div>

        <div class="grid">
          <div class="atom-id">${atom.id} · Z=${atom.protons} · e⁻=${atom.electrons}</div>

          <div class="section-label">Quantum Numbers</div>

          <label>n (shell)</label>
          <input type="range" min="1" max="5" step="1"
            .value=${String(n)}
            @change=${(e: Event) => this.onSlider('n', e)} />
          <span class="val">${n}</span>

          <label>l (angular)</label>
          <input type="range" min="0" .max=${String(n - 1)} step="1"
            .value=${String(l)}
            @change=${(e: Event) => this.onSlider('l', e)} />
          <span class="val">${l}</span>

          <label>m (magnetic)</label>
          <input type="range" .min=${String(-l)} .max=${String(l)} step="1"
            .value=${String(m)}
            @change=${(e: Event) => this.onSlider('m', e)} />
          <span class="val">${m}</span>

          <div class="section-label">Nucleus</div>

          <label>Protons (Z)</label>
          <input type="number" min="1" max="118" step="1"
            .value=${String(atom.protons)}
            @change=${(e: Event) => this.onNumber('protons', e)} />
          <span></span>

          <label>Electrons</label>
          <input type="number" min="0" max="118" step="1"
            .value=${String(atom.electrons)}
            @change=${(e: Event) => this.onNumber('electrons', e)} />
          <span></span>

          <div class="section-label">Position</div>

          <label>X</label>
          <input type="number" min="-50" max="50" step="0.5"
            .value=${String(atom.position[0])}
            @change=${(e: Event) => this.onNumber('posX', e)} />
          <span></span>

          <label>Y</label>
          <input type="number" min="-50" max="50" step="0.5"
            .value=${String(atom.position[1])}
            @change=${(e: Event) => this.onNumber('posY', e)} />
          <span></span>

          <label>Z</label>
          <input type="number" min="-50" max="50" step="0.5"
            .value=${String(atom.position[2])}
            @change=${(e: Event) => this.onNumber('posZ', e)} />
          <span></span>
        </div>
      </collapsible-panel>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'atom-editor': AtomEditor;
  }
}

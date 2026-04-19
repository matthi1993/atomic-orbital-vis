import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { Atom } from '../physics/atom.js';
import { configurationString } from '../physics/electron-config.js';
import type { OrbitalOccupancy } from '../physics/electron-config.js';
import { getElement, CATEGORY_COLORS } from '../config/elements.js';
import type { ElementData } from '../config/elements.js';
import { theme, controls, layout } from './styles/index.js';
import './collapsible-panel.js';
import './periodic-table-modal.js';

export interface AtomEditorChange {
  atomId: string;
  key: 'protons' | 'electrons' | 'posX' | 'posY' | 'posZ' | 'rotX' | 'rotY' | 'rotZ';
  value: number;
}

export interface AtomPresetChange {
  atomId: string;
  preset: ElementPreset;
}

export interface AtomOrbitalSelect {
  atomId: string;
  layer: string;                // 'outer', 'all', or subshell key like '1-0'
  orbitalIndex: number | null;  // null = all in layer
}

export interface AtomSpinFlip {
  atomId: string;
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

@customElement('atom-editor')
export class AtomEditor extends LitElement {
  @property({ attribute: false }) atom: Atom | null = null;
  @property({ type: Number }) version = 0;
  @state() private periodicTableOpen = false;

  static styles = [
    ...theme,
    controls,
    layout,
    css`
      :host {
        position: absolute;
        top: var(--sp-lg);
        left: var(--sp-lg);
        z-index: 10;
      }

      .grid {
        display: grid;
        grid-template-columns: 100px 1fr 44px;
        gap: var(--sp-xs) var(--sp-sm);
        align-items: center;
      }

      .grid label { margin-bottom: 0; text-align: right; }

      .val { text-align: center; }

      .section-label { grid-column: 1 / -1; }

      .atom-id {
        grid-column: 1 / -1;
        font-size: var(--fs-sm);
        color: var(--c-text-dim);
        text-align: center;
        margin-bottom: var(--sp-xs);
      }

      .presets { margin-bottom: var(--sp-md); }
      .presets label { margin-bottom: var(--sp-xs); }

      .element-btn {
        width: 100%;
        display: flex;
        align-items: center;
        gap: var(--sp-sm);
        background: var(--c-bg-hover);
        border: 1px solid var(--c-border);
        border-radius: var(--radius-md);
        color: var(--c-text);
        padding: var(--sp-sm) var(--sp-md);
        cursor: pointer;
        font-family: var(--font-family);
        transition: background var(--transition-fast), border-color var(--transition-fast);
      }

      .element-btn:hover {
        background: rgba(100, 140, 255, 0.25);
        border-color: var(--c-border-hover);
      }

      .element-btn .el-symbol {
        font-size: 22px;
        font-weight: var(--fw-bold);
        min-width: 36px;
        text-align: center;
        padding: 2px 6px;
        border-radius: 5px;
        line-height: 1.2;
        color: #fff;
      }

      .element-btn .el-info {
        display: flex;
        flex-direction: column;
        line-height: 1.3;
      }

      .element-btn .el-name { font-size: var(--fs-sm); color: var(--c-text-muted); }
      .element-btn .el-z { font-size: var(--fs-xs); color: var(--c-text-dim); }
      .element-btn .el-arrow { margin-left: auto; font-size: var(--fs-md); color: var(--c-text-dim); }

      .info-box { grid-column: 1 / -1; }

      .orbital-select-wrap {
        grid-column: 1 / -1;
        margin-top: var(--sp-xs);
      }

      .orbital-select-wrap label {
        margin-bottom: var(--sp-xs);
        text-align: left;
      }

      .spin-row {
        grid-column: 1 / -1;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--sp-sm);
        padding: var(--sp-xs) 0;
      }

      .spin-row .spin-label {
        font-size: var(--fs-sm);
        color: var(--c-text-muted);
      }

      .spin-row .spin-value {
        font-weight: var(--fw-bold);
        font-size: var(--fs-sm);
      }

      .spin-row .spin-up   { color: #6af; }
      .spin-row .spin-down { color: #fa6; }

      .flip-btn {
        background: var(--c-bg-hover);
        border: 1px solid var(--c-border);
        border-radius: var(--radius-md);
        color: var(--c-text);
        padding: var(--sp-xs) var(--sp-sm);
        cursor: pointer;
        font-family: var(--font-family);
        font-size: var(--fs-sm);
        transition: background var(--transition-fast), border-color var(--transition-fast);
      }

      .flip-btn:hover {
        background: rgba(100, 140, 255, 0.25);
        border-color: var(--c-border-hover);
      }
    `,
  ];

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

  private onElementSelect(e: CustomEvent<ElementData>) {
    const el = e.detail;
    this.applyPreset({
      symbol: el.symbol,
      name: el.name,
      Z: el.Z,
      e: el.Z,  // neutral atom
      n: 0, l: 0, m: 0,  // auto-derived from electron count
    });
    this.periodicTableOpen = false;
  }

  private onSlider(key: AtomEditorChange['key'], e: Event) {
    this.emit(key, +(e.target as HTMLInputElement).value);
  }

  private onNumber(key: AtomEditorChange['key'], e: Event) {
    this.emit(key, +(e.target as HTMLInputElement).value);
  }

  private emitOrbitalSelect(layer: string, index: number | null) {
    if (!this.atom) return;
    this.dispatchEvent(
      new CustomEvent('atom-orbital-select', {
        detail: { atomId: this.atom.id, layer, orbitalIndex: index } satisfies AtomOrbitalSelect,
        bubbles: true,
        composed: true,
      }),
    );
  }

  private emitSpinFlip() {
    if (!this.atom) return;
    this.dispatchEvent(
      new CustomEvent('atom-spin-flip', {
        detail: { atomId: this.atom.id } satisfies AtomSpinFlip,
        bubbles: true,
        composed: true,
      }),
    );
  }

  private static SUBSHELL_LABELS = ['s', 'p', 'd', 'f'];

  private formatOrbital(o: OrbitalOccupancy): string {
    const label = AtomEditor.SUBSHELL_LABELS[o.l] ?? '?';
    return `${o.n}${label} (m=${o.m})`;
  }

  render() {
    const atom = this.atom;
    if (!atom) return nothing;

    const { n, l, m } = atom;
    const currentElement = getElement(atom.protons);
    const elBg = currentElement ? CATEGORY_COLORS[currentElement.category] : 'rgba(100,140,255,0.2)';

    return html`
      <periodic-table-modal
        .open=${this.periodicTableOpen}
        .selectedZ=${atom.protons}
        @element-select=${this.onElementSelect}
        @modal-close=${() => { this.periodicTableOpen = false; }}
      ></periodic-table-modal>

      <collapsible-panel heading="Atom: ${atom.id}" .collapsed=${false}>
        <div class="presets">
          <label>Element</label>
          <button class="element-btn" @click=${() => { this.periodicTableOpen = true; }}>
            <span class="el-symbol" style="background:${elBg}">
              ${currentElement?.symbol ?? '?'}
            </span>
            <span class="el-info">
              <span class="el-name">${currentElement?.name ?? 'Unknown'}</span>
              <span class="el-z">Z = ${atom.protons}</span>
            </span>
            <span class="el-arrow">&#9662;</span>
          </button>
        </div>

        <div class="grid">
          <div class="atom-id">${atom.id} · Z=${atom.protons} · e⁻=${atom.electrons}</div>

          <div class="section-label">Orbitals</div>
          <div class="info-box">${configurationString(atom.electrons)}</div>

          <div class="orbital-select-wrap">
            <label>Layer</label>
            <select
              @change=${(e: Event) => {
                const val = (e.target as HTMLSelectElement).value;
                this.emitOrbitalSelect(val, null);
              }}>
              <option value="outer" ?selected=${atom.selectedLayer === 'outer'}>Outer</option>
              <option value="all" ?selected=${atom.selectedLayer === 'all'}>All layers</option>
              ${atom.subshellList.map(s => html`
                <option value=${s.key} ?selected=${atom.selectedLayer === s.key}>
                  ${s.label} — ${s.totalElectrons}e⁻
                </option>
              `)}
            </select>
          </div>

          <div class="orbital-select-wrap">
            <label>Orbital</label>
            <select
              @change=${(e: Event) => {
                const val = (e.target as HTMLSelectElement).value;
                this.emitOrbitalSelect(atom.selectedLayer, val === 'all' ? null : parseInt(val, 10));
              }}>
              <option value="all" ?selected=${atom.selectedOrbitalIndex === null}>All in layer</option>
              ${atom.occupiedOrbitals.map((o, i) => html`
                <option value=${i} ?selected=${atom.selectedOrbitalIndex === i}>
                  ${this.formatOrbital(o)} — ${o.electrons}e⁻
                </option>
              `)}
            </select>
          </div>

          <div class="spin-row">
            <span class="spin-label">Electron spin</span>
            <span class="spin-value ${atom.spinUp ? 'spin-up' : 'spin-down'}">
              ${atom.spinUp ? '↑ up (+½)' : '↓ down (−½)'}
            </span>
            <button class="flip-btn" @click=${() => this.emitSpinFlip()}>Flip</button>
          </div>

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

          <div class="section-label">Rotation (°)</div>

          <label>X</label>
          <input type="number" min="0" max="360" step="5"
            .value=${String(atom.rotation[0])}
            @change=${(e: Event) => this.onNumber('rotX', e)} />
          <span></span>

          <label>Y</label>
          <input type="number" min="0" max="360" step="5"
            .value=${String(atom.rotation[1])}
            @change=${(e: Event) => this.onNumber('rotY', e)} />
          <span></span>

          <label>Z</label>
          <input type="number" min="0" max="360" step="5"
            .value=${String(atom.rotation[2])}
            @change=${(e: Event) => this.onNumber('rotZ', e)} />
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

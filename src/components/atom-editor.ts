import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { Atom } from '../physics/atom.js';
import { configurationString } from '../physics/electron-config.js';
import type { OrbitalOccupancy } from '../physics/electron-config.js';
import { getElement, CATEGORY_COLORS } from '../config/elements.js';
import type { ElementData } from '../config/elements.js';
import './collapsible-panel.js';
import './periodic-table-modal.js';

export interface AtomEditorChange {
  atomId: string;
  key: 'protons' | 'electrons' | 'posX' | 'posY' | 'posZ';
  value: number;
}

export interface AtomPresetChange {
  atomId: string;
  preset: ElementPreset;
}

export interface AtomOrbitalSelect {
  atomId: string;
  orbitalIndex: number | null; // null = all
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

    .element-btn {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(100, 140, 255, 0.10);
      border: 1px solid rgba(100, 140, 255, 0.3);
      border-radius: 8px;
      color: #dde;
      padding: 8px 12px;
      cursor: pointer;
      font-family: 'Segoe UI', system-ui, sans-serif;
      transition: background 0.15s, border-color 0.15s;
    }

    .element-btn:hover {
      background: rgba(100, 140, 255, 0.22);
      border-color: rgba(100, 140, 255, 0.5);
    }

    .element-btn .el-symbol {
      font-size: 22px;
      font-weight: 700;
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

    .element-btn .el-name {
      font-size: 13px;
      color: #cce;
    }

    .element-btn .el-z {
      font-size: 10px;
      color: #889;
    }

    .element-btn .el-arrow {
      margin-left: auto;
      font-size: 14px;
      color: #668;
    }

    .electron-config {
      grid-column: 1 / -1;
      font-size: 13px;
      color: #adf;
      text-align: center;
      padding: 8px 4px;
      background: rgba(100, 140, 255, 0.08);
      border-radius: 6px;
      letter-spacing: 0.5px;
      font-family: 'Segoe UI', system-ui, sans-serif;
      line-height: 1.6;
      word-break: break-word;
    }

    .orbital-select-wrap {
      grid-column: 1 / -1;
      margin-top: 4px;
    }

    .orbital-select-wrap label {
      display: block;
      font-size: 12px;
      color: #aac;
      margin-bottom: 4px;
      text-align: left;
    }

    .orbital-select {
      width: 100%;
      background: rgba(255,255,255,0.07);
      border: 1px solid rgba(100,140,255,0.3);
      border-radius: 4px;
      color: #8cf;
      font-size: 12px;
      padding: 5px 6px;
      font-family: 'Segoe UI', system-ui, sans-serif;
    }

    .orbital-select:focus {
      outline: none;
      border-color: #58f;
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

  private emitOrbitalSelect(index: number | null) {
    if (!this.atom) return;
    this.dispatchEvent(
      new CustomEvent('atom-orbital-select', {
        detail: { atomId: this.atom.id, orbitalIndex: index } satisfies AtomOrbitalSelect,
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

          <div class="section-label">Electron Configuration</div>
          <div class="electron-config">${configurationString(atom.electrons)}</div>

          <div class="orbital-select-wrap">
            <label>Render Orbital</label>
            <select class="orbital-select"
              @change=${(e: Event) => {
                const val = (e.target as HTMLSelectElement).value;
                this.emitOrbitalSelect(val === 'all' ? null : parseInt(val, 10));
              }}>
              <option value="all" ?selected=${atom.selectedOrbitalIndex === null}>All outer orbitals</option>
              ${atom.occupiedOrbitals.map((o, i) => html`
                <option value=${i} ?selected=${atom.selectedOrbitalIndex === i}>
                  ${this.formatOrbital(o)} — ${o.electrons}e⁻
                </option>
              `)}
            </select>
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

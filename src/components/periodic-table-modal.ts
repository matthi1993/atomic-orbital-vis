import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ELEMENTS, CATEGORY_COLORS, CATEGORY_LABELS } from '../config/elements.js';
import type { ElementData, ElementCategory } from '../config/elements.js';

@customElement('periodic-table-modal')
export class PeriodicTableModal extends LitElement {
  @property({ type: Boolean, reflect: true }) open = false;
  @property({ type: Number }) selectedZ = 0;

  static styles = css`
    :host {
      display: none;
    }
    :host([open]) {
      display: block;
    }

    .backdrop {
      position: fixed;
      inset: 0;
      z-index: 1000;
      background: rgba(0, 0, 0, 0.75);
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(4px);
    }

    .modal {
      background: #1a1a2e;
      border: 1px solid rgba(100, 140, 255, 0.25);
      border-radius: 12px;
      padding: 20px 24px 16px;
      max-width: 95vw;
      max-height: 95vh;
      overflow: auto;
      box-shadow: 0 20px 60px rgba(0,0,0,0.6);
    }

    h2 {
      margin: 0 0 14px;
      font-size: 16px;
      font-weight: 500;
      color: #aac;
      text-align: center;
      letter-spacing: 1px;
    }

    /* ── Main grid: 18 columns ─────────────────────────── */
    .table {
      display: grid;
      grid-template-columns: repeat(18, 46px);
      grid-template-rows: repeat(7, 46px) 12px repeat(2, 46px);
      gap: 2px;
    }

    /* Row 8 is just a visual gap between main table and f-block */

    .cell {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      cursor: pointer;
      border: 1px solid transparent;
      transition: border-color 0.12s, transform 0.12s, box-shadow 0.12s;
      position: relative;
      user-select: none;
    }
    .cell:hover {
      border-color: rgba(255,255,255,0.5);
      transform: scale(1.15);
      z-index: 2;
      box-shadow: 0 4px 16px rgba(0,0,0,0.5);
    }
    .cell.selected {
      border-color: #fff;
      box-shadow: 0 0 8px rgba(100,180,255,0.7);
    }

    .cell .z {
      font-size: 8px;
      line-height: 1;
      opacity: 0.7;
      color: #fff;
    }
    .cell .sym {
      font-size: 14px;
      font-weight: 600;
      line-height: 1.2;
      color: #fff;
    }

    /* Placeholder markers for La-Lu / Ac-Lr in main table */
    .marker {
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      font-size: 8px;
      color: #888;
      letter-spacing: 0.3px;
    }

    /* ── Legend ─────────────────────────────────────────── */
    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: 8px 14px;
      justify-content: center;
      margin-top: 14px;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 10px;
      color: #99a;
    }
    .legend-swatch {
      width: 12px;
      height: 12px;
      border-radius: 3px;
    }

    /* ── Tooltip on hover ──────────────────────────────── */
    .cell .tooltip {
      display: none;
      position: absolute;
      bottom: calc(100% + 6px);
      left: 50%;
      transform: translateX(-50%);
      background: #222;
      color: #dde;
      font-size: 11px;
      padding: 4px 8px;
      border-radius: 4px;
      white-space: nowrap;
      pointer-events: none;
      z-index: 10;
      border: 1px solid rgba(100,140,255,0.3);
    }
    .cell:hover .tooltip {
      display: block;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this._onKeyDown = this._onKeyDown.bind(this);
    window.addEventListener('keydown', this._onKeyDown);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('keydown', this._onKeyDown);
  }

  private _onKeyDown(e: KeyboardEvent) {
    if (this.open && e.key === 'Escape') {
      this.close();
    }
  }

  private close() {
    this.open = false;
    this.dispatchEvent(new CustomEvent('modal-close', { bubbles: true, composed: true }));
  }

  private selectElement(el: ElementData) {
    this.dispatchEvent(
      new CustomEvent('element-select', {
        detail: el,
        bubbles: true,
        composed: true,
      }),
    );
    this.close();
  }

  private onBackdropClick(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('backdrop')) {
      this.close();
    }
  }

  render() {
    if (!this.open) return html``;

    const categories = Object.keys(CATEGORY_COLORS) as ElementCategory[];

    return html`
      <div class="backdrop" @click=${this.onBackdropClick}>
        <div class="modal">
          <h2>Periodic Table of Elements</h2>
          <div class="table">
            ${ELEMENTS.map(el => {
              const bg = CATEGORY_COLORS[el.category];
              const selected = el.Z === this.selectedZ;
              return html`
                <div
                  class="cell ${selected ? 'selected' : ''}"
                  style="grid-row:${el.row};grid-column:${el.col};background:${bg}"
                  @click=${() => this.selectElement(el)}
                >
                  <span class="z">${el.Z}</span>
                  <span class="sym">${el.symbol}</span>
                  <span class="tooltip">${el.Z} – ${el.name}</span>
                </div>
              `;
            })}

            <!-- Markers for lanthanide / actinide rows -->
            <div class="marker" style="grid-row:6;grid-column:3;background:${CATEGORY_COLORS['lanthanide']}">
              57-71
            </div>
            <div class="marker" style="grid-row:7;grid-column:3;background:${CATEGORY_COLORS['actinide']}">
              89-103
            </div>
          </div>

          <div class="legend">
            ${categories.map(cat => html`
              <span class="legend-item">
                <span class="legend-swatch" style="background:${CATEGORY_COLORS[cat]}"></span>
                ${CATEGORY_LABELS[cat]}
              </span>
            `)}
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'periodic-table-modal': PeriodicTableModal;
  }
}

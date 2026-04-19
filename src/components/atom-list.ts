import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { Atom } from '../physics/atom.js';
import { getElement, CATEGORY_COLORS } from '../config/elements.js';
import { theme, buttons, layout } from './styles/index.js';
import './collapsible-panel.js';

export interface AtomAddRequest {
  position: [number, number, number];
}

export interface AtomDeleteRequest {
  atomId: string;
}

export interface AtomSelectRequest {
  atomId: string;
}

@customElement('atom-list')
export class AtomList extends LitElement {
  @property({ attribute: false }) atoms: Atom[] = [];
  @property({ type: String }) selectedAtomId: string | null = null;
  @property({ type: Number }) version = 0;

  static styles = [
    ...theme,
    buttons,
    layout,
    css`
      :host {
        position: absolute;
        top: var(--sp-lg);
        left: var(--sp-lg);
        z-index: 11;
      }

      .atom-items {
        display: flex;
        flex-direction: column;
        gap: var(--sp-xs);
        margin-bottom: var(--sp-sm);
      }

      .atom-item {
        display: flex;
        align-items: center;
        gap: var(--sp-sm);
        padding: var(--sp-sm) var(--sp-md);
        border-radius: var(--radius-md);
        border: 1px solid var(--c-border);
        background: var(--c-bg-hover);
        cursor: pointer;
        transition: background var(--transition-fast), border-color var(--transition-fast);
        font-family: var(--font-family);
        color: var(--c-text);
      }

      .atom-item:hover {
        background: rgba(100, 140, 255, 0.15);
        border-color: var(--c-border-hover);
      }

      .atom-item.selected {
        background: rgba(100, 140, 255, 0.25);
        border-color: var(--c-accent-soft);
      }

      .atom-symbol {
        font-size: 16px;
        font-weight: var(--fw-bold);
        min-width: 30px;
        text-align: center;
        padding: 2px 5px;
        border-radius: 4px;
        line-height: 1.2;
        color: #fff;
      }

      .atom-details {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-width: 0;
      }

      .atom-name {
        font-size: var(--fs-sm);
        color: var(--c-text);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .atom-meta {
        font-size: var(--fs-xs);
        color: var(--c-text-dim);
      }

      .delete-btn {
        background: none;
        border: none;
        color: var(--c-text-dim);
        cursor: pointer;
        font-size: 14px;
        padding: 2px 6px;
        border-radius: 4px;
        line-height: 1;
        transition: color var(--transition-fast), background var(--transition-fast);
      }

      .delete-btn:hover {
        color: var(--c-text-error, #f66);
        background: rgba(255, 80, 80, 0.15);
      }

      .add-btn {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--sp-xs);
        background: var(--c-bg-hover);
        border: 1px dashed var(--c-border);
        border-radius: var(--radius-md);
        color: var(--c-text-muted);
        padding: var(--sp-sm) var(--sp-md);
        cursor: pointer;
        font-family: var(--font-family);
        font-size: var(--fs-sm);
        transition: background var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast);
      }

      .add-btn:hover {
        background: rgba(100, 140, 255, 0.15);
        border-color: var(--c-accent-soft);
        color: var(--c-text);
      }
    `,
  ];

  private onSelect(atomId: string) {
    this.dispatchEvent(
      new CustomEvent('atom-select', {
        detail: { atomId } satisfies AtomSelectRequest,
        bubbles: true,
        composed: true,
      }),
    );
  }

  private onDelete(atomId: string, e: Event) {
    e.stopPropagation();
    this.dispatchEvent(
      new CustomEvent('atom-delete', {
        detail: { atomId } satisfies AtomDeleteRequest,
        bubbles: true,
        composed: true,
      }),
    );
  }

  private onAdd() {
    // Offset new atoms so they don't all stack at origin
    const offset = this.atoms.length * 5;
    this.dispatchEvent(
      new CustomEvent('atom-add', {
        detail: { position: [offset, 0, 0] } satisfies AtomAddRequest,
        bubbles: true,
        composed: true,
      }),
    );
  }

  private renderAtomItem(atom: Atom) {
    const el = getElement(atom.protons);
    const bg = el ? CATEGORY_COLORS[el.category] : 'rgba(100,140,255,0.3)';
    const symbol = el?.symbol ?? '?';
    const name = el?.name ?? 'Unknown';
    const isSelected = atom.id === this.selectedAtomId;
    const pos = atom.position;

    return html`
      <div
        class="atom-item ${isSelected ? 'selected' : ''}"
        @click=${() => this.onSelect(atom.id)}
      >
        <span class="atom-symbol" style="background:${bg}">${symbol}</span>
        <span class="atom-details">
          <span class="atom-name">${name} (${atom.id})</span>
          <span class="atom-meta">Z=${atom.protons} e⁻=${atom.electrons} · (${pos[0].toFixed(1)}, ${pos[1].toFixed(1)}, ${pos[2].toFixed(1)})</span>
        </span>
        ${this.atoms.length > 1 ? html`
          <button class="delete-btn" title="Remove atom" @click=${(e: Event) => this.onDelete(atom.id, e)}>✕</button>
        ` : nothing}
      </div>
    `;
  }

  render() {
    return html`
      <collapsible-panel heading="Atoms (${this.atoms.length})" .collapsed=${false}>
        <div class="atom-items">
          ${this.atoms.map(a => this.renderAtomItem(a))}
        </div>
        <button class="add-btn" @click=${this.onAdd}>
          <span>＋</span> Add Atom
        </button>
      </collapsible-panel>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'atom-list': AtomList;
  }
}

import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { theme, layout } from './styles/index.js';

@customElement('collapsible-panel')
export class CollapsiblePanel extends LitElement {
  @property({ type: String }) heading = '';
  @property({ type: Boolean }) collapsed = true;

  static styles = [
    ...theme,
    layout,
    css`
      :host { display: block; }

      .panel {
        background: var(--c-bg);
        backdrop-filter: blur(8px);
        border: 1px solid var(--c-border);
        border-radius: var(--radius-lg);
        width: var(--panel-width);
        color: var(--c-text);
        font-family: var(--font-family);
        overflow: hidden;
      }

      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--sp-md) var(--sp-xl);
        cursor: pointer;
        user-select: none;
      }

      .header:hover { background: var(--c-bg-hover); }

      .chevron {
        font-size: var(--fs-sm);
        color: var(--c-accent-soft);
        transition: transform var(--transition-slow) ease;
      }

      .chevron.open { transform: rotate(180deg); }

      .body {
        max-height: 0;
        overflow: hidden;
        transition: max-height var(--transition-slow) ease;
      }

      .body.open {
        max-height: calc(100vh - 80px);
        overflow-y: auto;
      }

      .content { padding: 0 var(--sp-xl) var(--sp-xl); }
    `,
  ];

  private toggle() {
    this.collapsed = !this.collapsed;
  }

  render() {
    return html`
      <div class="panel">
        <div class="header" @click=${this.toggle}>
          <h2>${this.heading}</h2>
          <span class="chevron ${this.collapsed ? '' : 'open'}">▼</span>
        </div>
        <div class="body ${this.collapsed ? '' : 'open'}">
          <div class="content">
            <slot></slot>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'collapsible-panel': CollapsiblePanel;
  }
}

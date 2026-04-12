import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('collapsible-panel')
export class CollapsiblePanel extends LitElement {
  @property({ type: String }) heading = '';
  @property({ type: Boolean }) collapsed = true;

  static styles = css`
    :host {
      display: block;
    }

    .panel {
      background: rgba(10, 10, 30, 0.85);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(100, 140, 255, 0.25);
      border-radius: 12px;
      width: 300px;
      color: #eee;
      font-family: 'Segoe UI', system-ui, sans-serif;
      overflow: hidden;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 20px;
      cursor: pointer;
      user-select: none;
    }

    .header:hover {
      background: rgba(100, 140, 255, 0.08);
    }

    h2 {
      font-size: 14px;
      margin: 0;
      color: #8af;
    }

    .chevron {
      font-size: 12px;
      color: #8af;
      transition: transform 0.2s ease;
    }

    .chevron.open {
      transform: rotate(180deg);
    }

    .body {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s ease;
    }

    .body.open {
      max-height: calc(100vh - 80px);
      overflow-y: auto;
    }

    .content {
      padding: 0 20px 20px;
    }
  `;

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

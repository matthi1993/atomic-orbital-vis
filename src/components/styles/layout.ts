import { css } from 'lit';

export const layout = css`
  /* Headings */
  h2 { font-size: var(--fs-md); font-weight: var(--fw-semibold); margin: 0; color: var(--c-accent-soft); }
  h3 { font-size: var(--fs-sm); font-weight: var(--fw-semibold); margin: 0; color: var(--c-accent-soft); }

  /* Info box */
  .info-box {
    font-size: var(--fs-sm);
    color: var(--c-accent-glow);
    text-align: center;
    padding: var(--sp-sm) var(--sp-xs);
    background: var(--c-bg-hover);
    border-radius: var(--radius-md);
    letter-spacing: 0.5px;
    font-family: var(--font-family);
    line-height: 1.6;
    word-break: break-word;
  }

  /* Divider with heading */
  .section-divider {
    border-top: 1px solid var(--c-border-subtle);
    padding-top: var(--sp-md);
    margin-top: var(--sp-md);
  }

  .section-divider h3 { margin-bottom: var(--sp-sm); }

  /* Collapsible sub-section */
  .section { margin-bottom: var(--sp-sm); }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    user-select: none;
    padding: var(--sp-xs) 0;
    border-bottom: 1px solid var(--c-border-subtle);
    margin-bottom: var(--sp-sm);
  }

  .section-header:hover { border-bottom-color: var(--c-border-hover); }

  .section-title {
    font-size: var(--fs-sm);
    font-weight: var(--fw-semibold);
    color: var(--c-accent-soft);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .section-chevron {
    font-size: var(--fs-xs);
    color: var(--c-accent-soft);
    transition: transform var(--transition-slow) ease;
  }

  .section-chevron.open { transform: rotate(180deg); }

  .section-body {
    max-height: 0;
    overflow: hidden;
    transition: max-height var(--transition-slow) ease;
  }

  .section-body.open { max-height: 600px; }

  /* Section label (grid/form contexts) */
  .section-label {
    font-size: var(--fs-sm);
    color: var(--c-accent-soft);
    margin: var(--sp-sm) 0 var(--sp-xs);
    padding-top: var(--sp-sm);
    border-top: 1px solid var(--c-border-subtle);
  }

  .section-label:first-child {
    border-top: none;
    margin-top: 0;
    padding-top: 0;
  }

  /* Modal backdrop */
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: var(--c-bg-overlay);
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(4px);
  }

  .modal {
    background: var(--c-bg-surface);
    border: 1px solid var(--c-border);
    border-radius: var(--radius-lg);
    padding: var(--sp-xl);
    max-width: 95vw;
    max-height: 95vh;
    overflow: auto;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
  }
`;

import { css } from 'lit';

export const buttons = css`
  .btn {
    background: rgba(100, 140, 255, 0.12);
    border: 1px solid var(--c-border);
    border-radius: var(--radius-md);
    color: var(--c-accent-glow);
    font-size: var(--fs-sm);
    padding: var(--sp-xs) var(--sp-sm);
    cursor: pointer;
    font-family: var(--font-family);
    transition: background var(--transition-fast), border-color var(--transition-fast);
  }

  .btn:hover {
    background: rgba(100, 140, 255, 0.25);
    border-color: var(--c-border-hover);
  }

  .btn.active {
    background: rgba(100, 140, 255, 0.35);
    border-color: var(--c-accent);
    color: #fff;
  }

  .btn-sm {
    flex: 1;
    padding: var(--sp-xs) 0;
    border: 1px solid var(--c-border-solid);
    border-radius: var(--radius-sm);
    background: var(--c-bg-surface);
    color: var(--c-text-muted);
    font-size: var(--fs-sm);
    font-weight: var(--fw-bold);
    cursor: pointer;
    transition: background var(--transition-fast), border-color var(--transition-fast);
  }

  .btn-sm:hover {
    background: #2a2a4e;
  }

  .btn-sm.active {
    background: #2a2a5e;
    border-color: var(--c-accent);
    color: var(--c-accent-glow);
  }
`;

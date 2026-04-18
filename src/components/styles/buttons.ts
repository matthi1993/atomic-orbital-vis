import { css } from 'lit';

export const buttons = css`
  .btn {
    background: var(--c-btn-bg);
    border: 1px solid var(--c-border-light);
    border-radius: var(--radius-md);
    color: var(--c-btn-text);
    font-size: var(--fs-base);
    padding: var(--sp-2) var(--sp-5);
    cursor: pointer;
    font-family: var(--font-family);
    transition: background var(--transition-base), border-color var(--transition-base);
  }

  .btn:hover {
    background: var(--c-btn-bg-hover);
    border-color: var(--c-border-btn-hover);
  }

  .btn.active {
    background: var(--c-btn-bg-active);
    border-color: var(--c-accent);
    color: var(--c-text-white);
  }

  .btn-sm {
    flex: 1;
    padding: var(--sp-2) 0;
    border: 1px solid var(--c-border-solid);
    border-radius: var(--radius-sm);
    background: var(--c-bg-solid);
    color: var(--c-text-label);
    font-size: var(--fs-base);
    font-weight: var(--fw-bold);
    cursor: pointer;
    transition: background var(--transition-base), border-color var(--transition-base);
  }

  .btn-sm:hover {
    background: var(--c-bg-hover-solid);
  }

  .btn-sm.active {
    background: var(--c-btn-bg-active-solid);
    border-color: var(--c-accent);
    color: var(--c-accent-value);
  }
`;

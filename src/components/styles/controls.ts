import { css } from 'lit';

export const controls = css`
  label {
    display: block;
    font-size: var(--fs-sm);
    margin-bottom: var(--sp-xs);
    color: var(--c-text-muted);
  }

  .control-group {
    margin-bottom: var(--sp-md);
  }

  .row {
    display: flex;
    align-items: center;
    gap: var(--sp-sm);
  }

  input[type='range'] {
    flex: 1;
    accent-color: var(--c-accent);
  }

  .val {
    font-size: var(--fs-sm);
    min-width: 32px;
    text-align: right;
    color: var(--c-accent-glow);
  }

  .toggle-row {
    display: flex;
    align-items: center;
    gap: var(--sp-sm);
    margin-bottom: var(--sp-sm);
  }

  .toggle-row label {
    font-size: var(--fs-sm);
    color: var(--c-text-muted);
    margin: 0;
  }

  input[type='checkbox'] {
    accent-color: var(--c-accent);
  }

  input[type='number'] {
    width: 100%;
    background: var(--c-bg-input);
    border: 1px solid var(--c-border);
    border-radius: var(--radius-sm);
    color: var(--c-accent-glow);
    font-size: var(--fs-sm);
    padding: 3px 6px;
    text-align: center;
    font-family: var(--font-family);
  }

  input[type='number']:focus {
    outline: none;
    border-color: var(--c-accent);
  }

  select {
    width: 100%;
    background: var(--c-bg-input);
    border: 1px solid var(--c-border);
    border-radius: var(--radius-sm);
    color: var(--c-accent-glow);
    font-size: var(--fs-sm);
    padding: 5px 6px;
    font-family: var(--font-family);
  }

  select:focus {
    outline: none;
    border-color: var(--c-accent);
  }
`;

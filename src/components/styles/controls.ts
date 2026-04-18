import { css } from 'lit';

export const controls = css`
  label {
    display: block;
    font-size: var(--fs-base);
    margin-bottom: var(--sp-2);
    color: var(--c-text-label);
  }

  .control-group {
    margin-bottom: var(--sp-7);
  }

  .row {
    display: flex;
    align-items: center;
    gap: var(--sp-4);
  }

  input[type='range'] {
    flex: 1;
    accent-color: var(--c-accent);
  }

  .val {
    font-size: var(--fs-base);
    min-width: 32px;
    text-align: right;
    color: var(--c-accent-value);
  }

  .toggle-row {
    display: flex;
    align-items: center;
    gap: var(--sp-4);
    margin-bottom: var(--sp-4);
  }

  .toggle-row label {
    font-size: var(--fs-base);
    color: var(--c-text-label);
    margin: 0;
  }

  input[type='checkbox'] {
    accent-color: var(--c-accent);
  }

  input[type='number'] {
    width: 100%;
    background: var(--c-bg-input);
    border: 1px solid var(--c-border-light);
    border-radius: var(--radius-sm);
    color: var(--c-accent-value);
    font-size: var(--fs-base);
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
    border: 1px solid var(--c-border-light);
    border-radius: var(--radius-sm);
    color: var(--c-accent-value);
    font-size: var(--fs-base);
    padding: 5px 6px;
    font-family: var(--font-family);
  }

  select:focus {
    outline: none;
    border-color: var(--c-accent);
  }
`;

import { css } from 'lit';

export const sections = css`
  /* Simple divider with heading */
  .section-divider {
    border-top: 1px solid var(--c-border-faint);
    padding-top: var(--sp-6);
    margin-top: var(--sp-6);
  }

  .section-divider h3 {
    font-size: var(--fs-md);
    margin: 0 0 var(--sp-4);
    color: var(--c-accent-section);
  }

  /* Collapsible sub-section */
  .section {
    margin-bottom: var(--sp-5);
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    user-select: none;
    padding: var(--sp-3) 0;
    border-bottom: 1px solid var(--c-border-faint);
    margin-bottom: var(--sp-4);
  }

  .section-header:hover {
    border-bottom-color: var(--c-border-hover);
  }

  .section-title {
    font-size: var(--fs-base);
    font-weight: var(--fw-semibold);
    color: var(--c-accent-heading);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .section-chevron {
    font-size: var(--fs-xs);
    color: var(--c-accent-heading);
    transition: transform var(--transition-slow) var(--ease-default);
  }

  .section-chevron.open {
    transform: rotate(180deg);
  }

  .section-body {
    max-height: 0;
    overflow: hidden;
    transition: max-height var(--transition-slower) var(--ease-default);
  }

  .section-body.open {
    max-height: 600px;
  }

  /* Section label for grid/form contexts */
  .section-label {
    font-size: var(--fs-md);
    color: var(--c-accent-section);
    margin: var(--sp-4) 0 var(--sp-1);
    padding-top: var(--sp-4);
    border-top: 1px solid var(--c-border-faint);
  }

  .section-label:first-child {
    border-top: none;
    margin-top: 0;
    padding-top: 0;
  }
`;

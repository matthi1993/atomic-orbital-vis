import { css } from 'lit';

export const colors = css`
  :host {
    /* Backgrounds */
    --c-bg-panel: rgba(10, 10, 30, 0.85);
    --c-bg-solid: #1a1a2e;
    --c-bg-dark: #111;
    --c-bg-tooltip: #222;
    --c-bg-input: rgba(255, 255, 255, 0.07);
    --c-bg-config: rgba(100, 140, 255, 0.08);
    --c-bg-backdrop: rgba(0, 0, 0, 0.75);
    --c-bg-hover: rgba(100, 140, 255, 0.08);
    --c-bg-hover-solid: #2a2a4e;

    /* Accent */
    --c-accent: #58f;
    --c-accent-heading: #8af;
    --c-accent-section: #7af;
    --c-accent-value: #8cf;
    --c-accent-light: #adf;

    /* Text */
    --c-text: #eee;
    --c-text-white: #fff;
    --c-text-secondary: #dde;
    --c-text-tertiary: #cce;
    --c-text-label: #aac;
    --c-text-legend: #99a;
    --c-text-dim: #889;
    --c-text-muted: #888;
    --c-text-faint: #667;
    --c-text-subtle: #556;
    --c-text-inactive: #668;
    --c-text-error: #f66;

    /* Borders */
    --c-border: rgba(100, 140, 255, 0.25);
    --c-border-light: rgba(100, 140, 255, 0.3);
    --c-border-faint: rgba(100, 140, 255, 0.15);
    --c-border-hover: rgba(100, 140, 255, 0.35);
    --c-border-btn-hover: rgba(100, 140, 255, 0.5);
    --c-border-solid: #446;
    --c-border-cell-hover: rgba(255, 255, 255, 0.5);

    /* Buttons */
    --c-btn-bg: rgba(100, 140, 255, 0.12);
    --c-btn-bg-hover: rgba(100, 140, 255, 0.25);
    --c-btn-bg-active: rgba(100, 140, 255, 0.35);
    --c-btn-bg-active-solid: #2a2a5e;
    --c-btn-text: #adf;

    /* Axis */
    --c-axis-x: #f66;
    --c-axis-y: #6f6;
    --c-axis-z: #68f;
    --c-axis-x-dim: #f664;
    --c-axis-y-dim: #6f64;
    --c-axis-z-dim: #68f4;
  }
`;

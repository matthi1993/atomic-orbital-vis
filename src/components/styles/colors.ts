import { css } from 'lit';

export const colors = css`
  :host {
    --c-bg: rgba(10, 10, 30, 0.85);
    --c-bg-surface: #1a1a2e;
    --c-bg-input: rgba(255, 255, 255, 0.07);
    --c-bg-overlay: rgba(0, 0, 0, 0.75);
    --c-bg-hover: rgba(100, 140, 255, 0.1);

    --c-accent: #58f;
    --c-accent-soft: #8af;
    --c-accent-glow: #8cf;

    --c-text: #eee;
    --c-text-muted: #aac;
    --c-text-dim: #778;
    --c-text-error: #f66;

    --c-border: rgba(100, 140, 255, 0.25);
    --c-border-hover: rgba(100, 140, 255, 0.45);
    --c-border-subtle: rgba(100, 140, 255, 0.15);
    --c-border-solid: #446;

    --c-axis-x: #f66;
    --c-axis-y: #6f6;
    --c-axis-z: #68f;
    --c-axis-x-dim: #f664;
    --c-axis-y-dim: #6f64;
    --c-axis-z-dim: #68f4;
  }
`;

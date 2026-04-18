import type { OrbitalParams } from '../types.js';

/* ── Slider range definition ─────────────────────────────────────────── */

export interface SliderDef {
  label: string;
  min: number;
  max: number;
  step: number;
  /** Maps the slider value → the actual param value (e.g. ÷100 for %).
   *  Defaults to identity. */
  toParam?: (v: number) => number;
  /** Maps the param value → the slider display value.
   *  Defaults to identity. */
  toSlider?: (v: number) => number;
  /** Formats the param value for the on-screen readout. */
  display?: (v: number) => string;
}

/* ── Ranges for every slider param (keyed by OrbitalParams field) ──── */

export const PARAM_DEFS: Partial<Record<keyof OrbitalParams, SliderDef>> = {
  count: {
    label: 'Particle Count (×1000)',
    min: 1,
    max: 500,
    step: 1,
    toParam: (v) => v * 1000,
    toSlider: (v) => v / 1000,
    display: (v) => `${v / 1000}k`,
  },
  threshold: {
    label: 'Density Threshold',
    min: 0,
    max: 100,
    step: 1,
    toParam: (v) => v / 100,
    toSlider: (v) => v * 100,
    display: (v) => v.toFixed(2),
  },
  scale: {
    label: 'Orbital Scale',
    min: 1,
    max: 30,
    step: 1,
    display: (v) => String(v),
  },
  pointSize: {
    label: 'Point Size',
    min: 1,
    max: 30,
    step: 0.5,
    display: (v) => v.toFixed(1),
  },
  rotSpeed: {
    label: 'Rotation Speed',
    min: 0,
    max: 100,
    step: 1,
    toParam: (v) => v / 100,
    toSlider: (v) => v * 100,
    display: (v) => v.toFixed(2),
  },
  electronOpacity: {
    label: 'Electron Opacity',
    min: 5,
    max: 100,
    step: 1,
    toParam: (v) => v / 100,
    toSlider: (v) => v * 100,
    display: (v) => v.toFixed(2),
  },
  n: { label: 'n (shell)', min: 1, max: 5, step: 1, display: (v) => String(v) },
  l: { label: 'l (angular)', min: 0, max: 4, step: 1, display: (v) => String(v) },
  m: { label: 'm (magnetic)', min: -4, max: 4, step: 1, display: (v) => String(v) },
};

/* ── Default values ──────────────────────────────────────────────────── */

export const DEFAULT_PARAMS: OrbitalParams = {
  n: 1,
  l: 0,
  m: 0,
  count: 50000,
  threshold: 0.015,
  scale: 10.0,
  pointSize: 10.0,
  rotSpeed: 0.25,
  electronOpacity: 0.5,
  opaqueMode: true,
  orthographic: true,
  showAxes: true,
  showElectrons: true,
  cutPlane: 'none',
};

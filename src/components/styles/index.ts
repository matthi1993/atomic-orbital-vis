export { colors } from './colors.js';
export { typography } from './typography.js';
export { spacing } from './spacing.js';
export { animations } from './animations.js';
export { controls } from './controls.js';
export { buttons } from './buttons.js';
export { layout } from './layout.js';

import { colors } from './colors.js';
import { typography } from './typography.js';
import { spacing } from './spacing.js';
import { animations } from './animations.js';
import type { CSSResult } from 'lit';

/** All theme CSS custom properties combined */
export const theme: CSSResult[] = [colors, typography, spacing, animations];

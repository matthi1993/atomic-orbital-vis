const SUBSHELL_LABELS = ['s', 'p', 'd', 'f'];

/** Aufbau filling order: (n, l) tuples in energy order */
const FILLING_ORDER: [number, number][] = [
  [1, 0], [2, 0], [2, 1], [3, 0], [3, 1], [4, 0], [3, 2], [4, 1],
  [5, 0], [4, 2], [5, 1], [6, 0], [4, 3], [5, 2], [6, 1], [7, 0],
  [5, 3], [6, 2], [7, 1],
];

export interface OrbitalOccupancy {
  n: number;
  l: number;
  m: number;
  electrons: number; // 1 or 2
}

/**
 * Compute the electron configuration for a given number of electrons,
 * following the Aufbau principle and Hund's rules.
 */
export function electronConfiguration(numElectrons: number): OrbitalOccupancy[] {
  const orbitals: OrbitalOccupancy[] = [];
  let remaining = numElectrons;

  for (const [n, l] of FILLING_ORDER) {
    if (remaining <= 0) break;
    const maxInSubshell = 2 * (2 * l + 1);
    const electronsInSubshell = Math.min(remaining, maxInSubshell);
    remaining -= electronsInSubshell;

    const mValues: number[] = [];
    for (let m = -l; m <= l; m++) mValues.push(m);

    // Hund's rule: fill each m singly first (spin-up), then pair (spin-down)
    let left = electronsInSubshell;
    const occupancy = new Map<number, number>();

    for (const m of mValues) {
      if (left <= 0) break;
      occupancy.set(m, 1);
      left--;
    }
    for (const m of mValues) {
      if (left <= 0) break;
      if ((occupancy.get(m) ?? 0) < 2) {
        occupancy.set(m, 2);
        left--;
      }
    }

    for (const [m, count] of occupancy) {
      orbitals.push({ n, l, m, electrons: count });
    }
  }

  return orbitals;
}

/**
 * Return only the outermost subshell for rendering.
 * This is the last (n,l) subshell in Aufbau filling order — the one that
 * distinguishes this element. E.g. Nitrogen → 2p only, Lithium → 2s only.
 */
export function valenceOrbitals(numElectrons: number): OrbitalOccupancy[] {
  const all = electronConfiguration(numElectrons);
  if (all.length === 0) return [];

  // The last orbital determines the outermost subshell (n, l)
  const last = all[all.length - 1];
  return all.filter(o => o.n === last.n && o.l === last.l);
}

/**
 * Format the electron configuration as "1s² 2s² 2p²" etc.
 */
export function configurationString(numElectrons: number): string {
  if (numElectrons <= 0) return '(none)';

  const orbitals = electronConfiguration(numElectrons);
  const superscriptDigits = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];

  function toSuperscript(n: number): string {
    return String(n).split('').map(d => superscriptDigits[parseInt(d)]).join('');
  }

  // Group by subshell (n, l), preserving insertion order
  const subshells = new Map<string, number>();
  const subshellOrder: string[] = [];
  for (const occ of orbitals) {
    const key = `${occ.n}${SUBSHELL_LABELS[occ.l]}`;
    if (!subshells.has(key)) subshellOrder.push(key);
    subshells.set(key, (subshells.get(key) ?? 0) + occ.electrons);
  }

  return subshellOrder
    .map(key => `${key}${toSuperscript(subshells.get(key)!)}`)
    .join(' ');
}

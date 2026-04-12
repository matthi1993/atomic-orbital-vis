export function factorial(n: number): number {
  let f = 1;
  for (let i = 2; i <= n; i++) f *= i;
  return f;
}

/** Associated Legendre polynomial P_l^m(x) */
export function assocLegendre(l: number, m: number, x: number): number {
  let pmm = 1.0;
  if (m > 0) {
    const somx2 = Math.sqrt(1.0 - x * x);
    let fact = 1.0;
    for (let i = 0; i < m; i++) {
      pmm *= -fact * somx2;
      fact += 2.0;
    }
  }
  if (l === m) return pmm;
  let pmmp1 = x * (2 * m + 1) * pmm;
  if (l === m + 1) return pmmp1;
  let pll = 0;
  for (let ll = m + 2; ll <= l; ll++) {
    pll = (x * (2 * ll - 1) * pmmp1 - (ll + m - 1) * pmm) / (ll - m);
    pmm = pmmp1;
    pmmp1 = pll;
  }
  return pll;
}

/** Real spherical harmonic Y_l^m(theta, phi) */
export function sphericalHarmonic(l: number, m: number, theta: number, phi: number): number {
  const absm = Math.abs(m);
  const norm = Math.sqrt(
    ((2 * l + 1) / (4 * Math.PI)) * factorial(l - absm) / factorial(l + absm),
  );
  const plm = assocLegendre(l, absm, Math.cos(theta));
  if (m > 0) return norm * plm * Math.cos(m * phi) * Math.SQRT2;
  if (m < 0) return norm * plm * Math.sin(absm * phi) * Math.SQRT2;
  return norm * plm;
}

/** Generalized Laguerre polynomial L_p^k(x) */
export function laguerre(p: number, k: number, x: number): number {
  if (p === 0) return 1;
  if (p === 1) return 1 + k - x;
  let lk0 = 1;
  let lk1 = 1 + k - x;
  for (let i = 2; i <= p; i++) {
    const lk2 = ((2 * i - 1 + k - x) * lk1 - (i - 1 + k) * lk0) / i;
    lk0 = lk1;
    lk1 = lk2;
  }
  return lk1;
}

/** Radial wave function R_nl(r) for hydrogen-like atoms (a₀ = 1) */
export function radialWave(n: number, l: number, r: number): number {
  const rho = (2 * r) / n;
  const norm = Math.sqrt(
    Math.pow(2 / n, 3) * factorial(n - l - 1) / (2 * n * factorial(n + l)),
  );
  return norm * Math.exp(-rho / 2) * Math.pow(rho, l) * laguerre(n - l - 1, 2 * l + 1, rho);
}

/** Probability density |ψ|² at spherical coordinates (r, θ, φ) */
export function psiSquared(
  n: number, l: number, m: number,
  r: number, theta: number, phi: number,
): number {
  const R = radialWave(n, l, r);
  const Y = sphericalHarmonic(l, m, theta, phi);
  return R * R * Y * Y;
}

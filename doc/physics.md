# Physics of the Orbital Simulator

## Overview

This simulator visualizes atomic and molecular orbitals by sampling electron probability densities and rendering them as 3D point clouds. It uses hydrogen-like wavefunctions computed on the GPU via WebGPU compute shaders.

## Quantum Numbers

Each orbital is defined by three quantum numbers:

| Symbol | Name | Range | Meaning |
|--------|------|-------|---------|
| **n** | Principal | 1–5 | Shell / energy level |
| **l** | Angular momentum | 0 to n−1 | Orbital shape (s, p, d, f, g) |
| **m** | Magnetic | −l to +l | Orbital orientation in space |

Spin (±½) is tracked per electron and affects interference between atoms.

## Wavefunction

The wavefunction of a hydrogen-like orbital is:

$$\psi_{nlm}(r, \theta, \phi) = R_{nl}(r) \cdot Y_l^m(\theta, \phi)$$

- **Radial part** $R_{nl}(r)$ — uses generalized Laguerre polynomials and an exponential decay $e^{-r/n}$. Controls how the probability spreads out from the nucleus.
- **Angular part** $Y_l^m(\theta, \phi)$ — real spherical harmonics built from associated Legendre polynomials and trigonometric functions. Controls the shape and orientation (lobes, rings, etc.).

The **probability density** of finding an electron at a given point is $|\psi|^2$.

## Electron Configuration

Electrons fill orbitals following standard chemistry rules:

1. **Aufbau principle** — lower-energy orbitals fill first (1s → 2s → 2p → 3s → …).
2. **Hund's rule** — electrons occupy empty orbitals singly (spin-up) before pairing.
3. **Pauli exclusion** — each orbital holds at most 2 electrons with opposite spins.

The simulator can show all orbitals, only valence orbitals, or a specific subshell.

## Particle Generation (Rejection Sampling)

The point cloud is generated on the GPU using rejection sampling:

1. Pick a random orbital from the atom's configuration.
2. Generate a random point in spherical coordinates $(r, \theta, \phi)$.
3. Convert to Cartesian coordinates relative to the atom's position.
4. Evaluate $|\psi|^2 \cdot r^2$ (includes the spherical volume element).
5. Compare against a uniform random number scaled by the known maximum — accept or reject.
6. Repeat until enough particles are accepted.

The sampling radius is capped at $r_{max} = 4 \cdot n^2$ Bohr radii, which captures >99% of the electron density.

## Multi-Atom Interference

When multiple atoms are present, the simulator handles wavefunction summation at two levels:

- **Coherent (within a group)** — orbitals sharing the same $(n, l, m)$ across different atoms interfere. Spin determines the phase:
  - Opposite spins → constructive (bonding).
  - Same spins → destructive (antibonding / Pauli antisymmetry).
- **Incoherent (across groups)** — orbitals with different $(n, l, m)$ are orthogonal, so their probability densities simply add: $\rho = \sum_g |\psi_g|^2$.

## GPU Pipeline

All heavy computation runs in a WebGPU compute shader:

- **Workgroup size**: 256 threads.
- Each thread generates one particle via rejection sampling (up to 192 attempts).
- A PCG hash function provides fast pseudo-random numbers.
- Output: position $(x, y, z)$ + color per particle.
- Color encodes the sign of the dominant wavefunction: **blue** for positive, **orange** for negative.

## Rendering

Accepted particles are rendered as a 3D point cloud with:

- Adjustable point size and opacity.
- Optional cross-section cut planes (x / y / z).
- Camera rotation and zoom controls.

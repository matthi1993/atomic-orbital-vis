/**
 * Molecular orbital compute shader with spin-dependent interference.
 *
 * Physics model (two-level summation):
 *   Orbitals are grouped by quantum numbers (n, l, m).
 *   Within each group g:  ψ_g(r) = Σ sign_i · ψ_i(r − R_i)   [coherent]
 *   Across groups:         ρ(r) = Σ_g |ψ_g|²                   [incoherent]
 *
 * Coherent summation within a group captures molecular bonding between
 * the same orbital type on different atoms (e.g. H₂ 1s + 1s).
 * Incoherent summation across groups is correct because orbitals with
 * different quantum numbers are orthogonal (e.g. 1s and 2p).
 *
 * The sign within each group is determined relative to the group's first
 * entry (the reference):
 *   – same spin as reference → sign = −1  (antibonding, Pauli antisymmetry)
 *   – opposite spin          → sign = +1  (bonding, singlet pairing)
 *   – the reference itself   → sign = +1
 */
export const orbitalShaderCode = /* wgsl */`
  struct GlobalUniforms {
    count: f32,
    scale: f32,
    threshold: f32,
    seed: f32,
    num_atoms: f32,
    max_coherent_psi: f32,
    num_groups: f32,
    _pad2: f32,
  };

  struct AtomConfig {
    n: f32,
    l: f32,
    m: f32,
    pos_x: f32,
    pos_y: f32,
    pos_z: f32,
    r_max: f32,
    max_psi_signed: f32,   // |max_psi|; sign encodes spin (+up, −down)
    group_id: f32,
    electrons: f32,         // 1 or 2 — density weight
  };

  struct Particle {
    pos: vec4<f32>,
    color: vec4<f32>,
  };

  @group(0) @binding(0) var<storage, read_write> particles: array<Particle>;
  @group(0) @binding(1) var<uniform> uniforms: GlobalUniforms;
  @group(0) @binding(2) var<storage, read> atoms: array<AtomConfig>;

  const PI: f32 = 3.14159265359;
  const SQRT2: f32 = 1.41421356237;

  fn pcg_hash(input: u32) -> u32 {
    var state = input * 747796405u + 2891336453u;
    var word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
    return (word >> 22u) ^ word;
  }

  fn rand(seed: ptr<function, u32>) -> f32 {
    *seed = pcg_hash(*seed);
    return f32(*seed) / 4294967295.0;
  }

  fn factorial(n: i32) -> f32 {
    switch n {
      case 0, 1 { return 1.0; }
      case 2  { return 2.0; }
      case 3  { return 6.0; }
      case 4  { return 24.0; }
      case 5  { return 120.0; }
      case 6  { return 720.0; }
      case 7  { return 5040.0; }
      case 8  { return 40320.0; }
      case 9  { return 362880.0; }
      case 10 { return 3628800.0; }
      default { return 1.0; }
    }
  }

  fn assoc_legendre(l: i32, m: i32, x: f32) -> f32 {
    var pmm: f32 = 1.0;
    if (m > 0) {
      let somx2 = sqrt(max(1.0 - x * x, 0.0));
      var fact: f32 = 1.0;
      for (var i: i32 = 0; i < m; i++) {
        pmm *= -fact * somx2;
        fact += 2.0;
      }
    }
    if (l == m) { return pmm; }
    var pmmp1 = x * f32(2 * m + 1) * pmm;
    if (l == m + 1) { return pmmp1; }
    var pll: f32 = 0.0;
    for (var ll: i32 = m + 2; ll <= l; ll++) {
      pll = (x * f32(2 * ll - 1) * pmmp1 - f32(ll + m - 1) * pmm) / f32(ll - m);
      pmm = pmmp1;
      pmmp1 = pll;
    }
    return pll;
  }

  fn laguerre(p: i32, k: i32, x: f32) -> f32 {
    if (p == 0) { return 1.0; }
    if (p == 1) { return 1.0 + f32(k) - x; }
    var lk0: f32 = 1.0;
    var lk1: f32 = 1.0 + f32(k) - x;
    for (var i: i32 = 2; i <= p; i++) {
      let lk2 = ((f32(2 * i - 1 + k) - x) * lk1 - f32(i - 1 + k) * lk0) / f32(i);
      lk0 = lk1;
      lk1 = lk2;
    }
    return lk1;
  }

  /* ψ = R_nl(r) · Y_lm(θ,φ) — caller guarantees r ∈ (0, r_max). */
  fn compute_psi(n: i32, l: i32, m: i32, r: f32, cosTheta: f32, phi: f32) -> f32 {
    let absm = abs(m);

    let inv_n = 1.0 / f32(n);
    let two_over_n = 2.0 * inv_n;

    let R_norm = sqrt(
      pow(two_over_n, 3.0) * factorial(n - l - 1) / (2.0 * f32(n) * factorial(n + l))
    );
    let Y_norm = sqrt(
      (f32(2 * l + 1) / (4.0 * PI)) * factorial(l - absm) / factorial(l + absm)
    );
    let Y_mult = select(1.0, SQRT2, absm > 0);

    let rho = two_over_n * r;
    // Multiply loop instead of pow() — l is small (0–3 in practice)
    var rho_l: f32 = 1.0;
    for (var k: i32 = 0; k < l; k++) { rho_l *= rho; }
    let R_val = R_norm * exp(-rho * 0.5) * rho_l * laguerre(n - l - 1, 2 * l + 1, rho);

    let plm = assoc_legendre(l, absm, cosTheta);
    var Y_angular: f32 = 1.0;
    if (m > 0) { Y_angular = cos(f32(m) * phi); }
    else if (m < 0) { Y_angular = sin(f32(absm) * phi); }
    let Y_val = Y_norm * plm * Y_angular * Y_mult;

    return R_val * Y_val;
  }

  @compute @workgroup_size(256)
  fn main(@builtin(global_invocation_id) id: vec3<u32>) {
    let i = id.x;
    if (i >= u32(uniforms.count)) { return; }

    let num_atoms = i32(uniforms.num_atoms);
    let threshold = uniforms.threshold;
    let s = uniforms.scale;
    let max_coherent = uniforms.max_coherent_psi;

    let num_groups_i = min(i32(uniforms.num_groups), 32);

    var seed = pcg_hash(i * 1099087573u + u32(uniforms.seed));

    var pos = vec4<f32>(0.0, 0.0, 0.0, 0.0);
    var color = vec4<f32>(0.0, 0.0, 0.0, 0.0);

    for (var attempt: i32 = 0; attempt < 192; attempt++) {
      // ── 1. Importance-sample: pick a random orbital as the centre ──
      let oidx = i32(floor(rand(&seed) * f32(num_atoms))) % num_atoms;
      let orbital = atoms[oidx];

      let r = rand(&seed) * orbital.r_max;
      let cosTheta = 2.0 * rand(&seed) - 1.0;
      let phi = rand(&seed) * 2.0 * PI;

      // Convert to world-space Cartesian
      let sinTheta = sqrt(max(1.0 - cosTheta * cosTheta, 0.0));
      let wx = orbital.pos_x + s * r * sinTheta * cos(phi);
      let wy = orbital.pos_y + s * r * sinTheta * sin(phi);
      let wz = orbital.pos_z + s * r * cosTheta;

      // ── 2. Per-group coherent ψ, then incoherent sum across groups ──
      //    Same (n,l,m) on different atoms → coherent (molecular bonding)
      //    Different (n,l,m) → incoherent (orthogonal orbitals)
      var psi_group: array<f32, 32>;
      var grp_ref_spin: array<f32, 32>;
      for (var g: i32 = 0; g < 32; g++) {
        psi_group[g] = 0.0;
        grp_ref_spin[g] = 0.0;   // 0 = not yet assigned
      }

      for (var j: i32 = 0; j < num_atoms; j++) {
        let aj = atoms[j];
        let gid = i32(aj.group_id);
        let aj_spin_sign = sign(aj.max_psi_signed);

        // World → local displacement (undo orbital scale)
        let dx = (wx - aj.pos_x) / s;
        let dy = (wy - aj.pos_y) / s;
        let dz = (wz - aj.pos_z) / s;
        let local_r = sqrt(dx * dx + dy * dy + dz * dz);

        // Skip if outside this orbital's radial extent
        if (local_r > aj.r_max || local_r < 1e-8) { continue; }

        let local_cosTheta = dz / local_r;
        let local_phi = atan2(dy, dx);

        let psi_j = compute_psi(
          i32(aj.n), i32(aj.l), i32(aj.m),
          local_r, local_cosTheta, local_phi
        );

        // Weight by √electrons so density is n·|ψ|² (not n²·|ψ|²).
        let weight = sqrt(aj.electrons);

        // Interference sign within group (multi-atom molecular bonding):
        //   first entry in group:     reference, phase = +1
        //   same spin as reference:   −1  (antibonding / Pauli antisymmetry)
        //   opposite spin:            +1  (bonding / singlet pairing)
        var phase: f32 = 1.0;
        if (grp_ref_spin[gid] == 0.0) {
          grp_ref_spin[gid] = aj_spin_sign;
        } else if (aj_spin_sign * grp_ref_spin[gid] > 0.0) {
          phase = -1.0;
        }

        psi_group[gid] += phase * weight * psi_j;
      }

      // Incoherent sum across groups: ρ = Σ_g |ψ_g|²
      var rho: f32 = 0.0;
      var dominant_psi: f32 = 0.0;
      var max_psi2: f32 = 0.0;
      for (var g: i32 = 0; g < num_groups_i; g++) {
        let pg = psi_group[g];
        let pg2 = pg * pg;
        rho += pg2;
        if (pg2 > max_psi2) {
          max_psi2 = pg2;
          dominant_psi = pg;
        }
      }

      // Weight by r² of the importance-sampling orbital for volume element
      let rho_r2 = rho * r * r;

      var prob: f32 = 0.0;
      if (max_coherent > 0.0) {
        prob = rho_r2 / max_coherent;
      }

      if (prob < threshold) { continue; }
      if (rand(&seed) > prob) { continue; }

      pos = vec4<f32>(wx, wy, wz, 1.0);

      // Colour by dominant group's ψ sign: blue = positive, orange/red = negative
      let t = pow(min(prob * 2.0, 1.0), 1.5);
      if (dominant_psi >= 0.0) {
        color = vec4<f32>(0.2 + 0.6 * t, 0.4 + 0.5 * t, 1.0, t);
      } else {
        color = vec4<f32>(1.0, 0.3 + 0.4 * t, 0.2 + 0.3 * t, t);
      }
      break;
    }

    particles[i] = Particle(pos, color);
  }
`;

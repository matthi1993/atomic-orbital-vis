/**
 * Molecular orbital compute shader.
 *
 * Evaluates the coherent superposition ψ_total = Σ ψᵢ from all atom centres
 * and uses |ψ_total|² for rejection sampling. This produces true bonding /
 * antibonding molecular orbital shapes rather than independent per-atom clouds.
 *
 * Importance-sampling strategy: each thread picks a random atom, samples in
 * spherical coordinates around that atom, then evaluates the full molecular
 * wavefunction at the resulting Cartesian point.
 */
export const orbitalShaderCode = /* wgsl */`
  struct GlobalUniforms {
    count: f32,
    scale: f32,
    threshold: f32,
    max_psi: f32,
    seed: f32,
    num_atoms: f32,
    _pad0: f32,
    _pad1: f32,
  };

  struct AtomConfig {
    n: f32,
    l: f32,
    m: f32,
    pos_x: f32,
    pos_y: f32,
    pos_z: f32,
    r_max: f32,
    _pad: f32,
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

  /* Signed wavefunction ψ = R_nl(r) · Y_lm(θ, φ) for a single atom. */
  fn compute_psi(n: i32, l: i32, m: i32, r: f32, cosTheta: f32, phi: f32, scale: f32) -> f32 {
    let absm = abs(m);
    let rMax = scale * f32(n * n);
    if (r >= rMax || r < 1e-10) { return 0.0; }

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
    var rho_l: f32 = 1.0;
    if (l > 0) { rho_l = pow(rho, f32(l)); }
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
    let scale = uniforms.scale;
    let threshold = uniforms.threshold;
    let max_psi = uniforms.max_psi;

    var seed = pcg_hash(i * 1099087573u + u32(uniforms.seed));

    var pos = vec4<f32>(0.0, 0.0, 0.0, 0.0);
    var color = vec4<f32>(0.0, 0.0, 0.0, 0.0);

    for (var attempt: i32 = 0; attempt < 192; attempt++) {
      // ── Importance sampling: pick a random atom, sample spherically ──
      let atom_idx = i32(floor(rand(&seed) * f32(num_atoms))) % num_atoms;
      let ref_atom = atoms[atom_idx];
      let ref_rMax = ref_atom.r_max;

      let r = rand(&seed) * ref_rMax;
      let cosTheta = 2.0 * rand(&seed) - 1.0;
      let phi = rand(&seed) * 2.0 * PI;

      let sinTheta = sqrt(max(1.0 - cosTheta * cosTheta, 0.0));
      let x = ref_atom.pos_x + r * sinTheta * cos(phi);
      let y = ref_atom.pos_y + r * sinTheta * sin(phi);
      let z = ref_atom.pos_z + r * cosTheta;

      // ── Coherent superposition: ψ_total = Σ ψᵢ ──
      var psi_total: f32 = 0.0;
      for (var a: i32 = 0; a < num_atoms; a++) {
        let atom = atoms[a];
        let dx = x - atom.pos_x;
        let dy = y - atom.pos_y;
        let dz = z - atom.pos_z;
        let r_a = sqrt(dx * dx + dy * dy + dz * dz);
        if (r_a < 1e-10) { continue; }
        let ct_a = dz / r_a;
        let phi_a = atan2(dy, dx);
        psi_total += compute_psi(i32(atom.n), i32(atom.l), i32(atom.m), r_a, ct_a, phi_a, scale);
      }

      // ── Rejection sampling on |ψ_total|² · r² ──
      let psi2 = psi_total * psi_total * r * r;

      var prob: f32 = 0.0;
      if (max_psi > 0.0) {
        prob = psi2 / max_psi;
      }

      if (prob < threshold) { continue; }
      if (rand(&seed) > prob) { continue; }

      // ── Accepted ──
      pos = vec4<f32>(x, y, z, 1.0);

      let t = min(prob * 2.0, 1.0);
      if (psi_total >= 0.0) {
        color = vec4<f32>(0.2 + 0.6 * t, 0.4 + 0.5 * t, 1.0, 0.4 + 0.6 * t);
      } else {
        color = vec4<f32>(1.0, 0.3 + 0.4 * t, 0.2 + 0.3 * t, 0.4 + 0.6 * t);
      }

      break;
    }

    particles[i] = Particle(pos, color);
  }
`;

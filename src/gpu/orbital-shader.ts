/**
 * Per-orbital electron density compute shader.
 *
 * Each thread picks a random orbital, samples in spherical coordinates
 * around that atom, and uses |ψ|²·r² rejection sampling to place a particle.
 */
export const orbitalShaderCode = /* wgsl */`
  struct GlobalUniforms {
    count: f32,
    scale: f32,
    threshold: f32,
    seed: f32,
    num_atoms: f32,
    _pad0: f32,
    _pad1: f32,
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
    max_psi: f32,
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

    var seed = pcg_hash(i * 1099087573u + u32(uniforms.seed));

    var pos = vec4<f32>(0.0, 0.0, 0.0, 0.0);
    var color = vec4<f32>(0.0, 0.0, 0.0, 0.0);

    for (var attempt: i32 = 0; attempt < 192; attempt++) {
      let oidx = i32(floor(rand(&seed) * f32(num_atoms))) % num_atoms;
      let orbital = atoms[oidx];

      let r = rand(&seed) * orbital.r_max;
      let cosTheta = 2.0 * rand(&seed) - 1.0;
      let phi = rand(&seed) * 2.0 * PI;

      let psi_val = compute_psi(i32(orbital.n), i32(orbital.l), i32(orbital.m), r, cosTheta, phi);
      let psi2r2 = psi_val * psi_val * r * r;

      var prob: f32 = 0.0;
      if (orbital.max_psi > 0.0) {
        prob = psi2r2 / orbital.max_psi;
      }

      if (prob < threshold) { continue; }
      if (rand(&seed) > prob) { continue; }

      let sinTheta = sqrt(max(1.0 - cosTheta * cosTheta, 0.0));
      let s = uniforms.scale;
      let x = orbital.pos_x + s * r * sinTheta * cos(phi);
      let y = orbital.pos_y + s * r * sinTheta * sin(phi);
      let z = orbital.pos_z + s * r * cosTheta;

      pos = vec4<f32>(x, y, z, 1.0);
      let t = min(prob * 2.0, 1.0);
      if (psi_val >= 0.0) {
        color = vec4<f32>(0.2 + 0.6 * t, 0.4 + 0.5 * t, 1.0, 0.4 + 0.6 * t);
      } else {
        color = vec4<f32>(1.0, 0.3 + 0.4 * t, 0.2 + 0.3 * t, 0.4 + 0.6 * t);
      }
      break;
    }

    particles[i] = Particle(pos, color);
  }
`;

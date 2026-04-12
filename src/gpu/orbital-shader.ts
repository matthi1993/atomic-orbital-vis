export const orbitalShaderCode = /* wgsl */`
  struct OrbitalUniforms {
    n: f32,
    l: f32,
    m: f32,
    count: f32,
    scale: f32,
    threshold: f32,
    max_psi: f32,
    seed: f32,
  };

  struct Particle {
    pos: vec4<f32>,
    color: vec4<f32>,
  };

  @group(0) @binding(0) var<storage, read_write> particles: array<Particle>;
  @group(0) @binding(1) var<uniform> uniforms: OrbitalUniforms;

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
    var f: f32 = 1.0;
    for (var i: i32 = 2; i <= n; i++) {
      f *= f32(i);
    }
    return f;
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

  fn spherical_harmonic(l: i32, m: i32, theta: f32, phi: f32) -> f32 {
    let absm = abs(m);
    let norm = sqrt(
      (f32(2 * l + 1) / (4.0 * PI)) * factorial(l - absm) / factorial(l + absm)
    );
    let plm = assoc_legendre(l, absm, cos(theta));
    if (m > 0) { return norm * plm * cos(f32(m) * phi) * SQRT2; }
    if (m < 0) { return norm * plm * sin(f32(absm) * phi) * SQRT2; }
    return norm * plm;
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

  fn radial_wave(n: i32, l: i32, r: f32) -> f32 {
    let rho = (2.0 * r) / f32(n);
    let norm = sqrt(
      pow(2.0 / f32(n), 3.0) * factorial(n - l - 1) / (2.0 * f32(n) * factorial(n + l))
    );
    var rho_l: f32 = 1.0;
    if (l > 0) {
      rho_l = pow(rho, f32(l));
    }
    return norm * exp(-rho / 2.0) * rho_l * laguerre(n - l - 1, 2 * l + 1, rho);
  }

  fn psi_squared(n: i32, l: i32, m: i32, r: f32, theta: f32, phi: f32) -> f32 {
    let R = radial_wave(n, l, r);
    let Y = spherical_harmonic(l, m, theta, phi);
    return R * R * Y * Y;
  }

  @compute @workgroup_size(256)
  fn main(@builtin(global_invocation_id) id: vec3<u32>) {
    let i = id.x;
    if (i >= u32(uniforms.count)) { return; }

    let n = i32(uniforms.n);
    let l = i32(uniforms.l);
    let m = i32(uniforms.m);
    let scale = uniforms.scale;
    let threshold = uniforms.threshold;
    let max_psi = uniforms.max_psi;
    let rMax = scale * f32(n * n);

    var seed = pcg_hash(i * 1099087573u + u32(uniforms.seed));

    var pos = vec4<f32>(0.0, 0.0, 0.0, 0.0);
    var color = vec4<f32>(0.0, 0.0, 0.0, 0.0);

    for (var attempt: i32 = 0; attempt < 200; attempt++) {
      let r = rand(&seed) * rMax;
      let cosTheta = 2.0 * rand(&seed) - 1.0;
      let theta = acos(clamp(cosTheta, -1.0, 1.0));
      let phi = rand(&seed) * 2.0 * PI;

      let psi2 = psi_squared(n, l, m, r, theta, phi) * r * r;
      var prob: f32 = 0.0;
      if (max_psi > 0.0) {
        prob = psi2 / max_psi;
      }

      if (prob < threshold) { continue; }
      if (rand(&seed) > prob) { continue; }

      // Accepted
      let sinTheta = sin(theta);
      pos = vec4<f32>(
        r * sinTheta * cos(phi),
        r * sinTheta * sin(phi),
        r * cos(theta),
        1.0
      );

      let R_val = radial_wave(n, l, r);
      let Y_val = spherical_harmonic(l, m, theta, phi);
      let sign_val = R_val * Y_val;
      let t = min(prob * 2.0, 1.0);

      if (sign_val >= 0.0) {
        color = vec4<f32>(0.2 + 0.6 * t, 0.4 + 0.5 * t, 1.0, 0.4 + 0.6 * t);
      } else {
        color = vec4<f32>(1.0, 0.3 + 0.4 * t, 0.2 + 0.3 * t, 0.4 + 0.6 * t);
      }

      break;
    }

    particles[i] = Particle(pos, color);
  }
`;

export const computeShaderCode = /* wgsl */`
  struct Particle {
    pos: vec4<f32>,
    vel: vec4<f32>,
  };

  struct Uniforms {
    time: f32,
    dt: f32,
    count: f32,
    rotSpeed: f32,
  };

  @group(0) @binding(0) var<storage, read_write> particles: array<Particle>;
  @group(0) @binding(1) var<uniform> uniforms: Uniforms;

  @compute @workgroup_size(256)
  fn main(@builtin(global_invocation_id) id: vec3<u32>) {
    let i = id.x;
    if (i >= u32(uniforms.count)) { return; }

    var p = particles[i];
    let r = length(p.pos.xyz);

    // Gentle orbital rotation around Y axis
    let angle = uniforms.dt * uniforms.rotSpeed * (1.0 + 0.3 / max(r, 0.5));
    let cosA = cos(angle);
    let sinA = sin(angle);
    let newX = p.pos.x * cosA - p.pos.z * sinA;
    let newZ = p.pos.x * sinA + p.pos.z * cosA;
    p.pos.x = newX;
    p.pos.z = newZ;

    // Subtle breathing oscillation
    if (uniforms.rotSpeed > 0.0) {
      let breath = 1.0 + 0.003 * sin(uniforms.time * 0.5 + r * 0.2) * uniforms.rotSpeed;
      p.pos.x *= breath;
      p.pos.y *= breath;
      p.pos.z *= breath;
    }

    particles[i] = p;
  }
`;

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

    // No per-particle mutation; camera rotation is handled by OrbitControls.
  }
`;

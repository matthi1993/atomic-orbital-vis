import { orbitalShaderCode } from './orbital-shader.js';
import type { GeneratedParticles } from '../types.js';

const PARTICLE_STRIDE = 32; // pos(vec4) + color(vec4) = 8 floats × 4 bytes
const UNIFORM_SIZE = 32;    // 8 floats × 4 bytes
const ATOM_STRIDE = 40;     // 10 floats × 4 bytes per AtomConfig

export interface AtomGPUConfig {
  n: number;
  l: number;
  m: number;
  position: [number, number, number];
  rMax: number;
  maxPsi: number;
  spin: number; // +0.5 (up) or -0.5 (down)
  groupId: number; // orbitals with same (n,l,m) share a group
  electrons: number; // 1 or 2 — density weight for this orbital
}

export class OrbitalPipeline {
  private device: GPUDevice;
  private pipeline: GPUComputePipeline;
  private bindGroupLayout: GPUBindGroupLayout;
  private particleBuffer: GPUBuffer | null = null;
  private uniformBuffer: GPUBuffer | null = null;
  private atomBuffer: GPUBuffer | null = null;
  private readbackBuffer: GPUBuffer | null = null;
  private bindGroup: GPUBindGroup | null = null;
  private currentCount = 0;
  private currentAtomCount = 0;
  private uniformData = new Float32Array(8);

  constructor(device: GPUDevice) {
    this.device = device;

    const shaderModule = device.createShaderModule({ code: orbitalShaderCode });

    this.bindGroupLayout = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      ],
    });

    this.pipeline = device.createComputePipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [this.bindGroupLayout] }),
      compute: { module: shaderModule, entryPoint: 'main' },
    });

    this.uniformBuffer = device.createBuffer({
      size: UNIFORM_SIZE,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
  }

  private ensureBuffers(count: number, atomCount: number): void {
    const needRebuild =
      this.currentCount !== count ||
      this.currentAtomCount !== atomCount ||
      !this.particleBuffer ||
      !this.atomBuffer;

    if (!needRebuild) return;

    this.particleBuffer?.destroy();
    this.readbackBuffer?.destroy();
    this.atomBuffer?.destroy();

    this.currentCount = count;
    this.currentAtomCount = atomCount;
    const bufferSize = count * PARTICLE_STRIDE;
    const atomBufferSize = Math.max(atomCount, 1) * ATOM_STRIDE;

    this.particleBuffer = this.device.createBuffer({
      size: bufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });

    this.readbackBuffer = this.device.createBuffer({
      size: bufferSize,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });

    this.atomBuffer = this.device.createBuffer({
      size: atomBufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    this.bindGroup = this.device.createBindGroup({
      layout: this.bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.particleBuffer } },
        { binding: 1, resource: { buffer: this.uniformBuffer! } },
        { binding: 2, resource: { buffer: this.atomBuffer } },
      ],
    });
  }

  async generate(
    atomConfigs: AtomGPUConfig[],
    count: number, scale: number, threshold: number,
  ): Promise<GeneratedParticles> {
    const atomCount = atomConfigs.length;
    this.ensureBuffers(count, atomCount);

    // Write global uniforms
    this.uniformData[0] = count;
    this.uniformData[1] = scale;
    this.uniformData[2] = threshold;
    this.uniformData[3] = (performance.now() * 1000) % 16777216;
    this.uniformData[4] = atomCount;
    // Per-group upper bound: within each (n,l,m) group, compute
    // (Σ √maxPsi)² per spin channel; sum across groups for the
    // incoherent total normalization.
    // Per-group upper bound: within each (n,l,m) group, compute
    // (Σ √(electrons·maxPsi))²; sum across groups for incoherent total.
    const groupAmpl = new Map<number, number>();
    for (const a of atomConfigs) {
      const ampl = Math.sqrt(a.electrons * a.maxPsi);
      const g = a.groupId;
      groupAmpl.set(g, (groupAmpl.get(g) ?? 0) + ampl);
    }
    let totalMaxPsi = 0;
    const allGroups = new Set(groupAmpl.keys());
    for (const g of allGroups) {
      const amp = groupAmpl.get(g) ?? 0;
      totalMaxPsi += amp * amp;
    }
    this.uniformData[5] = Math.max(totalMaxPsi, 1e-30);
    this.uniformData[6] = allGroups.size; // num_groups
    // [7] pad
    this.device.queue.writeBuffer(this.uniformBuffer!, 0, this.uniformData);

    // Write atom configs: [n, l, m, pos_x, pos_y, pos_z, r_max, max_psi_signed] per atom
    // Spin is encoded in the sign of max_psi: positive = spin-up, negative = spin-down.
    const atomData = new Float32Array(atomCount * 10);
    for (let i = 0; i < atomCount; i++) {
      const a = atomConfigs[i];
      const off = i * 10;
      atomData[off + 0] = a.n;
      atomData[off + 1] = a.l;
      atomData[off + 2] = a.m;
      atomData[off + 3] = a.position[0];
      atomData[off + 4] = a.position[1];
      atomData[off + 5] = a.position[2];
      atomData[off + 6] = a.rMax;
      atomData[off + 7] = a.spin >= 0 ? a.maxPsi : -a.maxPsi;
      atomData[off + 8] = a.groupId;
      atomData[off + 9] = a.electrons;
    }
    this.device.queue.writeBuffer(this.atomBuffer!, 0, atomData);

    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bindGroup!);
    pass.dispatchWorkgroups(Math.ceil(count / 256));
    pass.end();

    encoder.copyBufferToBuffer(
      this.particleBuffer!, 0,
      this.readbackBuffer!, 0,
      count * PARTICLE_STRIDE,
    );
    this.device.queue.submit([encoder.finish()]);

    await this.readbackBuffer!.mapAsync(GPUMapMode.READ);
    const data = new Float32Array(this.readbackBuffer!.getMappedRange());

    // Compact accepted particles
    const positions = new Float32Array(count * 4);
    const colors = new Float32Array(count * 4);
    let actual = 0;

    for (let i = 0; i < count; i++) {
      const w = data[i * 8 + 3];
      if (w > 0.5) {
        positions[actual * 4 + 0] = data[i * 8 + 0];
        positions[actual * 4 + 1] = data[i * 8 + 1];
        positions[actual * 4 + 2] = data[i * 8 + 2];
        positions[actual * 4 + 3] = 1.0;

        colors[actual * 4 + 0] = data[i * 8 + 4];
        colors[actual * 4 + 1] = data[i * 8 + 5];
        colors[actual * 4 + 2] = data[i * 8 + 6];
        colors[actual * 4 + 3] = data[i * 8 + 7];
        actual++;
      }
    }

    this.readbackBuffer!.unmap();
    return { positions, colors, actual };
  }
}

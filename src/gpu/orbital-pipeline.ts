import { orbitalShaderCode } from './orbital-shader.js';
import type { GeneratedParticles } from '../types.js';

const PARTICLE_STRIDE = 32; // pos(vec4) + color(vec4) = 8 floats × 4 bytes
const UNIFORM_SIZE = 32;    // 8 floats × 4 bytes

export class OrbitalPipeline {
  private device: GPUDevice;
  private pipeline: GPUComputePipeline;
  private bindGroupLayout: GPUBindGroupLayout;
  private particleBuffer: GPUBuffer | null = null;
  private uniformBuffer: GPUBuffer | null = null;
  private readbackBuffer: GPUBuffer | null = null;
  private bindGroup: GPUBindGroup | null = null;
  private currentCount = 0;
  private uniformData = new Float32Array(8);

  constructor(device: GPUDevice) {
    this.device = device;

    const shaderModule = device.createShaderModule({ code: orbitalShaderCode });

    this.bindGroupLayout = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
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

  private ensureBuffers(count: number): void {
    if (this.currentCount === count && this.particleBuffer) return;

    this.particleBuffer?.destroy();
    this.readbackBuffer?.destroy();

    this.currentCount = count;
    const bufferSize = count * PARTICLE_STRIDE;

    this.particleBuffer = this.device.createBuffer({
      size: bufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });

    this.readbackBuffer = this.device.createBuffer({
      size: bufferSize,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });

    this.bindGroup = this.device.createBindGroup({
      layout: this.bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.particleBuffer } },
        { binding: 1, resource: { buffer: this.uniformBuffer! } },
      ],
    });
  }

  async generate(
    n: number, l: number, m: number,
    count: number, scale: number, threshold: number,
    maxPsi: number,
  ): Promise<GeneratedParticles> {
    this.ensureBuffers(count);

    this.uniformData[0] = n;
    this.uniformData[1] = l;
    this.uniformData[2] = m;
    this.uniformData[3] = count;
    this.uniformData[4] = scale;
    this.uniformData[5] = threshold;
    this.uniformData[6] = maxPsi;
    this.uniformData[7] = (performance.now() * 1000) % 16777216;
    this.device.queue.writeBuffer(this.uniformBuffer!, 0, this.uniformData);

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

import { computeShaderCode } from './compute-shader.js';

const PARTICLE_STRIDE = 32; // pos(vec4) + vel(vec4) = 8 floats × 4 bytes
const UNIFORM_SIZE = 16;    // 4 floats × 4 bytes

export class ComputePipeline {
  private device: GPUDevice;
  private particleBuffer!: GPUBuffer;
  private uniformBuffer!: GPUBuffer;
  private pipeline!: GPUComputePipeline;
  private bindGroup!: GPUBindGroup;
  private readbackBuffer!: GPUBuffer;
  private uniformData = new Float32Array(4);
  private readbackPending = false;
  private _particleCount = 0;

  get particleCount(): number {
    return this._particleCount;
  }

  constructor(device: GPUDevice) {
    this.device = device;
  }

  createResources(count: number): void {
    if (this.particleBuffer) this.particleBuffer.destroy();
    if (this.uniformBuffer) this.uniformBuffer.destroy();
    if (this.readbackBuffer) this.readbackBuffer.destroy();

    this._particleCount = count;

    this.particleBuffer = this.device.createBuffer({
      size: count * PARTICLE_STRIDE,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
    });

    this.uniformBuffer = this.device.createBuffer({
      size: UNIFORM_SIZE,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.readbackBuffer = this.device.createBuffer({
      size: count * PARTICLE_STRIDE,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });

    const shaderModule = this.device.createShaderModule({ code: computeShaderCode });

    const bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
      ],
    });

    this.pipeline = this.device.createComputePipeline({
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
      compute: { module: shaderModule, entryPoint: 'main' },
    });

    this.bindGroup = this.device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.particleBuffer } },
        { binding: 1, resource: { buffer: this.uniformBuffer } },
      ],
    });
  }

  uploadParticles(positions: Float32Array): void {
    const data = new Float32Array(this._particleCount * 8);
    for (let i = 0; i < this._particleCount; i++) {
      data[i * 8 + 0] = positions[i * 4 + 0];
      data[i * 8 + 1] = positions[i * 4 + 1];
      data[i * 8 + 2] = positions[i * 4 + 2];
      data[i * 8 + 3] = positions[i * 4 + 3];
      // vel floats remain zero-initialized
    }
    this.device.queue.writeBuffer(this.particleBuffer, 0, data);
  }

  dispatch(time: number, dt: number, rotSpeed: number): GPUCommandEncoder {
    this.uniformData[0] = time;
    this.uniformData[1] = dt;
    this.uniformData[2] = this._particleCount;
    this.uniformData[3] = rotSpeed;
    this.device.queue.writeBuffer(this.uniformBuffer, 0, this.uniformData);

    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.dispatchWorkgroups(Math.ceil(this._particleCount / 256));
    pass.end();

    if (!this.readbackPending) {
      encoder.copyBufferToBuffer(
        this.particleBuffer, 0,
        this.readbackBuffer, 0,
        this._particleCount * PARTICLE_STRIDE,
      );
    }

    return encoder;
  }

  submitAndReadback(encoder: GPUCommandEncoder, callback: (positions: Float32Array) => void): void {
    this.device.queue.submit([encoder.finish()]);

    if (this.readbackPending) return;

    this.readbackPending = true;
    this.readbackBuffer.mapAsync(GPUMapMode.READ).then(() => {
      const data = new Float32Array(this.readbackBuffer.getMappedRange());
      const positions = new Float32Array(this._particleCount * 3);
      for (let i = 0; i < this._particleCount; i++) {
        positions[i * 3 + 0] = data[i * 8 + 0];
        positions[i * 3 + 1] = data[i * 8 + 1];
        positions[i * 3 + 2] = data[i * 8 + 2];
      }
      this.readbackBuffer.unmap();
      callback(positions);
      this.readbackPending = false;
    }).catch(() => {
      this.readbackPending = false;
    });
  }
}

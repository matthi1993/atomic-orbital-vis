import { defineConfig } from 'vite';

export default defineConfig({
  base: '/atomic-orbital-vis/',
  resolve: {
    alias: [
      { find: /^three$/, replacement: 'three/webgpu' },
    ],
  },
});

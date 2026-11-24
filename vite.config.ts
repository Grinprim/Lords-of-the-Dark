import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';

// Relative base so the build works from any GitHub Pages path.
export default defineConfig({
  base: './',
  plugins: [preact()],
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 30000,
  },
});

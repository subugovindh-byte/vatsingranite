import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 30000,
    hookTimeout: 30000,
    globalSetup: './src/__tests__/globalSetup.js',
    reporters: ['verbose'],
    coverage: { enabled: false },
  },
});

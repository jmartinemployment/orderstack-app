import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@models': resolve(__dirname, 'src/app/models'),
      '@services': resolve(__dirname, 'src/app/services'),
      '@shared': resolve(__dirname, 'src/app/shared'),
      '@environments': resolve(__dirname, 'src/environments'),
    },
  },
  test: {
    include: ['src/**/*.spec.ts'],
    environment: 'jsdom',
    globals: true,
    typecheck: {
      enabled: false,
    },
  },
});

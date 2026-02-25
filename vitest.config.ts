/// <reference types="vitest" />
import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [angular()],
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
    setupFiles: ['./vitest.setup.ts'],
    pool: 'threads',
    typecheck: {
      enabled: false,
    },
  },
});

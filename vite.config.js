import { resolve } from 'node:path';
import process from 'node:process';
import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.DECISIONLAB_BASE ?? './',
  input: {
    landing: resolve(import.meta.dirname, 'index.html'),
    app: resolve(import.meta.dirname, 'app/index.html'),
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.js'],
  },
});

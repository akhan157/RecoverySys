import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        url: 'http://localhost/',
      },
    },
    globals: true,
    // XML corpus parsing and jsdom component suites are memory-heavy. Bound
    // contention independently of host CPU count so CI and local runs agree.
    maxWorkers: 2,
    setupFiles: ['./src/test/setup.js'],
    include: ['src/test/**/*.{test,spec}.{js,jsx}'],
  },
})

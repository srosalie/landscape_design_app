import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

const srcDirectory = fileURLToPath(new URL('./src', import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@app': `${srcDirectory}/app`,
      '@core': `${srcDirectory}/core`,
      '@data': `${srcDirectory}/data`,
      '@features': `${srcDirectory}/features`,
    },
  },
  test: {
    environment: 'jsdom',
    // Expose global afterEach/describe/etc. so @testing-library/react can
    // register its automatic DOM cleanup between tests.
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})

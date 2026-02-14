import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: {
    environment: 'node',
    exclude: ['**/node_modules/**', '**/dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'json-summary'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/*.test.*', '**/drizzle/**'],
    },
  },
})

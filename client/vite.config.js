import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Release tag for OpenLens: the commit when Coolify provides it, else the build time.
const release = (process.env.SOURCE_COMMIT || '').slice(0, 7) || new Date().toISOString().slice(0, 16)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: { __APP_RELEASE__: JSON.stringify(release) },
  server: {
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})

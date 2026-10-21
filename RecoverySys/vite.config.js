import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

// GitHub Pages needs an absolute repository path; Tauri loads the built app
// from its bundled protocol and therefore needs relative asset URLs.
const base = process.env.VITE_BASE_PATH ?? (process.env.TAURI_ENV_PLATFORM ? './' : '/RecoverySys/')

export default defineConfig({
  plugins: [react()],
  base,
  build: {
    rollupOptions: {
      input: {
        app: fileURLToPath(new URL('./index.html', import.meta.url)),
        landing: fileURLToPath(new URL('./landing/index.html', import.meta.url)),
      },
    },
  },
})

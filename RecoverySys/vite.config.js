import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages needs an absolute repository path; Tauri loads the built app
// from its bundled protocol and therefore needs relative asset URLs.
const base = process.env.VITE_BASE_PATH ?? (process.env.TAURI_ENV_PLATFORM ? './' : '/RecoverySys/')

export default defineConfig({
  plugins: [react()],
  base,
})

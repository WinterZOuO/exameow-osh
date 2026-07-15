import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      external: ['@tauri-apps/plugin-dialog'],
    },
  },
  clearScreen: false,
  server: {
    port: 5273,
    strictPort: true,
  },
  envPrefix: ['VITE_', 'TAURI_'],
})

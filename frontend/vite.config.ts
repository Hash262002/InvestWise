import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// @ts-ignore
import path from 'node:path'

const __dirname = path.dirname(new URL(import.meta.url).pathname)

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
      },
    },
  },
})

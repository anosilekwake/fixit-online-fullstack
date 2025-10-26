import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // frontend port (default)
    proxy: {
      '/api': {
        target: 'http://localhost:4000', // backend port
        changeOrigin: true,
        secure: false,
      },
    },
  },
})

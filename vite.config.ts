import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './', // Use relative paths for flexible deployment (e.g. HA /local/)
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/ha-api': {
        target: process.env.VITE_HA_URL || 'https://ha.iyinkun.top:8123',
        changeOrigin: true,
        secure: false, // Allow self-signed certs if needed
        ws: true, // Support WebSocket proxy
        rewrite: (path) => path.replace(/^\/ha-api/, ''),
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
  },
})

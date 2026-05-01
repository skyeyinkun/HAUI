import { defineConfig } from 'vitest/config'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

// 读取版本号
import { readFileSync } from 'fs'
const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'))
const appVersion = packageJson.version

export default defineConfig({
  base: './', // Use relative paths for flexible deployment (e.g. HA /local/)
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
  },
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
  build: {
    rollupOptions: {
      // ezuikit-js 是萤石云可选 SDK，不打包进 bundle，运行时通过全局变量或 CDN 加载
      external: ['ezuikit-js'],
      output: {
        globals: {
          'ezuikit-js': 'EZUIKit',
        },
      },
    },
  },
  server: {
    // 允许外部访问（如果你需要从其他设备调试）
    host: true,
    port: 5173,
    // 启用热更新
    hmr: {
      overlay: true,
    },
    proxy: {
      // Home Assistant API 代理 - 支持 REST 和 WebSocket
      '/ha-api': {
        // 通过环境变量 VITE_HA_URL 注入目标地址，禁止硬编码真实域名
        target: process.env.VITE_HA_URL || 'http://localhost:8123',
        changeOrigin: true,
        secure: false, // 允许自签名证书
        ws: true, // 关键：支持 WebSocket 代理
        rewrite: (path) => path.replace(/^\/ha-api/, ''),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('HA代理错误:', err.message);
          });
          proxy.on('proxyReq', (_proxyReq, req, _res) => {
            console.log('HA代理请求:', req.method, req.url);
          });
        },
      },
      // Home Assistant WebSocket 直接代理（用于实时状态更新）
      '/api/websocket': {
        target: process.env.VITE_HA_URL || 'http://localhost:8123',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      // 后端 API 代理（如果有本地后端服务）
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8099',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
  },
})


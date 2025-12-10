// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 所有以 /api 开头的请求，转发到 Flask
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        // 如果 Flask 不是挂在根路径，可以在这里改 pathRewrite（目前不需要）
      },
    },
  },
})

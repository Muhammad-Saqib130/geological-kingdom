import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      // Proxy API calls to Express in dev so cookies stay same-origin
      proxy: {
        '/api': env.API_PROXY_TARGET || 'http://localhost:5000',
        // Locally stored uploads (development only; production images come from Cloudinary)
        '/uploads': env.API_PROXY_TARGET || 'http://localhost:5000',
      },
    },
  }
})

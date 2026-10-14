import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const demo = mode === 'demo' // static demo build (see client/src/demo)

  return {
    plugins: [react(), tailwindcss()],
    // The demo is published as plain files under one URL, so asset paths must be relative
    base: demo ? './' : '/',
    build: demo ? { outDir: 'dist-demo' } : undefined,
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

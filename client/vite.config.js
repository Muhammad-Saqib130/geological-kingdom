import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Proxy API calls to Express in dev so cookies stay same-origin
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
})

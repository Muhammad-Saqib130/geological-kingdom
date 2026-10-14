import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'
import { defineConfig, loadEnv } from 'vite'

// Public address of the shop for absolute links in index.html (link previews need them).
// Vercel provides its production domain; elsewhere set VITE_SITE_URL.
function siteUrl(env) {
  if (env.VITE_SITE_URL) return env.VITE_SITE_URL.replace(/\/$/, '')
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  return 'http://localhost:5173'
}

// On Vercel, fail the build early if vercel.json still points at the placeholder server address
function checkVercelConfig() {
  if (!process.env.VERCEL) return
  const config = readFileSync(new URL('./vercel.json', import.meta.url), 'utf8')
  if (config.includes('YOUR-SERVER')) {
    throw new Error('client/vercel.json still says YOUR-SERVER.onrender.com. Replace it with your server address (see DEPLOY.md, step 4).')
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const demo = mode === 'demo' // static demo build (see client/src/demo)
  if (!demo) checkVercelConfig()
  const site = siteUrl(env)

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'site-url',
        transformIndexHtml: (html) => {
          const out = html.replaceAll('%SITE_URL%', site)
          // Google Search Console ownership check (Settings > Ownership verification > HTML tag)
          const google = (env.VITE_GOOGLE_SITE_VERIFICATION ?? '').replace(/[^\w-]/g, '')
          return google ? out.replace('</head>', `  <meta name="google-site-verification" content="${google}" />\n  </head>`) : out
        },
      },
    ],
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

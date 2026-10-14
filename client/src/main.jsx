import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { DEMO } from './lib/api.js'

// The static demo is served from a single URL, so it routes with #/paths
const Router = DEMO ? HashRouter : BrowserRouter

// The server fills <head> with this page's title and preview tags (for crawlers). From here on the
// app manages <head> itself, so remove them; otherwise the first page's title would stick.
document.querySelectorAll('[data-seo]').forEach((el) => el.remove())

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Router>
      <App />
    </Router>
  </StrictMode>,
)

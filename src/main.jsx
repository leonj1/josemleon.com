import '@/lib/disable-base44-analytics.js'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)

// Vitals reporting is a local-development concern: enabled in `npm run dev`
// (DEV) or when the Docker build passes ENABLE_METRICS=1 (compose). The
// condition is statically false in default production builds, so the dynamic
// import is tree-shaken out of the bundle entirely.
if (import.meta.env.DEV || import.meta.env.VITE_ENABLE_METRICS === '1') {
  import('@/lib/vitals-reporter.js').then((m) => m.reportWebVitals())
}

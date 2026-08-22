import '@/lib/disable-base44-analytics.js'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { reportWebVitals } from '@/lib/vitals-reporter.js'

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)

reportWebVitals()

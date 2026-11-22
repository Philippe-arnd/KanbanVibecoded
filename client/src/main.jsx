import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App.jsx'
import { initObservability } from './observability.js'
import { ErrorBoundary } from './ErrorBoundary.jsx'
import { initOpenLens } from './openlens.js'

initObservability()
initOpenLens()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
)

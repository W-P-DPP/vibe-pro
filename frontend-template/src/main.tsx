import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AppProviders } from '@/components/AppProviders'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <HashRouter>
        <App />
      </HashRouter>
    </AppProviders>
  </StrictMode>,
)

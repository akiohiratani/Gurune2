import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import StartupPlayback from './StartupPlayback.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StartupPlayback />
  </StrictMode>,
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { MapProvider } from './context/MapContext'
import { SmoothScroll } from './components/layout/SmoothScroll'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <SmoothScroll>
        <MapProvider>
          <App />
        </MapProvider>
      </SmoothScroll>
    </BrowserRouter>
  </StrictMode>,
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Fonts are bundled so the demo looks the same with the network off.
import '@fontsource/be-vietnam-pro/400.css'
import '@fontsource/be-vietnam-pro/500.css'
import '@fontsource/be-vietnam-pro/600.css'
import '@fontsource/be-vietnam-pro/700.css'
import '@fontsource/literata/400.css'
import '@fontsource/literata/500.css'
import App from './App'
import './theme.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// AQUI: Removemos o .tsx do final
import App from './App' 

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
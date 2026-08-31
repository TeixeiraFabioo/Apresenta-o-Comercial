/* Main entry point for the application - renders the root React component */
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './main.css'

// Ensure dark mode is applied to root html element by default
if (typeof document !== 'undefined') {
  document.documentElement.classList.add('dark')
}

// @skip-protected: Do not remove. Required for React rendering.
createRoot(document.getElementById('root')!).render(<App />)

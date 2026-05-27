/// <reference types="vite-plugin-pwa/client" />
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerSW } from 'virtual:pwa-register'

registerSW({
  immediate: true,
  onRegisterError: (err) => console.error('SW registration failed:', err),
})

createRoot(document.getElementById("root")!).render(<App />);

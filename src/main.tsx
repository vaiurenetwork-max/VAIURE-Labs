import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { LanguageProvider } from './services/i18n';
import './index.css';

// Prevent harmless dev-server HMR websocket disconnection alerts from interrupting UI
if (typeof window !== 'undefined') {
  window.addEventListener(
    'unhandledrejection',
    (event) => {
      const reason = event?.reason;
      const msg = (reason && typeof reason === 'object' && reason.message) ? reason.message : String(reason || '');
      if (msg.includes('WebSocket') || msg.includes('websocket')) {
        event.preventDefault();
        if (typeof event.stopImmediatePropagation === 'function') {
          event.stopImmediatePropagation();
        }
      }
    },
    true
  );
  window.addEventListener(
    'error',
    (event) => {
      const msg = event?.message || '';
      if (msg.includes('WebSocket') || msg.includes('websocket')) {
        event.preventDefault();
        if (typeof event.stopImmediatePropagation === 'function') {
          event.stopImmediatePropagation();
        }
      }
    },
    true
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </StrictMode>,
);



import React, { ErrorInfo, ReactNode, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { LanguageProvider } from './services/i18n';
import './index.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class RootErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  declare props: Readonly<ErrorBoundaryProps>;
  state: ErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error?.message || 'Unexpected render error.' };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('VAIURE Runtime ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-[#09090b] text-white flex flex-col items-center justify-center p-6 text-center">
          <p className="text-xs uppercase tracking-[0.28em] text-zinc-400 mb-3">VAIURE Studio</p>
          <h1 className="text-xl font-medium tracking-wide mb-2">Session Interrupted</h1>
          <p className="text-sm text-zinc-400 max-w-md mb-6">{this.state.message}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 bg-white text-black text-xs uppercase tracking-widest font-medium hover:bg-zinc-200 transition-colors"
          >
            Reload Workspace
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

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
    <RootErrorBoundary>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </RootErrorBoundary>
  </StrictMode>,
);



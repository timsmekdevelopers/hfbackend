import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { TranslationProvider } from './i18n';

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || '').replace(/\/$/, '');

if (API_BASE_URL && typeof window !== 'undefined' && typeof window.fetch === 'function') {
  const originalFetch = window.fetch.bind(window);

  // Keep existing relative /api/... calls working by prepending API base URL in hosted environments.
  window.fetch = (input, init) => {
    if (typeof input === 'string' && input.startsWith('/')) {
      return originalFetch(`${API_BASE_URL}${input}`, init);
    }
    return originalFetch(input, init);
  };
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <TranslationProvider>
      <App />
    </TranslationProvider>
  </React.StrictMode>
);

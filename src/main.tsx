import './styles/tokens.css';
import './styles/base.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { applyCachedAppearance } from './app/ThemeController';

// Zuletzt genutztes Theme/Kurs-Akzent sofort setzen – kein Farbblitz vor dem Laden der Daten.
applyCachedAppearance();

const container = document.getElementById('root');
if (!container) throw new Error('#root fehlt in index.html');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

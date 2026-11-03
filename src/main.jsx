import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/600.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import './styles.css';
import App from './App.jsx';
import { LangProvider, detectLang, loadDict } from './i18n/index.jsx';

// The language is known before the first paint, so the page never flashes in English.
const lang = detectLang();
loadDict(lang).then((dict) => {
  createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <LangProvider initial={{ lang, dict }}>
        <App />
      </LangProvider>
    </React.StrictMode>,
  );
});

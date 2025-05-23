// src/pasteStackRenderer.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import PasteStackApp from './components/pastestack/PasteStackApp'; 

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <PasteStackApp />
  </React.StrictMode>
);

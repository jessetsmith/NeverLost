import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { LayoutProvider } from './context/LayoutContext';
import { BrowserRouter } from 'react-router-dom';

import './index.css';

// Get base path for GitHub Pages
// If deployed to GitHub Pages, use the repository name as base path
const basename = import.meta.env.PROD ? "/NeverLost" : "";

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <LayoutProvider>
        <App />
      </LayoutProvider>
    </BrowserRouter>
  </React.StrictMode>
);
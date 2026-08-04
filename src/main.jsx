import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { LayoutProvider } from './context/LayoutContext';
import { NotificationProvider } from './context/NotificationContext';
import { BrowserRouter } from 'react-router-dom';

import './index.css';

// Restore deep links after GitHub Pages 404.html redirect (/?/route/path)
(function restoreSpaPath(location) {
  if (location.search[1] === '/') {
    const decoded = location.search
      .slice(1)
      .split('&')
      .map((segment) => segment.replace(/~and~/g, '&'))
      .join('?');
    window.history.replaceState(
      null,
      null,
      `${location.pathname.slice(0, -1)}${decoded}${location.hash}`,
    );
  }
}(window.location));

// Get base path for GitHub Pages
// If deployed to GitHub Pages, use the repository name as base path
const basename = import.meta.env.PROD ? "/NeverLost" : "";

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <LayoutProvider>
        <NotificationProvider>
          <App />
        </NotificationProvider>
      </LayoutProvider>
    </BrowserRouter>
  </React.StrictMode>
);

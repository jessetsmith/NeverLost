import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { LayoutProvider } from './context/LayoutContext';
import { BrowserRouter } from 'react-router-dom';
import { Leva } from 'leva'

import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <LayoutProvider>
        <Leva />

        <App />
      </LayoutProvider>
    </BrowserRouter>
  </React.StrictMode>
);
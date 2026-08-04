/**
 * API Configuration
 *
 * Local dev (default):  `npm run dev` → Vite proxy `/api` → localhost:3000
 * Local + deployed API: `npm run dev:production` → Cloud Run URL
 * Production build:     uses VITE_APP_API_URL or PRODUCTION_API_HOST fallback
 */
const PRODUCTION_API_HOST = 'https://api-2dvyyijs7a-uc.a.run.app';

/** Ensure base URL ends with /api (backend mounts routes under /api/*). */
function normalizeApiUrl(url) {
  const trimmed = String(url).replace(/\/$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

const getApiUrl = () => {
  if (import.meta.env.VITE_APP_API_URL) {
    return normalizeApiUrl(import.meta.env.VITE_APP_API_URL);
  }

  if (import.meta.env.PROD) {
    return normalizeApiUrl(PRODUCTION_API_HOST);
  }

  return '/api';
};

export const API_URL = getApiUrl();

// Helper function to create axios instance with default config
export const createApiClient = () => {
  const axios = require('axios').default;
  return axios.create({
    baseURL: API_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};


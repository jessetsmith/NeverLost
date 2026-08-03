/**
 * API Configuration
 * 
 * In production (GitHub Pages), uses Firebase Functions URL
 * In development, uses local proxy '/api' which points to localhost:3000
 */
const getApiUrl = () => {
  // Check if we have an explicit API URL set
  if (import.meta.env.VITE_APP_API_URL) {
    return import.meta.env.VITE_APP_API_URL;
  }

  // In production (GitHub Pages), use Firebase Functions
  // Firebase Functions v2 uses Cloud Run URLs
  if (import.meta.env.PROD) {
    // Try the Cloud Run URL first, fallback to cloudfunctions.net
    return 'https://api-2dvyyijs7a-uc.a.run.app';
  }

  // In development, use local proxy
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


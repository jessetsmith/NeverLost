const PRODUCTION_API_HOST = 'https://api-2dvyyijs7a-uc.a.run.app';

export function resolveProfileImageUrl(url) {
  if (!url) {
    return '';
  }

  if (!import.meta.env.PROD && /^https?:\/\/[^/]+\/uploads\//.test(url)) {
    return url.replace(/^https?:\/\/[^/]+/, '');
  }

  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }

  if (url.startsWith('/uploads/')) {
    if (import.meta.env.PROD) {
      const configured = import.meta.env.VITE_APP_API_URL || PRODUCTION_API_HOST;
      const base = configured.replace(/\/api\/?$/, '').replace(/\/$/, '');
      return `${base}${url}`;
    }
    return url;
  }

  return url;
}

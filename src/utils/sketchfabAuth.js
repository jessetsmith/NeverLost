const SKETCHFAB_TOKEN_KEY = 'sketchfab_access_token';
const SKETCHFAB_REFRESH_KEY = 'sketchfab_refresh_token';
const PENDING_ACTION_KEY = 'sketchfab_pending_action';

export function getSketchfabRedirectUri() {
    const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
    return `${window.location.origin}${base}/library`;
}

export function getSketchfabToken() {
    return localStorage.getItem(SKETCHFAB_TOKEN_KEY) || '';
}

export function setSketchfabTokens({ accessToken, refreshToken }) {
    if (accessToken) localStorage.setItem(SKETCHFAB_TOKEN_KEY, accessToken);
    if (refreshToken) localStorage.setItem(SKETCHFAB_REFRESH_KEY, refreshToken);
}

export function clearSketchfabTokens() {
    localStorage.removeItem(SKETCHFAB_TOKEN_KEY);
    localStorage.removeItem(SKETCHFAB_REFRESH_KEY);
}

export function isSketchfabConnected() {
    return Boolean(getSketchfabToken());
}

export function setPendingSketchfabAction(action) {
    sessionStorage.setItem(PENDING_ACTION_KEY, JSON.stringify(action));
}

export function getPendingSketchfabAction() {
    const raw = sessionStorage.getItem(PENDING_ACTION_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

export function clearPendingSketchfabAction() {
    sessionStorage.removeItem(PENDING_ACTION_KEY);
}

import axios from 'axios';

const SKETCHFAB_SESSION_KEY = 'neverlost_sketchfab_session';
const SKETCHFAB_TOKEN_KEY = 'sketchfab_access_token';
const SKETCHFAB_REFRESH_KEY = 'sketchfab_refresh_token';
const PENDING_ACTION_KEY = 'sketchfab_pending_action';
const REFRESH_BUFFER_MS = 5 * 60 * 1000;

export function getSketchfabRedirectUri() {
    const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
    return `${window.location.origin}${base}/library`;
}

function loadSketchfabSession() {
    const raw = localStorage.getItem(SKETCHFAB_SESSION_KEY);
    if (raw) {
        try {
            return JSON.parse(raw);
        } catch {
            localStorage.removeItem(SKETCHFAB_SESSION_KEY);
        }
    }

    const accessToken = localStorage.getItem(SKETCHFAB_TOKEN_KEY) || '';
    const refreshToken = localStorage.getItem(SKETCHFAB_REFRESH_KEY) || '';
    if (!accessToken && !refreshToken) {
        return null;
    }

    const migrated = {
        accessToken,
        refreshToken,
        expiresAt: 0,
    };
    saveSketchfabSession(migrated);
    localStorage.removeItem(SKETCHFAB_TOKEN_KEY);
    localStorage.removeItem(SKETCHFAB_REFRESH_KEY);
    return migrated;
}

function saveSketchfabSession(session) {
    if (!session?.accessToken && !session?.refreshToken) {
        localStorage.removeItem(SKETCHFAB_SESSION_KEY);
        return;
    }

    localStorage.setItem(SKETCHFAB_SESSION_KEY, JSON.stringify(session));
}

export function getSketchfabToken() {
    return loadSketchfabSession()?.accessToken || '';
}

export function getSketchfabRefreshToken() {
    return loadSketchfabSession()?.refreshToken || '';
}

export function setSketchfabTokens({ accessToken, refreshToken, expiresIn }) {
    const current = loadSketchfabSession() || {};
    const expiresAt = typeof expiresIn === 'number' && expiresIn > 0
        ? Date.now() + (expiresIn * 1000)
        : current.expiresAt || (Date.now() + (30 * 24 * 60 * 60 * 1000));

    saveSketchfabSession({
        accessToken: accessToken || current.accessToken || '',
        refreshToken: refreshToken || current.refreshToken || '',
        expiresAt,
    });
}

export function clearSketchfabTokens() {
    localStorage.removeItem(SKETCHFAB_SESSION_KEY);
    localStorage.removeItem(SKETCHFAB_TOKEN_KEY);
    localStorage.removeItem(SKETCHFAB_REFRESH_KEY);
}

export function isSketchfabConnected() {
    const session = loadSketchfabSession();
    return Boolean(session?.accessToken || session?.refreshToken);
}

export async function ensureSketchfabAccessToken(apiUrl, authHeaders) {
    const session = loadSketchfabSession();
    if (!session) {
        return null;
    }

    const hasValidAccessToken = session.accessToken &&
        session.expiresAt &&
        session.expiresAt > (Date.now() + REFRESH_BUFFER_MS);

    if (hasValidAccessToken) {
        return session.accessToken;
    }

    if (!session.refreshToken) {
        if (session.accessToken) {
            return session.accessToken;
        }
        clearSketchfabTokens();
        return null;
    }

    try {
        const response = await axios.post(
            `${apiUrl}/sketchfab/oauth/refresh`,
            { refreshToken: session.refreshToken },
            { headers: authHeaders() },
        );

        setSketchfabTokens({
            accessToken: response.data.accessToken,
            refreshToken: response.data.refreshToken,
            expiresIn: response.data.expiresIn,
        });

        return response.data.accessToken;
    } catch {
        clearSketchfabTokens();
        return null;
    }
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

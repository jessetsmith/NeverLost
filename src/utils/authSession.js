const SESSION_KEY = 'neverlost_session';
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

function parseUser(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveAuthSession({ token, user }) {
  if (!token) {
    clearAuthSession();
    return;
  }

  const session = {
    token,
    user: user || null,
    expiresAt: Date.now() + SESSION_TTL_MS,
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  localStorage.setItem('token', token);
  if (user) {
    localStorage.setItem('user', JSON.stringify(user));
  } else {
    localStorage.removeItem('user');
  }
}

export function loadAuthSession() {
  const raw = localStorage.getItem(SESSION_KEY);

  if (raw) {
    try {
      const session = JSON.parse(raw);
      if (session.token && session.expiresAt > Date.now()) {
        return {
          token: session.token,
          user: session.user || parseUser(localStorage.getItem('user')),
        };
      }
    } catch {
      // Fall through to legacy migration/cleanup.
    }
    clearAuthSession();
    return null;
  }

  const legacyToken = localStorage.getItem('token');
  if (!legacyToken) {
    return null;
  }

  const legacyUser = parseUser(localStorage.getItem('user'));
  saveAuthSession({ token: legacyToken, user: legacyUser });
  return { token: legacyToken, user: legacyUser };
}

export function clearAuthSession() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

export function getAuthToken() {
  return loadAuthSession()?.token ?? null;
}

export function isAuthSessionValid() {
  return Boolean(getAuthToken());
}

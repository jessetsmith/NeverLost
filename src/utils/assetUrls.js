import { API_URL } from '../config/api';

const ALLOWED_HOSTS = new Set([
    'cdn.sanity.io',
    'drive.google.com',
    'storage.googleapis.com',
    'firebasestorage.googleapis.com',
]);

/** Convert share links (e.g. Google Drive) to a fetchable download URL. */
export function normalizeAssetUrl(url) {
    if (!url?.trim()) return '';
    const trimmed = url.trim();
    const driveFileMatch = trimmed.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
    if (driveFileMatch) {
        return `https://drive.google.com/uc?export=download&id=${driveFileMatch[1]}`;
    }
    if (trimmed.includes('drive.google.com')) {
        const idMatch = trimmed.match(/[?&]id=([^&]+)/i);
        if (idMatch) {
            return `https://drive.google.com/uc?export=download&id=${idMatch[1]}`;
        }
    }
    return trimmed;
}

function hasModelExtension(pathname, fullUrl) {
    const pathLower = pathname.toLowerCase();
    const fullLower = fullUrl.toLowerCase();
    return pathLower.endsWith('.glb') || pathLower.endsWith('.gltf')
        || pathLower.includes('.glb') || pathLower.includes('.gltf')
        || fullLower.includes('.glb') || fullLower.includes('.gltf');
}

/** Validate URLs users can paste into the editor. */
export function isValidAssetUrl(url) {
    if (!url?.trim()) return false;
    const normalized = normalizeAssetUrl(url);
    try {
        const parsed = new URL(normalized);
        if (parsed.protocol !== 'https:') {
            if (!(parsed.protocol === 'http:' && import.meta.env.DEV)) return false;
        }

        const host = parsed.hostname.toLowerCase();
        if (ALLOWED_HOSTS.has(host)) return true;
        if (host.endsWith('.amazonaws.com') && hasModelExtension(parsed.pathname, normalized)) return true;
        return hasModelExtension(parsed.pathname, normalized);
    } catch {
        return false;
    }
}

export function getAssetAuthHeaders(storedUrl) {
    const loadUrl = getAssetLoadUrl(storedUrl);
    if (!loadUrl.includes('/assets/proxy')) return {};
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Runtime URL passed to useGLTF — proxies remote hosts that block browser CORS. */
export function getAssetLoadUrl(storedUrl) {
    if (!storedUrl?.trim()) return '';
    const normalized = normalizeAssetUrl(storedUrl.trim());

    if (!isValidAssetUrl(normalized)) return '';

    if (normalized.includes('/uploads/assets/')) return normalized;

    return `${API_URL}/assets/proxy?url=${encodeURIComponent(normalized)}`;
}

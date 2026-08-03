import { API_URL } from '../config/api';

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

/** Validate URLs users can paste into the editor. */
export function isValidAssetUrl(url) {
    if (!url?.trim()) return false;
    const normalized = normalizeAssetUrl(url);
    try {
        const parsed = new URL(normalized);
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
        const host = parsed.hostname.toLowerCase();
        const path = parsed.pathname.toLowerCase();
        const full = normalized.toLowerCase();

        if (host.includes('drive.google.com')) return true;
        if (host.includes('cdn.sanity.io')) return true;
        if (host.includes('storage.googleapis.com')) return true;
        if (host.includes('firebasestorage.googleapis.com')) return true;
        if (host.endsWith('.amazonaws.com')) return true;
        if (path.includes('.glb') || path.includes('.gltf')) return true;
        if (full.includes('.glb') || full.includes('.gltf')) return true;
        return false;
    } catch {
        return false;
    }
}

/** Runtime URL passed to useGLTF — proxies external hosts that block CORS. */
export function getAssetLoadUrl(storedUrl) {
    if (!storedUrl?.trim()) return '';
    const normalized = normalizeAssetUrl(storedUrl.trim());

    if (normalized.includes('cdn.sanity.io')) return normalized;
    if (normalized.includes('/uploads/assets/')) return normalized;

    const directHosts = [
        'storage.googleapis.com',
        'firebasestorage.googleapis.com',
    ];
    if (directHosts.some((host) => normalized.includes(host))) {
        return normalized;
    }

    return `${API_URL}/assets/proxy?url=${encodeURIComponent(normalized)}`;
}

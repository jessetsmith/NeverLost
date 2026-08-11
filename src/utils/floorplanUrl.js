import { API_URL } from '../config/api';

/** Resolve stored floorplan paths to a URL Three.js can load. */
export function resolveFloorplanUrl(url) {
    if (!url?.trim()) return '';

    const trimmed = url.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return trimmed;
    }

    if (trimmed.startsWith('/uploads')) {
        const assetHost = API_URL.replace(/\/api\/?$/, '');
        if (!assetHost) return trimmed;
        return `${assetHost}${trimmed}`;
    }

    return trimmed;
}

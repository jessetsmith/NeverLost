import axios from 'axios';
import { API_URL } from '../config/api';

export const LAYOUT_THUMBNAIL_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function isLayoutThumbnailFresh({
    thumbnailUrl,
    thumbnailUpdatedAt,
    layoutUpdatedAt,
} = {}) {
    if (!thumbnailUrl || !thumbnailUpdatedAt) {
        return false;
    }

    const thumbTime = new Date(thumbnailUpdatedAt).getTime();
    if (Number.isNaN(thumbTime)) {
        return false;
    }

    if (Date.now() - thumbTime > LAYOUT_THUMBNAIL_MAX_AGE_MS) {
        return false;
    }

    if (layoutUpdatedAt) {
        const layoutTime = new Date(layoutUpdatedAt).getTime();
        if (!Number.isNaN(layoutTime) && layoutTime > thumbTime) {
            return false;
        }
    }

    return true;
}

export function buildLayoutThumbnailSrc(thumbnailUrl, thumbnailUpdatedAt) {
    if (!thumbnailUrl) {
        return '';
    }

    const separator = thumbnailUrl.includes('?') ? '&' : '?';
    return `${thumbnailUrl}${separator}v=${encodeURIComponent(thumbnailUpdatedAt || '')}`;
}

export async function uploadLayoutThumbnailCapture(captureRef, layoutId, token) {
    if (!captureRef?.current?.capture || !layoutId || !token) {
        return null;
    }

    const imageData = await captureRef.current.capture();
    if (!imageData) {
        return null;
    }

    const response = await axios.post(
        `${API_URL}/layouts/${layoutId}/thumbnail`,
        { imageData },
        { headers: { Authorization: `Bearer ${token}` } },
    );

    return response.data;
}

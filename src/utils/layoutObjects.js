import { normalizeAssetUrl } from './assetUrls';

function normalizeProperties(properties) {
    if (!Array.isArray(properties)) return [];
    return properties
        .filter((entry) => entry && typeof entry === 'object')
        .map((entry) => ({
            key: String(entry.key ?? ''),
            value: String(entry.value ?? ''),
        }));
}

function normalizeLogEntries(log) {
    if (!Array.isArray(log)) return [];
    return log
        .filter((entry) => entry && typeof entry === 'object')
        .map((entry) => ({
            message: String(entry.message ?? '').trim(),
            createdAt: entry.createdAt || new Date().toISOString(),
        }))
        .filter((entry) => entry.message);
}

/** Convert API/Sanity object format to editor-friendly format. */
export function toEditorObject(obj) {
    const position = Array.isArray(obj.position)
        ? obj.position
        : [obj.position?.x ?? 0, obj.position?.y ?? 0.5, obj.position?.z ?? 0];

    const rotation = obj.rotation
        ? Array.isArray(obj.rotation)
            ? obj.rotation
            : [obj.rotation.x ?? 0, obj.rotation.y ?? 0, obj.rotation.z ?? 0]
        : [0, 0, 0];

    let size;
    if (obj.size) {
        size = obj.size;
    } else if (obj.scale) {
        size = obj.type === 'sphere'
            ? [obj.scale.x ?? 1]
            : [obj.scale.x ?? 1, obj.scale.y ?? 1, obj.scale.z ?? 1];
    } else {
        size = obj.type === 'sphere' ? [1] : [1, 1, 1];
    }

    return {
        id: obj.id,
        type: obj.type || 'cube',
        name: obj.name ?? '',
        assetUrl: obj.assetUrl ? normalizeAssetUrl(obj.assetUrl) : '',
        color: obj.color || '#708090',
        position,
        rotation,
        size,
        opacity: obj.opacity ?? 1,
        notes: obj.notes ?? '',
        properties: normalizeProperties(obj.properties),
        log: normalizeLogEntries(obj.log),
    };
}

/** Label for lists and badges — custom name or capitalized type. */
export function getObjectDisplayName(obj) {
    const trimmed = obj.name?.trim();
    if (trimmed) return trimmed;
    if (obj.type === 'asset') return 'Asset';
    const type = obj.type || 'object';
    return type.charAt(0).toUpperCase() + type.slice(1);
}

/** Default name when adding a new shape. */
export function defaultObjectName(type, existingObjects = []) {
    const count = existingObjects.filter((obj) => obj.type === type).length + 1;
    const label = type === 'asset' ? 'Asset' : type.charAt(0).toUpperCase() + type.slice(1);
    return `${label} ${count}`;
}

/** Convert editor object to API/Sanity serializable format (no mesh refs). */
export function toApiObject(obj) {
    const position = Array.isArray(obj.position)
        ? { x: obj.position[0], y: obj.position[1], z: obj.position[2] }
        : obj.position;

    const rotation = obj.rotation
        ? Array.isArray(obj.rotation)
            ? { x: obj.rotation[0], y: obj.rotation[1], z: obj.rotation[2] }
            : obj.rotation
        : { x: 0, y: 0, z: 0 };

    let scale;
    if (obj.size) {
        if (obj.type === 'sphere') {
            const diameter = obj.size[0];
            scale = { x: diameter, y: diameter, z: diameter };
        } else {
            scale = { x: obj.size[0], y: obj.size[1], z: obj.size[2] };
        }
    } else if (obj.scale) {
        scale = obj.scale;
    } else {
        scale = { x: 1, y: 1, z: 1 };
    }

    const apiObject = {
        id: String(obj.id),
        type: obj.type,
        name: obj.name?.trim() || '',
        color: obj.color,
        position,
        rotation,
        scale,
        opacity: obj.opacity ?? 1,
        notes: obj.notes?.trim() || '',
        properties: normalizeProperties(obj.properties)
            .filter((entry) => entry.key.trim() || entry.value.trim())
            .map((entry) => ({
                key: entry.key.trim(),
                value: entry.value.trim(),
            })),
        log: normalizeLogEntries(obj.log).map((entry) => ({
            message: entry.message,
            createdAt: entry.createdAt,
        })),
    };

    if (obj.type === 'asset' && obj.assetUrl?.trim()) {
        apiObject.assetUrl = normalizeAssetUrl(obj.assetUrl.trim());
    }

    return apiObject;
}

export function serializeObjectsForSave(objects) {
    return objects.map(toApiObject);
}

export function normalizeEditorObjects(objects) {
    return (objects || []).map(toEditorObject);
}

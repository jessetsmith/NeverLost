import * as THREE from 'three';
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

function normalizeSketchfabCredit(credit) {
    if (!credit || typeof credit !== 'object') return null;

    const modelName = credit.modelName?.trim();
    const authorName = credit.authorName?.trim();
    if (!modelName || !authorName) return null;

    return {
        modelName,
        modelUrl: credit.modelUrl?.trim() || '',
        authorName,
        authorUrl: credit.authorUrl?.trim() || '',
        licenseLabel: credit.licenseLabel?.trim() || '',
        licenseUrl: credit.licenseUrl?.trim() || '',
    };
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
        sketchfabCredit: normalizeSketchfabCredit(obj.sketchfabCredit),
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

    const credit = normalizeSketchfabCredit(obj.sketchfabCredit);
    if (credit) {
        apiObject.sketchfabCredit = credit;
    }

    return apiObject;
}

export function serializeObjectsForSave(objects) {
    return objects.map(toApiObject);
}

export function normalizeEditorObjects(objects) {
    return (objects || []).map(toEditorObject);
}

const MIN_SHAPE_DIMENSION = 0.1;

function clampDimension(value) {
    return Math.max(MIN_SHAPE_DIMENSION, parseFloat(Number(value).toFixed(2)));
}

function snapDimension(value, snap) {
    if (!snap || snap <= 0) return value;
    return Math.round(value / snap) * snap;
}

/** Resize a box from a single face; the opposite face stays fixed. */
export function applyEdgeResize(startSize, startPosition, rotation, axis, sign, delta, snap = 0) {
    const size = [...startSize];
    const position = [...startPosition];

    let nextDim = clampDimension(startSize[axis] + delta);
    if (snap > 0) {
        nextDim = clampDimension(snapDimension(nextDim, snap));
    }

    const effectiveDelta = nextDim - startSize[axis];
    size[axis] = nextDim;

    const axisVector = new THREE.Vector3(
        axis === 0 ? 1 : 0,
        axis === 1 ? 1 : 0,
        axis === 2 ? 1 : 0,
    );
    axisVector.applyEuler(new THREE.Euler(
        rotation[0] ?? 0,
        rotation[1] ?? 0,
        rotation[2] ?? 0,
        'XYZ',
    ));
    axisVector.multiplyScalar((effectiveDelta / 2) * sign);

    position[0] = parseFloat((startPosition[0] + axisVector.x).toFixed(2));
    position[1] = parseFloat((startPosition[1] + axisVector.y).toFixed(2));
    position[2] = parseFloat((startPosition[2] + axisVector.z).toFixed(2));

    return { size, position };
}

export function isBoxEdgeResizableType(type) {
    return type === 'cube' || type === 'rectangle';
}

/** Apply mesh scale gizmo drag to persisted object.size, then reset mesh.scale to 1. */
export function commitMeshScaleToSize(object, mesh) {
    const sx = mesh.scale.x;
    const sy = mesh.scale.y;
    const sz = mesh.scale.z;
    mesh.scale.set(1, 1, 1);

    if (object.type === 'sphere') {
        const factor = (sx + sy + sz) / 3;
        const diameter = object.size?.[0] ?? 1;
        return { size: [clampDimension(diameter * factor)] };
    }

    if (object.type === 'asset') {
        const factor = (sx + sy + sz) / 3;
        const base = object.size?.[0] ?? 1;
        const next = clampDimension(base * factor);
        return { size: [next, next, next] };
    }

    const size = object.size || [1, 1, 1];
    return {
        size: [
            clampDimension(size[0] * sx),
            clampDimension(size[1] * sy),
            clampDimension(size[2] * sz),
        ],
    };
}

/** Read editor object transform fields from a Three.js mesh after gizmo use. */
export function readObjectTransformFromMesh(object, mesh, transformMode) {
    const next = {
        position: [
            parseFloat(mesh.position.x.toFixed(2)),
            parseFloat(mesh.position.y.toFixed(2)),
            parseFloat(mesh.position.z.toFixed(2)),
        ],
        rotation: [
            parseFloat(mesh.rotation.x.toFixed(4)),
            parseFloat(mesh.rotation.y.toFixed(4)),
            parseFloat(mesh.rotation.z.toFixed(4)),
        ],
    };

    if (transformMode === 'scale') {
        Object.assign(next, commitMeshScaleToSize(object, mesh));
    }

    return next;
}

export function isBasicResizableType(type) {
    return type === 'cube' || type === 'rectangle' || type === 'sphere' || type === 'asset';
}

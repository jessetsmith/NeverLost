import { DEFAULT_ROOM_SHAPE, normalizeRoomShape, getRoomShapeLabel } from './roomShapes';

export const DEFAULT_LAYOUT_DIMENSIONS = {
    width: 10,
    depth: 10,
    height: 8,
    unit: 'ft',
    roomShape: 'rectangle',
    wallsEnabled: false,
    wallColor: '#6b5b8a',
    wallThickness: 0.2,
    floorplanUrl: '',
    floorplanVisible: true,
    floorplanOpacity: 0.85,
    floorplanRotation: 0,
    floorplanOffsetX: 0,
    floorplanOffsetZ: 0,
};

const LAYOUT_DIMENSION_KEYS = Object.keys(DEFAULT_LAYOUT_DIMENSIONS);
const MIN_FLOOR = 4;
const MAX_FLOOR = 200;
const MIN_HEIGHT = 4;
const MAX_HEIGHT = 100;

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

export function normalizeLayoutDimensions(raw) {
    if (!raw || typeof raw !== 'object') {
        return { ...DEFAULT_LAYOUT_DIMENSIONS };
    }

    const unit = raw.unit === 'm' ? 'm' : 'ft';
    const floorplanUrl = typeof raw.floorplanUrl === 'string' ? raw.floorplanUrl.trim() : '';

    return {
        width: clamp(Number(raw.width ?? DEFAULT_LAYOUT_DIMENSIONS.width), MIN_FLOOR, MAX_FLOOR),
        depth: clamp(Number(raw.depth ?? DEFAULT_LAYOUT_DIMENSIONS.depth), MIN_FLOOR, MAX_FLOOR),
        height: clamp(Number(raw.height ?? DEFAULT_LAYOUT_DIMENSIONS.height), MIN_HEIGHT, MAX_HEIGHT),
        unit,
        roomShape: normalizeRoomShape(raw.roomShape ?? DEFAULT_ROOM_SHAPE),
        wallsEnabled: typeof raw.wallsEnabled === 'boolean' ? raw.wallsEnabled : DEFAULT_LAYOUT_DIMENSIONS.wallsEnabled,
        wallColor: typeof raw.wallColor === 'string' && raw.wallColor ?
            raw.wallColor :
            DEFAULT_LAYOUT_DIMENSIONS.wallColor,
        wallThickness: clamp(
            Number(raw.wallThickness ?? DEFAULT_LAYOUT_DIMENSIONS.wallThickness),
            0.05,
            1,
        ),
        floorplanUrl,
        floorplanVisible: typeof raw.floorplanVisible === 'boolean'
            ? raw.floorplanVisible
            : DEFAULT_LAYOUT_DIMENSIONS.floorplanVisible,
        floorplanOpacity: clamp(
            Number(raw.floorplanOpacity ?? DEFAULT_LAYOUT_DIMENSIONS.floorplanOpacity),
            0.1,
            1,
        ),
        floorplanRotation: clamp(
            Number(raw.floorplanRotation ?? DEFAULT_LAYOUT_DIMENSIONS.floorplanRotation),
            -180,
            180,
        ),
        floorplanOffsetX: clamp(
            Number(raw.floorplanOffsetX ?? DEFAULT_LAYOUT_DIMENSIONS.floorplanOffsetX),
            -50,
            50,
        ),
        floorplanOffsetZ: clamp(
            Number(raw.floorplanOffsetZ ?? DEFAULT_LAYOUT_DIMENSIONS.floorplanOffsetZ),
            -50,
            50,
        ),
    };
}

export function serializeLayoutDimensions(dimensions) {
    const normalized = normalizeLayoutDimensions(dimensions);
    return LAYOUT_DIMENSION_KEYS.reduce((acc, key) => {
        acc[key] = normalized[key];
        return acc;
    }, {});
}

export function getLayoutHalfExtents(dimensions) {
    const d = normalizeLayoutDimensions(dimensions);
    return {
        halfX: d.width / 2,
        halfZ: d.depth / 2,
    };
}

export function getLayoutSpan(dimensions) {
    const d = normalizeLayoutDimensions(dimensions);
    return Math.max(d.width, d.depth, 10);
}

export function getEditorCameraPosition(dimensions) {
    const span = getLayoutSpan(dimensions);
    const dist = span * 1.4;
    return [dist, dist, dist];
}

export function formatDimensionsLabel(dimensions) {
    const d = normalizeLayoutDimensions(dimensions);
    const unitLabel = d.unit === 'm' ? 'm' : 'ft';
    const shapeLabel = d.roomShape !== DEFAULT_ROOM_SHAPE ? getRoomShapeLabel(d.roomShape) : null;
    const base = `${d.width} × ${d.depth} ${unitLabel} (${d.height} ${unitLabel} ceiling)`;
    const parts = [
        shapeLabel,
        base,
        d.wallsEnabled ? 'walls' : null,
        d.floorplanUrl ? (d.floorplanVisible ? 'floorplan' : 'floorplan hidden') : null,
    ].filter(Boolean);
    return parts.join(' · ');
}

function toPositionArray(position) {
    if (Array.isArray(position)) return position;
    return [position?.x ?? 0, position?.y ?? 0.5, position?.z ?? 0];
}

function toSizeArray(object) {
    if (object.size) {
        return Array.isArray(object.size) ? object.size : [object.size.x, object.size.y, object.size.z];
    }
    if (object.scale) {
        return object.type === 'sphere'
            ? [object.scale.x ?? 1]
            : [object.scale.x ?? 1, object.scale.y ?? 1, object.scale.z ?? 1];
    }
    return object.type === 'sphere' ? [1] : [1, 1, 1];
}

/** Rescale object positions and horizontal sizes when room width/depth change. */
export function rescaleLayoutObjects(objects, fromDimensions, toDimensions) {
    const from = normalizeLayoutDimensions(fromDimensions);
    const to = normalizeLayoutDimensions(toDimensions);
    const ratioX = from.width > 0 ? to.width / from.width : 1;
    const ratioZ = from.depth > 0 ? to.depth / from.depth : 1;

    if (Math.abs(ratioX - 1) < 0.0001 && Math.abs(ratioZ - 1) < 0.0001) {
        return objects;
    }

    return objects.map((object) => {
        const pos = toPositionArray(object.position);
        const size = toSizeArray(object);

        const newPosition = [
            parseFloat((pos[0] * ratioX).toFixed(2)),
            pos[1],
            parseFloat((pos[2] * ratioZ).toFixed(2)),
        ];

        let newSize;
        if (object.type === 'sphere') {
            const avgRatio = (ratioX + ratioZ) / 2;
            newSize = [parseFloat((size[0] * avgRatio).toFixed(2))];
        } else {
            newSize = [
                parseFloat((size[0] * ratioX).toFixed(2)),
                parseFloat((size[1] ?? size[0]).toFixed(2)),
                parseFloat(((size[2] ?? size[0]) * ratioZ).toFixed(2)),
            ];
        }

        return {
            ...object,
            position: newPosition,
            size: newSize,
        };
    });
}

export function dimensionsFloorSizeChanged(fromDimensions, toDimensions) {
    const from = normalizeLayoutDimensions(fromDimensions);
    const to = normalizeLayoutDimensions(toDimensions);
    return from.width !== to.width || from.depth !== to.depth;
}

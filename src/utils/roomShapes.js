/** Normalized floor outline points: x/z in [-0.5, 0.5] scaled by layout width/depth. */

export const DEFAULT_ROOM_SHAPE = 'rectangle';

function regularPolygon(sides, radiusX = 0.5, radiusZ = 0.5) {
    const points = [];
    for (let i = 0; i < sides; i += 1) {
        const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
        points.push([
            parseFloat((radiusX * Math.cos(angle)).toFixed(4)),
            parseFloat((radiusZ * Math.sin(angle)).toFixed(4)),
        ]);
    }
    return points;
}

export const ROOM_SHAPES = [
    {
        id: 'rectangle',
        label: 'Rectangle',
        description: 'Standard rectangular room',
        points: [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]],
    },
    {
        id: 'square',
        label: 'Square',
        description: 'Equal width and depth',
        lockAspect: true,
        points: [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]],
    },
    {
        id: 'l-ne',
        label: 'L-Shape — notch northeast',
        description: 'Full south and west wings; cutout at northeast corner',
        points: [[-0.5, -0.5], [0.5, -0.5], [0.5, 0], [0, 0], [0, 0.5], [-0.5, 0.5]],
    },
    {
        id: 'l-nw',
        label: 'L-Shape — notch northwest',
        description: 'Full south and east wings; cutout at northwest corner',
        points: [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [0, 0.5], [0, 0], [-0.5, 0]],
    },
    {
        id: 'l-se',
        label: 'L-Shape — notch southeast',
        description: 'Full north and west wings; cutout at southeast corner',
        points: [[-0.5, -0.5], [0, -0.5], [0, 0], [0.5, 0], [0.5, 0.5], [-0.5, 0.5]],
    },
    {
        id: 'l-sw',
        label: 'L-Shape — notch southwest',
        description: 'Full north and east wings; cutout at southwest corner',
        points: [[0, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5], [-0.5, 0], [0, 0]],
    },
    {
        id: 't-north',
        label: 'T-Shape',
        description: 'Wide bar across the north with a centered south stem',
        points: [
            [-0.5, 0.5], [0.5, 0.5], [0.5, 0], [0.15, 0], [0.15, -0.5],
            [-0.15, -0.5], [-0.15, 0], [-0.5, 0],
        ],
    },
    {
        id: 'u-north',
        label: 'U-Shape — open north',
        description: 'Three-sided room open to the north',
        points: [
            [-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [0.15, 0.5], [0.15, 0],
            [-0.15, 0], [-0.15, 0.5], [-0.5, 0.5],
        ],
    },
    {
        id: 'octagon',
        label: 'Octagon',
        description: 'Eight-sided room inscribed in the bounding box',
        points: regularPolygon(8),
    },
];

export const ROOM_SHAPE_IDS = ROOM_SHAPES.map((shape) => shape.id);

const shapeById = Object.fromEntries(ROOM_SHAPES.map((shape) => [shape.id, shape]));

export function getRoomShapePreset(shapeId) {
    return shapeById[shapeId] || shapeById[DEFAULT_ROOM_SHAPE];
}

export function normalizeRoomShape(shapeId) {
    return ROOM_SHAPE_IDS.includes(shapeId) ? shapeId : DEFAULT_ROOM_SHAPE;
}

export function isSquareLockedShape(shapeId) {
    return Boolean(getRoomShapePreset(shapeId).lockAspect);
}

/** World-space X/Z outline for Three.js (Y handled separately). */
export function getRoomOutlineWorldPoints(dimensions) {
    const width = Number(dimensions.width) || 10;
    const depth = Number(dimensions.depth) || 10;
    const preset = getRoomShapePreset(dimensions.roomShape);
    return preset.points.map(([nx, nz]) => [nx * width, nz * depth]);
}

export function getRoomShapeLabel(shapeId) {
    return getRoomShapePreset(shapeId).label;
}

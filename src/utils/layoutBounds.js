export const LAYOUT_SIZE = 10;
export const LAYOUT_HALF = LAYOUT_SIZE / 2;

/** World-space half-extents on X/Z for a Y-axis rotation (radians). */
export function getHorizontalExtents(size, rotationY) {
    const [w, , d] = size;
    const c = Math.abs(Math.cos(rotationY));
    const s = Math.abs(Math.sin(rotationY));
    return {
        halfX: (w / 2) * c + (d / 2) * s,
        halfZ: (w / 2) * s + (d / 2) * c,
    };
}

/** Pick Y rotation so the long horizontal edge runs parallel to the chosen wall. */
export function rotationYForWall(wall, size) {
    const [w, , d] = size;
    const longAlongLocalX = w >= d;
    const isNorthSouth = wall === 'north' || wall === 'south';
    if (isNorthSouth) {
        return longAlongLocalX ? 0 : Math.PI / 2;
    }
    return longAlongLocalX ? Math.PI / 2 : 0;
}

/** Rotate in 90° steps around Y (keeps position and X/Z tilt). */
export function rotateObjectY(object, quarterTurns = 1) {
    const rot = object.rotation || [0, 0, 0];
    const newY = rot[1] + (Math.PI / 2) * quarterTurns;
    return [
        rot[0],
        parseFloat(newY.toFixed(4)),
        rot[2],
    ];
}

/** Align a box shape flush to a layout boundary wall. */
export function orientObjectToWall(object, wall) {
    const size = object.size || [1, 1, 1];
    const rotationY = rotationYForWall(wall, size);
    const rotation = [0, rotationY, 0];
    const { halfX, halfZ } = getHorizontalExtents(size, rotationY);
    const [x, y, z] = object.position;

    let position;
    switch (wall) {
        case 'north':
            position = [x, y, LAYOUT_HALF - halfZ];
            break;
        case 'south':
            position = [x, y, -LAYOUT_HALF + halfZ];
            break;
        case 'east':
            position = [LAYOUT_HALF - halfX, y, z];
            break;
        case 'west':
            position = [-LAYOUT_HALF + halfX, y, z];
            break;
        default:
            position = [...object.position];
    }

    return {
        rotation,
        position: position.map((v) => parseFloat(v.toFixed(2))),
    };
}

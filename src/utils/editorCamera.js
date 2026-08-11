import * as THREE from 'three';
import { getLayoutHalfExtents, getLayoutSpan, normalizeLayoutDimensions } from './layoutDimensions';

export const EDITOR_CAMERA_VIEWS = [
    { id: 'overview', label: 'Overview', shortLabel: '3D' },
    { id: 'top', label: 'Top down', shortLabel: 'Top' },
    { id: 'north', label: 'North edge', shortLabel: 'N' },
    { id: 'south', label: 'South edge', shortLabel: 'S' },
    { id: 'east', label: 'East edge', shortLabel: 'E' },
    { id: 'west', label: 'West edge', shortLabel: 'W' },
];

function viewDistance(dimensions) {
    return getLayoutSpan(dimensions) * 1.35;
}

/** Camera position and orbit target for a named editor view. */
export function getEditorCameraView(viewId, dimensions) {
    const d = normalizeLayoutDimensions(dimensions);
    const dist = viewDistance(d);
    const { halfX, halfZ } = getLayoutHalfExtents(d);
    const eyeHeight = Math.max(d.height * 0.55, dist * 0.45);

    switch (viewId) {
        case 'top':
            return {
                position: [0, dist * 1.65, 0.001],
                target: [0, 0, 0],
            };
        case 'north':
            return {
                position: [0, eyeHeight, halfZ + dist],
                target: [0, 0, halfZ * 0.55],
            };
        case 'south':
            return {
                position: [0, eyeHeight, -halfZ - dist],
                target: [0, 0, -halfZ * 0.55],
            };
        case 'east':
            return {
                position: [halfX + dist, eyeHeight, 0],
                target: [halfX * 0.55, 0, 0],
            };
        case 'west':
            return {
                position: [-halfX - dist, eyeHeight, 0],
                target: [-halfX * 0.55, 0, 0],
            };
        case 'overview':
        default:
            return {
                position: [dist, dist * 0.9, dist],
                target: [0, 0, 0],
            };
    }
}

/** Camera framing for a world-space point (e.g. selected object). */
export function getEditorCameraFocus(position, dimensions) {
    const d = normalizeLayoutDimensions(dimensions);
    const dist = viewDistance(d) * 0.55;
    const x = Array.isArray(position) ? position[0] : position?.x ?? 0;
    const y = Array.isArray(position) ? position[1] : position?.y ?? 0.5;
    const z = Array.isArray(position) ? position[2] : position?.z ?? 0;
    const eyeHeight = Math.max(y + dist * 0.35, d.height * 0.25);

    return {
        position: [x + dist * 0.65, eyeHeight, z + dist * 0.65],
        target: [x, Math.max(y * 0.5, 0.25), z],
    };
}

export function getEditorOrbitLimits(dimensions) {
    const span = getLayoutSpan(normalizeLayoutDimensions(dimensions));
    return {
        minDistance: Math.max(span * 0.05, 0.5),
        maxDistance: Math.max(span * 30, 500),
    };
}

/** Max east-west / north-south pan (scene units) for camera fine-tuning sliders. */
export function getEditorCameraPanLimit(dimensions) {
    const span = getLayoutSpan(normalizeLayoutDimensions(dimensions));
    return Math.max(span * 0.35, 3);
}

export function captureEditorCameraState(controls) {
    if (!controls?.object) return null;
    return {
        position: controls.object.position.clone(),
        target: controls.target.clone(),
    };
}

/** Shift camera + target together on the floor plane (preserves viewing angle). */
export function applyEditorCameraPan(controls, panX, panZ, baseState) {
    if (!controls?.object || !baseState) return;

    controls.object.position.set(
        baseState.position.x + panX,
        baseState.position.y,
        baseState.position.z + panZ,
    );
    controls.target.set(
        baseState.target.x + panX,
        baseState.target.y,
        baseState.target.z + panZ,
    );
    controls.update();
}

/** Smoothly move orbit camera + target. */
export function flyCameraTo(controls, position, target, duration = 480, onComplete) {
    if (!controls?.object) return undefined;

    const camera = controls.object;
    const startPos = camera.position.clone();
    const endPos = new THREE.Vector3(position[0], position[1], position[2]);
    const startTarget = controls.target.clone();
    const endTarget = new THREE.Vector3(target[0], target[1], target[2]);
    const startTime = performance.now();

    const step = () => {
        const elapsed = performance.now() - startTime;
        const t = Math.min(1, elapsed / duration);
        const eased = 1 - (1 - t) ** 3;

        camera.position.lerpVectors(startPos, endPos, eased);
        controls.target.lerpVectors(startTarget, endTarget, eased);
        controls.update();

        if (t < 1) {
            return requestAnimationFrame(step);
        }
        onComplete?.();
        return undefined;
    };

    return requestAnimationFrame(step);
}

export function applyEditorCameraView(controls, viewId, dimensions) {
    const view = getEditorCameraView(viewId, dimensions);
    return flyCameraTo(controls, view.position, view.target);
}

export function applyEditorCameraFocus(controls, position, dimensions) {
    const view = getEditorCameraFocus(position, dimensions);
    return flyCameraTo(controls, view.position, view.target);
}

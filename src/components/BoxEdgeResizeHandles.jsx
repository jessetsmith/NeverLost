import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { applyEdgeResize } from '../utils/layoutObjects';

const FACES = [
    { axis: 0, sign: 1, color: '#ff7070' },
    { axis: 0, sign: -1, color: '#ff7070' },
    { axis: 1, sign: 1, color: '#70ff98' },
    { axis: 1, sign: -1, color: '#70ff98' },
    { axis: 2, sign: 1, color: '#70a8ff' },
    { axis: 2, sign: -1, color: '#70a8ff' },
];

const _worldPoint = new THREE.Vector3();
const _clipPoint = new THREE.Vector3();

function localFaceCenter(size, axis, sign) {
    const pad = 0.06;
    return [
        axis === 0 ? sign * (size[0] / 2 + pad) : 0,
        axis === 1 ? sign * (size[1] / 2 + pad) : 0,
        axis === 2 ? sign * (size[2] / 2 + pad) : 0,
    ];
}

function localHandleSize(size, axis) {
    const min = 0.4;
    if (axis === 0) return [0.12, Math.max(size[1] * 0.4, min), Math.max(size[2] * 0.4, min)];
    if (axis === 1) return [Math.max(size[0] * 0.4, min), 0.12, Math.max(size[2] * 0.4, min)];
    return [Math.max(size[0] * 0.4, min), Math.max(size[1] * 0.4, min), 0.12];
}

function readWorldTransform(object3d) {
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    object3d.updateWorldMatrix(true, false);
    object3d.getWorldPosition(position);
    object3d.getWorldQuaternion(quaternion);
    const rotation = new THREE.Euler().setFromQuaternion(quaternion, 'XYZ');
    return {
        position: [position.x, position.y, position.z],
        rotation: [rotation.x, rotation.y, rotation.z],
        quaternion,
    };
}

/** Project a world point to canvas pixel coordinates. */
function worldToPixel(world, camera, rect) {
    _clipPoint.copy(world).project(camera);
    return {
        x: (_clipPoint.x * 0.5 + 0.5) * rect.width,
        y: (-_clipPoint.y * 0.5 + 0.5) * rect.height,
    };
}

/** Build screen-space axis drag basis: dragging along screenAxis expands the face. */
function buildScreenAxisDrag(handleWorld, axisWorld, camera, rect) {
    _worldPoint.copy(handleWorld).add(axisWorld);
    const basePx = worldToPixel(handleWorld, camera, rect);
    const tipPx = worldToPixel(_worldPoint, camera, rect);
    const screenAxisX = tipPx.x - basePx.x;
    const screenAxisY = tipPx.y - basePx.y;
    const pixelsPerUnit = Math.hypot(screenAxisX, screenAxisY);

    if (pixelsPerUnit < 1e-4) {
        return { screenAxisX: 1, screenAxisY: 0, pixelsPerUnit: 1 };
    }

    return {
        screenAxisX: screenAxisX / pixelsPerUnit,
        screenAxisY: screenAxisY / pixelsPerUnit,
        pixelsPerUnit,
    };
}

function BoxEdgeResizeHandles({
    size,
    snap,
    onPreview,
    onCommit,
    onDragStart,
}) {
    const { camera, gl } = useThree();
    const dragRef = useRef(null);
    const pointerIdRef = useRef(null);
    const onPreviewRef = useRef(onPreview);
    const onCommitRef = useRef(onCommit);
    const onDragStartRef = useRef(onDragStart);

    onPreviewRef.current = onPreview;
    onCommitRef.current = onCommit;
    onDragStartRef.current = onDragStart;

    const dimensions = size || [1, 1, 1];

    const handles = useMemo(
        () => FACES.map((face) => ({
            ...face,
            position: localFaceCenter(dimensions, face.axis, face.sign),
            args: localHandleSize(dimensions, face.axis),
        })),
        [dimensions],
    );

    const endDrag = useCallback(() => {
        if (!dragRef.current) return;
        dragRef.current = null;

        if (pointerIdRef.current != null && gl.domElement.hasPointerCapture?.(pointerIdRef.current)) {
            gl.domElement.releasePointerCapture(pointerIdRef.current);
        }
        pointerIdRef.current = null;
        onCommitRef.current?.();
    }, [gl.domElement]);

    const applyDrag = useCallback((clientX, clientY) => {
        const drag = dragRef.current;
        if (!drag) return;

        const mouseDx = clientX - drag.startMouseX;
        const mouseDy = clientY - drag.startMouseY;
        const screenTravel = mouseDx * drag.screenAxisX + mouseDy * drag.screenAxisY;
        const delta = screenTravel / drag.pixelsPerUnit;

        const next = applyEdgeResize(
            drag.startSize,
            drag.startPosition,
            drag.startRotation,
            drag.axis,
            drag.sign,
            delta,
            snap,
        );
        onPreviewRef.current?.(next);
    }, [snap]);

    useEffect(() => {
        const onMove = (event) => {
            if (!dragRef.current) return;
            if (pointerIdRef.current != null && event.pointerId !== pointerIdRef.current) return;
            event.preventDefault();
            applyDrag(event.clientX, event.clientY);
        };

        const onUp = (event) => {
            if (!dragRef.current) return;
            if (pointerIdRef.current != null && event.pointerId !== pointerIdRef.current) return;
            endDrag();
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
        return () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onUp);
        };
    }, [applyDrag, endDrag]);

    const beginDrag = useCallback((event, axis, sign) => {
        event.stopPropagation();

        const host = event.object.parent?.parent;
        if (!host) return;

        const native = event.nativeEvent ?? event;
        const rect = gl.domElement.getBoundingClientRect();
        const world = readWorldTransform(host);

        const axisLocal = new THREE.Vector3(
            axis === 0 ? sign : 0,
            axis === 1 ? sign : 0,
            axis === 2 ? sign : 0,
        );
        const axisWorld = axisLocal.clone().applyQuaternion(world.quaternion).normalize();

        const faceLocal = new THREE.Vector3(...localFaceCenter(dimensions, axis, sign));
        faceLocal.applyQuaternion(world.quaternion);
        const handleWorld = new THREE.Vector3(
            world.position[0] + faceLocal.x,
            world.position[1] + faceLocal.y,
            world.position[2] + faceLocal.z,
        );

        const screenAxis = buildScreenAxisDrag(handleWorld, axisWorld, camera, rect);

        onDragStartRef.current?.();

        dragRef.current = {
            axis,
            sign,
            startSize: [...dimensions],
            startPosition: [...world.position],
            startRotation: [...world.rotation],
            startMouseX: native.clientX,
            startMouseY: native.clientY,
            screenAxisX: screenAxis.screenAxisX,
            screenAxisY: screenAxis.screenAxisY,
            pixelsPerUnit: screenAxis.pixelsPerUnit,
        };

        pointerIdRef.current = native.pointerId ?? null;
        if (pointerIdRef.current != null) {
            gl.domElement.setPointerCapture?.(pointerIdRef.current);
        }
    }, [camera, dimensions, gl.domElement]);

    return (
        <group>
            {handles.map((handle) => (
                <mesh
                    key={`${handle.axis}-${handle.sign}`}
                    position={handle.position}
                    renderOrder={2000}
                    onPointerDown={(event) => beginDrag(event, handle.axis, handle.sign)}
                >
                    <boxGeometry args={handle.args} />
                    <meshBasicMaterial
                        color={handle.color}
                        transparent
                        opacity={0.85}
                        depthTest={false}
                        depthWrite={false}
                        toneMapped={false}
                    />
                </mesh>
            ))}
        </group>
    );
}

export default BoxEdgeResizeHandles;

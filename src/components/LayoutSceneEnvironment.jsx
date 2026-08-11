import React, { useMemo, useLayoutEffect, useRef, Suspense } from 'react';
import * as THREE from 'three';
import { DEFAULT_SCENE_SETTINGS, normalizeSceneSettings } from '../utils/sceneSettings';
import {
    DEFAULT_LAYOUT_DIMENSIONS,
    getLayoutSpan,
    normalizeLayoutDimensions,
} from '../utils/layoutDimensions';
import { RoomFloor, FloorplanOverlay } from './RoomFloor';
import RoomWalls from './RoomWalls';
import { getRoomOutlineWorldPoints } from '../utils/roomShapes';

const GRID_CELL_SIZE = 0.5;
const GRID_Y = 0.04;
const BORDER_Y = 0.05;

export const CANVAS_BG = DEFAULT_SCENE_SETTINGS.backgroundColor;

function WorkspaceGrid({ width, depth, accentColor, cellColor }) {
    const gridRef = useRef();
    const gridSize = Math.max(width, depth);
    const divisions = Math.max(4, Math.round(gridSize / GRID_CELL_SIZE));

    useLayoutEffect(() => {
        const grid = gridRef.current;
        if (!grid) return;

        const materials = Array.isArray(grid.material) ? grid.material : [grid.material];
        materials.forEach((material) => {
            material.transparent = false;
            material.opacity = 1;
            material.depthWrite = false;
            material.depthTest = false;
        });
    }, [width, depth]);

    return (
        <gridHelper
            ref={gridRef}
            args={[gridSize, divisions, accentColor, cellColor]}
            position={[0, GRID_Y, 0]}
            renderOrder={10}
            frustumCulled={false}
        />
    );
}

function LayoutOutline({ outlinePoints, accentColor, y = BORDER_Y }) {
    const geometry = useMemo(() => {
        const points = outlinePoints.map(([x, z]) => new THREE.Vector3(x, y, z));
        return new THREE.BufferGeometry().setFromPoints(points);
    }, [outlinePoints, y]);

    return (
        <lineLoop geometry={geometry} renderOrder={11} frustumCulled={false}>
            <lineBasicMaterial
                color={accentColor}
                transparent={false}
                depthWrite={false}
                depthTest={false}
            />
        </lineLoop>
    );
}

export const LayoutSceneEnvironment = React.memo(function LayoutSceneEnvironment({
    showBorder = true,
    compact = false,
    settings,
    dimensions,
    lightColor,
    lightIntensity,
    ignoreRaycast = false,
}) {
    const scene = normalizeSceneSettings({
        ...(settings || {}),
        ...(lightColor !== undefined ? { lightColor } : {}),
        ...(lightIntensity !== undefined ? { lightIntensity } : {}),
    });
    const room = normalizeLayoutDimensions(dimensions || DEFAULT_LAYOUT_DIMENSIONS);
    const span = getLayoutSpan(room);
    const outlinePoints = useMemo(
        () => getRoomOutlineWorldPoints(room),
        [room.width, room.depth, room.roomShape],
    );
    const shadowExtent = span * 0.75;

    const gridCellColor = scene.groundColor;
    const showSceneBorder = showBorder && !compact;

    return (
        <>
            <color attach="background" args={[scene.backgroundColor]} />
            {scene.fogEnabled && !compact && (
                <fog attach="fog" args={[scene.backgroundColor, span * 1.8, span * 4]} />
            )}

            <hemisphereLight args={[scene.skyColor, scene.groundColor, 0.55]} />
            <ambientLight intensity={scene.ambientIntensity} />
            <directionalLight
                position={[span * 0.8, span * 1.4, span * 0.8]}
                intensity={scene.lightIntensity}
                color={scene.lightColor}
                castShadow={!compact}
                shadow-mapSize={compact ? undefined : [2048, 2048]}
                shadow-camera-far={span * 4}
                shadow-camera-left={-shadowExtent}
                shadow-camera-right={shadowExtent}
                shadow-camera-top={shadowExtent}
                shadow-camera-bottom={-shadowExtent}
            />
            <directionalLight
                position={[-span * 0.6, span * 0.6, -span * 0.4]}
                intensity={0.35}
                color={scene.fillLightColor}
            />
            <pointLight
                position={[0, room.height * 0.75, 0]}
                intensity={0.25}
                color={scene.accentColor}
                distance={span * 2}
            />

            <RoomFloor
                outlinePoints={outlinePoints}
                width={room.width}
                depth={room.depth}
                color={scene.groundColor}
                compact={compact}
                ignoreRaycast={ignoreRaycast}
            />

            {room.floorplanUrl && room.floorplanVisible && (
                <Suspense fallback={null}>
                    <FloorplanOverlay
                        url={room.floorplanUrl}
                        width={room.width}
                        depth={room.depth}
                        opacity={compact ? Math.min(room.floorplanOpacity, 0.7) : room.floorplanOpacity}
                        rotationDeg={room.floorplanRotation}
                        offsetX={room.floorplanOffsetX}
                        offsetZ={room.floorplanOffsetZ}
                        ignoreRaycast={ignoreRaycast}
                    />
                </Suspense>
            )}

            {room.wallsEnabled && !compact && (
                <RoomWalls
                    outlinePoints={outlinePoints}
                    height={room.height}
                    color={room.wallColor}
                    thickness={room.wallThickness}
                    compact={compact}
                    ignoreRaycast={ignoreRaycast}
                />
            )}

            {!compact && (
                <WorkspaceGrid
                    width={room.width}
                    depth={room.depth}
                    accentColor={scene.accentColor}
                    cellColor={gridCellColor}
                />
            )}
            {showSceneBorder && (
                <LayoutOutline
                    outlinePoints={outlinePoints}
                    accentColor={scene.accentColor}
                />
            )}
        </>
    );
});

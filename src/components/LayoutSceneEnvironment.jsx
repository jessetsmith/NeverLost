import React, { useMemo, useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import { DEFAULT_SCENE_SETTINGS, normalizeSceneSettings } from '../utils/sceneSettings';

const LAYOUT_SIZE = 10;
const GRID_DIVISIONS = 20;
const GRID_Y = 0.03;
const BORDER_Y = 0.035;

export const CANVAS_BG = DEFAULT_SCENE_SETTINGS.backgroundColor;

function WorkspaceGrid({ accentColor, cellColor }) {
    const gridRef = useRef();

    useLayoutEffect(() => {
        const grid = gridRef.current;
        if (!grid) return;

        const materials = Array.isArray(grid.material) ? grid.material : [grid.material];
        materials.forEach((material) => {
            material.transparent = false;
            material.opacity = 1;
            material.depthWrite = false;
            material.depthTest = true;
        });
    }, []);

    return (
        <gridHelper
            ref={gridRef}
            args={[LAYOUT_SIZE, GRID_DIVISIONS, accentColor, cellColor]}
            position={[0, GRID_Y, 0]}
            renderOrder={0}
            frustumCulled={false}
        />
    );
}

function LayoutBorder({ accentColor }) {
    const geometry = useMemo(() => {
        const half = LAYOUT_SIZE / 2;
        const points = [
            new THREE.Vector3(-half, BORDER_Y, -half),
            new THREE.Vector3(half, BORDER_Y, -half),
            new THREE.Vector3(half, BORDER_Y, half),
            new THREE.Vector3(-half, BORDER_Y, half),
        ];
        return new THREE.BufferGeometry().setFromPoints(points);
    }, []);

    return (
        <lineLoop geometry={geometry} renderOrder={0} frustumCulled={false}>
            <lineBasicMaterial
                color={accentColor}
                transparent={false}
                depthWrite={false}
                depthTest
            />
        </lineLoop>
    );
}

export const LayoutSceneEnvironment = React.memo(function LayoutSceneEnvironment({
    showBorder = true,
    compact = false,
    settings,
    lightColor,
    lightIntensity,
}) {
    const scene = normalizeSceneSettings({
        ...(settings || {}),
        ...(lightColor !== undefined ? { lightColor } : {}),
        ...(lightIntensity !== undefined ? { lightIntensity } : {}),
    });

    const gridCellColor = scene.groundColor;
    const showSceneBorder = showBorder && !compact;

    return (
        <>
            <color attach="background" args={[scene.backgroundColor]} />
            {scene.fogEnabled && !compact && (
                <fog attach="fog" args={[scene.backgroundColor, 18, 40]} />
            )}

            <hemisphereLight args={[scene.skyColor, scene.groundColor, 0.55]} />
            <ambientLight intensity={scene.ambientIntensity} />
            <directionalLight
                position={[8, 14, 8]}
                intensity={scene.lightIntensity}
                color={scene.lightColor}
                castShadow={!compact}
                shadow-mapSize={compact ? undefined : [2048, 2048]}
                shadow-camera-far={40}
                shadow-camera-left={-12}
                shadow-camera-right={12}
                shadow-camera-top={12}
                shadow-camera-bottom={-12}
            />
            <directionalLight
                position={[-6, 6, -4]}
                intensity={0.35}
                color={scene.fillLightColor}
            />
            <pointLight
                position={[0, 6, 0]}
                intensity={0.25}
                color={scene.accentColor}
                distance={20}
            />

            <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, -0.01, 0]}
                receiveShadow={!compact}
                renderOrder={0}
            >
                <planeGeometry args={[20, 20]} />
                <meshStandardMaterial
                    color={scene.groundColor}
                    roughness={0.9}
                    metalness={0.05}
                    depthWrite
                />
            </mesh>

            {!compact && (
                <WorkspaceGrid accentColor={scene.accentColor} cellColor={gridCellColor} />
            )}
            {showSceneBorder && <LayoutBorder accentColor={scene.accentColor} />}
        </>
    );
});

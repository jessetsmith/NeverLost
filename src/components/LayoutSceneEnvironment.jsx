import React, { useMemo, useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import { LAYOUT_SIZE } from '../utils/layoutBounds';

const CANVAS_BG = '#1a1035';
const GROUND_COLOR = '#3d2f6b';
const GRID_DIVISIONS = 20;
const GRID_Y = 0.03;
const BORDER_Y = 0.035;

/** Opaque-pass grid — drawn before shapes so depth never clips lines on the far side. */
function WorkspaceGrid() {
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
            args={[LAYOUT_SIZE, GRID_DIVISIONS, '#00f5d4', '#6b5b95']}
            position={[0, GRID_Y, 0]}
            renderOrder={0}
            frustumCulled={false}
        />
    );
}

function LayoutBorder() {
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
            <lineBasicMaterial color="#00f5d4" transparent={false} depthWrite={false} depthTest />
        </lineLoop>
    );
}

export const LayoutSceneEnvironment = React.memo(function LayoutSceneEnvironment({
    showBorder = true,
    compact = false,
    lightColor,
    lightIntensity,
}) {
    return (
        <>
            <color attach="background" args={[CANVAS_BG]} />
            {!compact && <fog attach="fog" args={[CANVAS_BG, 18, 40]} />}

            <hemisphereLight args={['#ddd6fe', GROUND_COLOR, compact ? 0.65 : 0.55]} />
            <ambientLight intensity={compact ? 0.55 : 0.45} />
            <directionalLight
                position={compact ? [4, 6, 5] : [8, 14, 8]}
                intensity={lightIntensity ?? (compact ? 1.25 : 1.4)}
                color={lightColor ?? '#ffffff'}
                castShadow={!compact}
                {...(compact ? {} : {
                    'shadow-mapSize': [2048, 2048],
                    'shadow-camera-far': 40,
                    'shadow-camera-left': -12,
                    'shadow-camera-right': 12,
                    'shadow-camera-top': 12,
                    'shadow-camera-bottom': -12,
                })}
            />
            <directionalLight position={[-4, 4, -3]} intensity={0.4} color="#c4b5fd" />
            <pointLight position={[0, 4, 0]} intensity={0.3} color="#00f5d4" distance={20} />

            {!compact && (
                <>
                    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow renderOrder={0}>
                        <planeGeometry args={[20, 20]} />
                        <meshStandardMaterial color={GROUND_COLOR} roughness={0.9} metalness={0.05} depthWrite />
                    </mesh>

                    <WorkspaceGrid />
                </>
            )}

            {showBorder && !compact && <LayoutBorder />}
        </>
    );
});

export { CANVAS_BG };

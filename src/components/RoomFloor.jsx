import React, { useLayoutEffect, useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three';
import * as THREE from 'three';
import { resolveFloorplanUrl } from '../utils/floorplanUrl';

/** Well above floor (y=0) and grid so depth never fights at shallow camera angles. */
const FLOORPLAN_Y = 0.2;

function buildFloorGeometry(outlinePoints, width, depth) {
    const shape = new THREE.Shape();
    outlinePoints.forEach(([x, z], index) => {
        if (index === 0) shape.moveTo(x, z);
        else shape.lineTo(x, z);
    });
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
}

export function RoomFloor({ outlinePoints, width, depth, color, compact, ignoreRaycast = false }) {
    const geometry = useMemo(
        () => buildFloorGeometry(outlinePoints, width, depth),
        [outlinePoints, width, depth],
    );

    return (
        <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0, 0]}
            receiveShadow={!compact}
            frustumCulled={false}
            renderOrder={0}
            geometry={geometry}
            raycast={ignoreRaycast ? () => null : undefined}
        >
            <meshStandardMaterial
                color={color}
                roughness={0.9}
                metalness={0.05}
            />
        </mesh>
    );
}

function configureTexture(texture) {
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
}

/** Rectangular floorplan plane — opaque pass only (no transparent sorting artifacts). */
export function FloorplanOverlay({
    url,
    width,
    depth,
    opacity,
    rotationDeg,
    offsetX,
    offsetZ,
    ignoreRaycast = false,
}) {
    const resolvedUrl = resolveFloorplanUrl(url);
    const texture = useLoader(TextureLoader, resolvedUrl, (loader) => {
        loader.setCrossOrigin('anonymous');
    });

    useLayoutEffect(() => {
        configureTexture(texture);
    }, [texture]);

    const rotationY = (rotationDeg * Math.PI) / 180;
    const tint = useMemo(() => {
        const level = THREE.MathUtils.clamp(opacity, 0.1, 1);
        return new THREE.Color(level, level, level);
    }, [opacity]);

    return (
        <mesh
            rotation={[-Math.PI / 2, rotationY, 0]}
            position={[offsetX, FLOORPLAN_Y, offsetZ]}
            frustumCulled={false}
            renderOrder={1}
            raycast={ignoreRaycast ? () => null : undefined}
        >
            <planeGeometry args={[width, depth]} />
            <meshBasicMaterial
                map={texture}
                color={tint}
                toneMapped={false}
                transparent={false}
                depthWrite
                depthTest
                side={THREE.DoubleSide}
            />
        </mesh>
    );
}

export default RoomFloor;

import React, { Suspense, useMemo, useRef, useEffect, useLayoutEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { getAssetLoadUrl } from '../utils/assetUrls';

function AssetPlaceholder({ position, rotation, scale = [1, 1, 1] }) {
    return (
        <mesh position={position} rotation={rotation} scale={scale}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#6b5b95" wireframe transparent opacity={0.55} depthWrite={false} />
        </mesh>
    );
}

function AssetModelInner({
    url,
    object,
    objectId,
    position,
    rotation,
    scale,
    opacity,
    isOpaque,
    renderOrder,
    onSelect,
    registerMesh,
}) {
    const groupRef = useRef();
    const loadUrl = getAssetLoadUrl(url);
    const { scene } = useGLTF(loadUrl);
    const model = useMemo(() => {
        const clone = scene.clone(true);
        clone.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        return clone;
    }, [scene]);

    useEffect(() => {
        if (groupRef.current) {
            registerMesh(objectId, groupRef.current);
        }
        return () => registerMesh(objectId, null);
    }, [objectId, registerMesh]);

    useLayoutEffect(() => {
        model.traverse((child) => {
            if (!child.isMesh || !child.material) return;
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            materials.forEach((material) => {
                material.transparent = !isOpaque;
                material.opacity = opacity;
                material.depthWrite = isOpaque;
                material.depthTest = true;
                material.needsUpdate = true;
            });
        });
    }, [model, opacity, isOpaque]);

    return (
        <group
            ref={groupRef}
            position={position}
            rotation={rotation}
            scale={scale}
            renderOrder={renderOrder}
        >
            <primitive
                object={model}
                onClick={(e) => {
                    e.stopPropagation();
                    onSelect(object);
                }}
            />
        </group>
    );
}

export function AssetModel({
    url,
    object,
    objectId,
    position,
    rotation,
    scale,
    opacity = 1,
    isOpaque = true,
    renderOrder = 1,
    onSelect,
    registerMesh,
}) {
    if (!url?.trim()) {
        return (
            <AssetPlaceholder position={position} rotation={rotation} scale={scale} />
        );
    }

    return (
        <Suspense fallback={<AssetPlaceholder position={position} rotation={rotation} scale={scale} />}>
            <AssetModelInner
                url={url.trim()}
                object={object}
                objectId={objectId}
                position={position}
                rotation={rotation}
                scale={scale}
                opacity={opacity}
                isOpaque={isOpaque}
                renderOrder={renderOrder}
                onSelect={onSelect}
                registerMesh={registerMesh}
            />
        </Suspense>
    );
}

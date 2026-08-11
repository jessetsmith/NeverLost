import React, { Suspense, useMemo, useRef, useEffect, useLayoutEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { getAssetLoadUrl, getAssetAuthHeaders } from '../utils/assetUrls';

function AssetPlaceholder({ position, rotation, scale = [1, 1, 1] }) {
    return (
        <mesh position={position} rotation={rotation} scale={scale}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#6b5b95" wireframe transparent opacity={0.55} depthWrite={false} />
        </mesh>
    );
}

class AssetLoadErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { failed: false };
    }

    static getDerivedStateFromError() {
        return { failed: true };
    }

    componentDidUpdate(prevProps) {
        if (prevProps.url !== this.props.url && this.state.failed) {
            this.setState({ failed: false });
        }
    }

    render() {
        if (this.state.failed) {
            return (
                <AssetPlaceholder
                    position={this.props.position}
                    rotation={this.props.rotation}
                    scale={this.props.scale}
                />
            );
        }

        return this.props.children;
    }
}

function AssetModelInner({
    url,
    loadUrl,
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
    const { scene } = useGLTF(
        loadUrl,
        undefined,
        undefined,
        (loader) => {
            const headers = getAssetAuthHeaders(url);
            if (Object.keys(headers).length > 0) {
                loader.setRequestHeader(headers);
            }
        },
    );
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
        if (!registerMesh) return undefined;
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
                onClick={onSelect ? (e) => {
                    e.stopPropagation();
                    onSelect(object);
                } : undefined}
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
    const trimmedUrl = url?.trim() || '';
    const loadUrl = getAssetLoadUrl(trimmedUrl);

    if (!trimmedUrl || !loadUrl) {
        return (
            <AssetPlaceholder position={position} rotation={rotation} scale={scale} />
        );
    }

    return (
        <AssetLoadErrorBoundary position={position} rotation={rotation} scale={scale} url={trimmedUrl}>
            <Suspense fallback={<AssetPlaceholder position={position} rotation={rotation} scale={scale} />}>
                <AssetModelInner
                    url={trimmedUrl}
                    loadUrl={loadUrl}
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
        </AssetLoadErrorBoundary>
    );
}

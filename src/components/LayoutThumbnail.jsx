import React, { Suspense, useMemo, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { LayoutSceneEnvironment } from './LayoutSceneEnvironment';
import { AssetModel } from './AssetModel';
import { normalizeEditorObjects } from '../utils/layoutObjects';
import { normalizeSceneSettings } from '../utils/sceneSettings';
import { normalizeLayoutDimensions, getLayoutSpan } from '../utils/layoutDimensions';
import { buildLayoutThumbnailSrc, isLayoutThumbnailFresh } from '../utils/layoutThumbnail';

function ThumbnailObject({ object }) {
    if (object.type === 'asset') {
        return (
            <AssetModel
                url={object.assetUrl}
                object={object}
                objectId={object.id}
                position={object.position}
                rotation={object.rotation || [0, 0, 0]}
                scale={object.size || [1, 1, 1]}
                opacity={1}
                isOpaque
                renderOrder={1}
            />
        );
    }

    const { type, position, rotation = [0, 0, 0], color, size } = object;

    const geometry = () => {
        switch (type) {
            case 'sphere':
                return <sphereGeometry args={[size[0] / 2, 16, 16]} />;
            case 'rectangle':
            case 'cube':
            default:
                return <boxGeometry args={size} />;
        }
    };

    return (
        <mesh position={position} rotation={rotation} castShadow receiveShadow>
            {geometry()}
            <meshStandardMaterial color={color} roughness={0.55} metalness={0.1} />
        </mesh>
    );
}

function ThumbnailScene({ objects, sceneSettings, layoutDimensions }) {
    const invalidate = useThree((state) => state.invalidate);

    useEffect(() => {
        invalidate();
        const retry = setTimeout(invalidate, 800);
        const retryLate = setTimeout(invalidate, 2500);
        return () => {
            clearTimeout(retry);
            clearTimeout(retryLate);
        };
    }, [objects, invalidate]);

    return (
        <>
            <LayoutSceneEnvironment showBorder settings={sceneSettings} dimensions={layoutDimensions} />
            {objects.map((object) => (
                <ThumbnailObject key={object.id} object={object} />
            ))}
            <OrbitControls
                enabled={false}
                enableZoom={false}
                enablePan={false}
                enableRotate={false}
                target={[0, 0, 0]}
            />
        </>
    );
}

const LayoutThumbnail = forwardRef(function LayoutThumbnail({
    objects = [],
    sceneSettings = null,
    layoutDimensions = null,
    thumbnailUrl = null,
    thumbnailUpdatedAt = null,
    layoutUpdatedAt = null,
    forceRender = false,
}, ref) {
    const normalized = useMemo(() => normalizeEditorObjects(objects), [objects]);
    const normalizedSceneSettings = useMemo(
        () => normalizeSceneSettings(sceneSettings),
        [sceneSettings],
    );
    const normalizedLayoutDimensions = useMemo(
        () => normalizeLayoutDimensions(layoutDimensions),
        [layoutDimensions],
    );
    const cameraPosition = useMemo(() => {
        const span = getLayoutSpan(normalizedLayoutDimensions);
        const dist = span * 0.9;
        return [dist, dist * 0.78, dist];
    }, [normalizedLayoutDimensions]);
    const [visible, setVisible] = React.useState(forceRender);
    const containerRef = React.useRef(null);

    useImperativeHandle(ref, () => ({
        capture: async () => {
            const canvas = containerRef.current?.querySelector('canvas');
            if (!canvas) {
                return null;
            }

            await new Promise((resolve) => {
                setTimeout(resolve, 3000);
            });

            try {
                return canvas.toDataURL('image/webp', 0.85);
            } catch {
                return canvas.toDataURL('image/png');
            }
        },
    }), []);

    useEffect(() => {
        if (forceRender) {
            setVisible(true);
            return undefined;
        }

        const element = containerRef.current;
        if (!element) return undefined;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisible(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '80px' }
        );

        observer.observe(element);
        return () => observer.disconnect();
    }, [forceRender]);

    const showStoredThumbnail = isLayoutThumbnailFresh({
        thumbnailUrl,
        thumbnailUpdatedAt,
        layoutUpdatedAt,
    });

    if (showStoredThumbnail) {
        return (
            <div ref={containerRef} className="layout-thumbnail">
                <img
                    src={buildLayoutThumbnailSrc(thumbnailUrl, thumbnailUpdatedAt)}
                    alt=""
                    loading="lazy"
                />
            </div>
        );
    }

    return (
        <div ref={containerRef} className="layout-thumbnail">
            {visible ? (
                <Canvas
                    shadows
                    dpr={[1, 1.5]}
                    frameloop="demand"
                    camera={{ position: cameraPosition, fov: 42 }}
                    gl={{ antialias: true, powerPreference: 'low-power', logarithmicDepthBuffer: true }}
                    onCreated={({ invalidate: inv }) => inv()}
                >
                    <Suspense fallback={null}>
                        <ThumbnailScene
                            objects={normalized}
                            sceneSettings={normalizedSceneSettings}
                            layoutDimensions={normalizedLayoutDimensions}
                        />
                    </Suspense>
                </Canvas>
            ) : (
                <div className="layout-thumbnail-skeleton" aria-hidden="true" />
            )}
        </div>
    );
});

export default LayoutThumbnail;

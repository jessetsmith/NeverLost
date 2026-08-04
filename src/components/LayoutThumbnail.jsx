import React, { Suspense, useMemo, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { LayoutSceneEnvironment } from './LayoutSceneEnvironment';
import { AssetModel } from './AssetModel';
import { normalizeEditorObjects } from '../utils/layoutObjects';

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

function ThumbnailScene({ objects }) {
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
            <LayoutSceneEnvironment showBorder lightIntensity={1.2} />
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

export default function LayoutThumbnail({ objects = [] }) {
    const normalized = useMemo(() => normalizeEditorObjects(objects), [objects]);
    const [visible, setVisible] = React.useState(false);
    const containerRef = React.useRef(null);

    useEffect(() => {
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
    }, []);

    return (
        <div ref={containerRef} className="layout-thumbnail">
            {visible ? (
                <Canvas
                    shadows
                    dpr={[1, 1.5]}
                    frameloop="demand"
                    camera={{ position: [9, 7, 9], fov: 42 }}
                    gl={{ antialias: true, powerPreference: 'low-power' }}
                    onCreated={({ invalidate: inv }) => inv()}
                >
                    <Suspense fallback={null}>
                        <ThumbnailScene objects={normalized} />
                    </Suspense>
                </Canvas>
            ) : (
                <div className="layout-thumbnail-skeleton" aria-hidden="true" />
            )}
        </div>
    );
}

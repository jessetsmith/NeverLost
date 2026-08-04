import React, { Suspense, useEffect, Component } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { LayoutSceneEnvironment } from './LayoutSceneEnvironment';
import { AssetModel } from './AssetModel';

function AssetThumbnailScene({ assetUrl }) {
    const invalidate = useThree((state) => state.invalidate);

    useEffect(() => {
        invalidate();
        const retry = setTimeout(invalidate, 800);
        const retryLate = setTimeout(invalidate, 2500);
        return () => {
            clearTimeout(retry);
            clearTimeout(retryLate);
        };
    }, [assetUrl, invalidate]);

    return (
        <>
            <LayoutSceneEnvironment showBorder={false} lightIntensity={1.2} />
            <AssetModel
                url={assetUrl}
                object={{ id: 'thumb', type: 'asset' }}
                objectId="thumb"
                position={[0, 0.5, 0]}
                rotation={[0, 0, 0]}
                scale={[1, 1, 1]}
                opacity={1}
                isOpaque
                renderOrder={1}
            />
            <OrbitControls
                enabled={false}
                enableZoom={false}
                enablePan={false}
                enableRotate={false}
                target={[0, 0.5, 0]}
            />
        </>
    );
}

class ThumbnailErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidUpdate(prevProps) {
        if (prevProps.assetUrl !== this.props.assetUrl) {
            this.setState({ hasError: false });
        }
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="asset-thumbnail asset-thumbnail-empty">
                    <span>3D</span>
                </div>
            );
        }
        return this.props.children;
    }
}

export default function AssetThumbnail({ assetUrl, className = '' }) {
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

    if (!assetUrl?.trim()) {
        return (
            <div className={`asset-thumbnail asset-thumbnail-empty ${className}`.trim()}>
                <span>3D</span>
            </div>
        );
    }

    return (
        <div ref={containerRef} className={`asset-thumbnail ${className}`.trim()}>
            {visible ? (
                <ThumbnailErrorBoundary assetUrl={assetUrl}>
                    <Canvas
                        shadows
                        dpr={[1, 1.5]}
                        frameloop="demand"
                        camera={{ position: [2.2, 1.6, 2.2], fov: 42 }}
                        gl={{ antialias: true, powerPreference: 'low-power' }}
                        onCreated={({ invalidate }) => invalidate()}
                    >
                        <Suspense fallback={null}>
                            <AssetThumbnailScene assetUrl={assetUrl} />
                        </Suspense>
                    </Canvas>
                </ThumbnailErrorBoundary>
            ) : (
                <div className="asset-thumbnail-skeleton" aria-hidden="true" />
            )}
        </div>
    );
}

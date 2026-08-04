import React, { Suspense, useEffect, Component } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Bounds, Center } from '@react-three/drei';
import { LayoutSceneEnvironment } from './LayoutSceneEnvironment';
import { AssetModel } from './AssetModel';

function ThumbnailInvalidate({ dependency }) {
    const invalidate = useThree((state) => state.invalidate);

    useEffect(() => {
        invalidate();
        const retries = [120, 450, 900, 1800, 2800].map((ms) => setTimeout(invalidate, ms));
        return () => retries.forEach(clearTimeout);
    }, [dependency, invalidate]);

    return null;
}

function AssetThumbnailScene({ assetUrl }) {
    return (
        <>
            <LayoutSceneEnvironment compact lightIntensity={1.35} />
            <ThumbnailInvalidate dependency={assetUrl} />
            <Bounds fit clip observe margin={1.15}>
                <Center>
                    <AssetModel
                        url={assetUrl}
                        object={{ id: 'thumb', type: 'asset' }}
                        objectId="thumb"
                        position={[0, 0, 0]}
                        rotation={[0, 0, 0]}
                        scale={[1, 1, 1]}
                        opacity={1}
                        isOpaque
                        renderOrder={1}
                    />
                </Center>
            </Bounds>
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
                        dpr={[1, 1.5]}
                        frameloop="demand"
                        camera={{ position: [0, 0, 4], fov: 38 }}
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

import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { LayoutSceneEnvironment } from './LayoutSceneEnvironment';
import { AssetModel } from './AssetModel';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useControls, LevaPanel, useCreateStore } from 'leva';
import Menu from './Menu';
import './LayoutView.css';
import axios from 'axios';
import { API_URL } from '../config/api';
import { normalizeEditorObjects, getObjectDisplayName } from '../utils/layoutObjects';

function LayoutViewScene({ objects, levaStore }) {
    const { lightColor, lightIntensity, wireframe } = useControls(
        {
            lightColor: '#ffffff',
            lightIntensity: { value: 1.0, min: 0, max: 5, step: 0.1 },
            wireframe: false,
        },
        { store: levaStore }
    );

    return (
        <>
            <LayoutSceneEnvironment
                lightColor={lightColor}
                lightIntensity={lightIntensity}
            />
            {objects.map((object) => (
                <ViewShape key={object.id} object={object} wireframe={wireframe} />
            ))}
            <OrbitControls makeDefault />
        </>
    );
}

function ViewShape({ object, wireframe }) {
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

    const geometryProps = () => {
        switch (type) {
            case 'sphere':
                return <sphereGeometry args={[size[0] / 2, 32, 32]} />;
            case 'rectangle':
            case 'cube':
            default:
                return <boxGeometry args={size} />;
        }
    };

    return (
        <mesh position={position} rotation={rotation} castShadow receiveShadow renderOrder={1}>
            {geometryProps()}
            <meshStandardMaterial
                color={color}
                wireframe={wireframe}
                roughness={0.55}
                metalness={0.1}
                transparent={false}
                opacity={1}
                depthWrite
                depthTest
            />
        </mesh>
    );
}

function LayoutView() {
    const { layoutId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const levaStore = useCreateStore();
    const [objects, setObjects] = useState(() =>
        normalizeEditorObjects(location.state?.objects || [])
    );

    useEffect(() => {
        if (location.state?.objects) {
            setObjects(normalizeEditorObjects(location.state.objects));
            return;
        }

        const fetchLayout = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await axios.get(`${API_URL}/layouts/${layoutId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setObjects(normalizeEditorObjects(response.data.objects));
            } catch (error) {
                console.error('Error fetching layout:', error);
            }
        };

        fetchLayout();
    }, [layoutId, location.state]);

    const handleEditClick = () => {
        navigate(`/layout/${layoutId}/edit`, { state: { objects } });
    };

    return (
        <div className="app-shell layout-view-container">
            <Menu />
            <div className="app-main">
                <header className="app-toolbar">
                    <div className="toolbar-title">Layout <span>View</span></div>
                    <div className="toolbar-actions">
                        <span className="object-count">{objects.length} object{objects.length !== 1 ? 's' : ''}</span>
                        <button className="btn btn-primary btn-sm" onClick={handleEditClick}>Edit Layout</button>
                    </div>
                </header>
                <div className="layout-view-body">
                    {objects.length > 0 && (
                        <aside className="layout-objects-panel">
                            <h3 className="panel-heading">Objects</h3>
                            <ul className="layout-object-list">
                                {objects.map((object) => (
                                    <li key={object.id}>
                                        <span className="layout-object-dot" style={{ background: object.color }} />
                                        <span className="layout-object-name">{getObjectDisplayName(object)}</span>
                                    </li>
                                ))}
                            </ul>
                        </aside>
                    )}
                    <div className="canvas-container">
                    <div className="canvas-leva-layer">
                        <div className="canvas-leva-panel">
                            <LevaPanel
                                store={levaStore}
                                titleBar={{ title: 'Scene' }}
                                fill
                            />
                        </div>
                    </div>
                    <Canvas
                        key={`view-${layoutId}`}
                        shadows
                        camera={{ position: [10, 10, 10], fov: 75 }}
                        gl={{ preserveDrawingBuffer: false, powerPreference: 'high-performance' }}
                    >
                        <LayoutViewScene objects={objects} levaStore={levaStore} />
                    </Canvas>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default LayoutView;

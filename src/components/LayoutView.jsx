import React, { useState, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { LayoutSceneEnvironment } from './LayoutSceneEnvironment';
import { AssetModel } from './AssetModel';
import ObjectDetailsModal from './ObjectDetailsModal';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useControls, LevaPanel, useCreateStore } from 'leva';
import Menu from './Menu';
import ShareLayoutModal from './ShareLayoutModal';
import ProfileAvatar from './ProfileAvatar';
import './LayoutView.css';
import './Social.css';
import './Profile.css';
import axios from 'axios';
import { API_URL } from '../config/api';
import { normalizeEditorObjects, serializeObjectsForSave, getObjectDisplayName } from '../utils/layoutObjects';

function LayoutViewScene({ objects, levaStore, onSelectObject, selectedObjectId }) {
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
                <ViewShape
                    key={object.id}
                    object={object}
                    wireframe={wireframe}
                    onSelect={onSelectObject}
                    isSelected={String(object.id) === String(selectedObjectId)}
                />
            ))}
            <OrbitControls makeDefault />
            <mesh
                onClick={(e) => {
                    e.stopPropagation();
                    onSelectObject(null);
                }}
                position={[0, -1000, 0]}
            >
                <planeGeometry args={[10000, 10000]} />
                <meshBasicMaterial transparent opacity={0} />
            </mesh>
        </>
    );
}

function ViewShape({ object, wireframe, onSelect, isSelected }) {
    const handleSelect = (e) => {
        e.stopPropagation();
        onSelect(object);
    };

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
                renderOrder={isSelected ? 2 : 1}
                onSelect={onSelect ? () => onSelect(object) : undefined}
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
        <mesh
            position={position}
            rotation={rotation}
            castShadow
            receiveShadow
            renderOrder={isSelected ? 2 : 1}
            onClick={handleSelect}
        >
            {geometryProps()}
            <meshStandardMaterial
                color={isSelected ? '#00f5d4' : color}
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
    const [layoutName, setLayoutName] = useState(location.state?.name || '');
    const [layoutRole, setLayoutRole] = useState(null);
    const [layoutOwner, setLayoutOwner] = useState(null);
    const [visibility, setVisibility] = useState('private');
    const [showShareModal, setShowShareModal] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [selectedObjectId, setSelectedObjectId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');

    const selectedObject = selectedObjectId
        ? objects.find((obj) => String(obj.id) === String(selectedObjectId)) ?? null
        : null;

    useEffect(() => {
        const fetchLayout = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await axios.get(`${API_URL}/layouts/${layoutId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setLayoutName(response.data.name || '');
                setLayoutRole(response.data.role || null);
                setLayoutOwner(response.data.owner || null);
                setVisibility(response.data.visibility || 'private');
                if (!location.state?.objects) {
                    setObjects(normalizeEditorObjects(response.data.objects));
                }
            } catch (error) {
                console.error('Error fetching layout:', error);
            }
        };

        if (location.state?.objects) {
            setObjects(normalizeEditorObjects(location.state.objects));
        }
        if (location.state?.name) {
            setLayoutName(location.state.name);
        }

        fetchLayout();
    }, [layoutId, location.state?.objects, location.state?.name]);

    const handleSelectObject = useCallback((object) => {
        setSaveError('');
        setSelectedObjectId(object ? object.id : null);
    }, []);

    const handleCloseModal = useCallback(() => {
        setSaveError('');
        setSelectedObjectId(null);
    }, []);

    const handleSaveObjectDetails = async ({ notes, properties, log }) => {
        if (!selectedObject || !canEdit) return;

        const updatedObjects = objects.map((obj) =>
            String(obj.id) === String(selectedObject.id)
                ? { ...obj, notes, properties, log }
                : obj
        );

        setSaving(true);
        setSaveError('');

        try {
            const token = localStorage.getItem('token');
            await axios.put(
                `${API_URL}/layouts/${layoutId}`,
                {
                    objects: serializeObjectsForSave(updatedObjects),
                    name: layoutName,
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setObjects(updatedObjects);
            handleCloseModal();
        } catch (error) {
            setSaveError(error.response?.data?.error || 'Failed to save object details.');
        } finally {
            setSaving(false);
        }
    };

    const handleEditClick = () => {
        navigate(`/layout/${layoutId}/edit`, {
            state: { objects, name: layoutName },
        });
    };

    const canEdit = layoutRole === 'owner' || layoutRole === 'editor';
    const isOwner = layoutRole === 'owner';

    const handlePublishToggle = async () => {
        if (!isOwner || publishing) return;

        setPublishing(true);
        try {
            const token = localStorage.getItem('token');
            const endpoint = visibility === 'published' ? 'unpublish' : 'publish';
            const response = await axios.put(
                `${API_URL}/layouts/${layoutId}/${endpoint}`,
                {},
                { headers: { Authorization: `Bearer ${token}` } },
            );
            setVisibility(response.data.visibility);
        } catch (error) {
            console.error('Error updating publish status:', error);
            setSaveError(error.response?.data?.error || 'Failed to update publish status.');
        } finally {
            setPublishing(false);
        }
    };

    const hasMetadata = (object) => {
        const notes = object.notes?.trim();
        const props = Array.isArray(object.properties)
            ? object.properties.filter((entry) => entry.key?.trim() || entry.value?.trim())
            : [];
        const logEntries = Array.isArray(object.log)
            ? object.log.filter((entry) => entry.message?.trim())
            : [];
        return Boolean(notes) || props.length > 0 || logEntries.length > 0;
    };

    return (
        <div className="app-shell layout-view-container">
            <Menu />
            <div className="app-main">
                <header className="app-toolbar">
                    <div className="toolbar-title">
                        {layoutName.trim() || 'Layout'}
                        {layoutRole && (
                            <span className={`layout-role-badge ${layoutRole}`}>
                                {layoutRole === 'viewer' ? 'Read-only' : layoutRole}
                            </span>
                        )}
                        {layoutRole !== 'owner' && layoutOwner?.userId && (
                            <Link to={`/profile/${layoutOwner.userId}`} className="layout-creator-link">
                                <ProfileAvatar
                                    username={layoutOwner.username}
                                    profileImageUrl={layoutOwner.profileImageUrl}
                                    size="sm"
                                />
                                by {layoutOwner.username}
                            </Link>
                        )}
                    </div>
                    <div className="toolbar-actions">
                        <span className="object-count">{objects.length} object{objects.length !== 1 ? 's' : ''}</span>
                        {isOwner && (
                            <>
                                <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => setShowShareModal(true)}
                                >
                                    Share
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    onClick={handlePublishToggle}
                                    disabled={publishing}
                                >
                                    {publishing ?
                                        'Updating…' :
                                        visibility === 'published' ?
                                            'Unpublish' :
                                            'Publish to gallery'}
                                </button>
                            </>
                        )}
                        {canEdit && (
                            <button className="btn btn-primary btn-sm" onClick={handleEditClick}>Edit Layout</button>
                        )}
                    </div>
                </header>
                <div className="layout-view-body">
                    {objects.length > 0 && (
                        <aside className="layout-objects-panel">
                            <h3 className="panel-heading">Objects</h3>
                            <p className="layout-objects-hint">Click an object to add notes, properties, and log entries.</p>
                            <ul className="layout-object-list">
                                {objects.map((object) => {
                                    const isSelected = String(object.id) === String(selectedObjectId);
                                    return (
                                        <li key={object.id}>
                                            <button
                                                type="button"
                                                className={`layout-object-item${isSelected ? ' selected' : ''}`}
                                                onClick={() => handleSelectObject(object)}
                                            >
                                                <span className="layout-object-dot" style={{ background: object.color }} />
                                                <span className="layout-object-name">{getObjectDisplayName(object)}</span>
                                                {hasMetadata(object) && (
                                                    <span className="layout-object-meta-badge" title="Has notes, properties, or log entries">
                                                        •
                                                    </span>
                                                )}
                                            </button>
                                        </li>
                                    );
                                })}
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
                        <LayoutViewScene
                            objects={objects}
                            levaStore={levaStore}
                            onSelectObject={handleSelectObject}
                            selectedObjectId={selectedObjectId}
                        />
                    </Canvas>
                    </div>
                </div>
            </div>

            <ObjectDetailsModal
                isOpen={Boolean(selectedObject)}
                object={selectedObject}
                onClose={handleCloseModal}
                onSave={handleSaveObjectDetails}
                saving={saving}
                saveError={saveError}
                readOnly={!canEdit}
            />

            <ShareLayoutModal
                isOpen={showShareModal}
                layoutId={layoutId}
                onClose={() => setShowShareModal(false)}
            />
        </div>
    );
}

export default LayoutView;

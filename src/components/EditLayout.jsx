import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, TransformControls } from '@react-three/drei';
import { LayoutSceneEnvironment } from './LayoutSceneEnvironment';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import Menu from './Menu';
import AssetLibraryModal from './AssetLibraryModal';
import ShareLayoutModal from './ShareLayoutModal';
import EditObjectPanel from './EditObjectPanel';
import './EditLayout.css';
import './Social.css';
import axios from 'axios';
import { API_URL } from '../config/api';
import { normalizeEditorObjects, serializeObjectsForSave, getObjectDisplayName, defaultObjectName } from '../utils/layoutObjects';
import { isValidAssetUrl, normalizeAssetUrl } from '../utils/assetUrls';
import { orientObjectToWall, rotateObjectY } from '../utils/layoutBounds';
import { AssetModel } from './AssetModel';
import SketchfabAssetCredit from './SketchfabAssetCredit';
import {
    setSketchfabTokens,
    getPendingSketchfabAction,
    clearPendingSketchfabAction,
} from '../utils/sketchfabAuth';

function EditLayout() {
    const { layoutId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const [objects, setObjects] = useState(() =>
        normalizeEditorObjects(location.state?.objects || [])
    );
    const [layoutName, setLayoutName] = useState(location.state?.name || '');
    const [shapeType, setShapeType] = useState('cube');
    const [selectedObject, setSelectedObject] = useState(null);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [transformMode, setTransformMode] = useState('translate');
    const [pendingAssetUrl, setPendingAssetUrl] = useState('');
    const [uploadingAsset, setUploadingAsset] = useState(false);
    const [assetError, setAssetError] = useState('');
    const [layoutError, setLayoutError] = useState('');
    const [layoutRole, setLayoutRole] = useState(null);
    const [showShareModal, setShowShareModal] = useState(false);
    const [showAssetLibraryModal, setShowAssetLibraryModal] = useState(false);
    const [assetLibraryInitialTab, setAssetLibraryInitialTab] = useState('import');

    const orbitControlsRef = useRef();
    const transformControlsRef = useRef();
    const replaceAssetInputRef = useRef();
    const convertAssetInputRef = useRef();

    useEffect(() => {
        const fetchLayout = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await axios.get(`${API_URL}/layouts/${layoutId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setLayoutName(response.data.name || '');
                setLayoutRole(response.data.role || null);
                if (response.data.role === 'viewer') {
                    navigate(`/layout/${layoutId}`, { replace: true });
                    return;
                }
                if (!location.state?.objects) {
                    setObjects(normalizeEditorObjects(response.data.objects));
                }
            } catch (error) {
                console.error('Error fetching layout:', error);
                if (error.response?.status === 403 || error.response?.status === 404) {
                    navigate(`/layout/${layoutId}`, { replace: true });
                }
            }
        };
        fetchLayout();
    }, [layoutId, location.state?.objects, navigate]);

    useEffect(() => {
        const code = searchParams.get('code');
        if (!code) return;

        const pending = getPendingSketchfabAction();
        if (pending?.type !== 'saveAsset' || pending.layoutId !== layoutId) return;

        const completeOAuthSave = async () => {
            try {
                const redirectUri = `${window.location.origin}${pending.returnPath || window.location.pathname}`;
                const exchange = await axios.post(
                    `${API_URL}/sketchfab/oauth/exchange`,
                    { code, redirectUri },
                    { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
                );
                setSketchfabTokens({
                    accessToken: exchange.data.accessToken,
                    refreshToken: exchange.data.refreshToken,
                });

                await axios.post(
                    `${API_URL}/sketchfab/save`,
                    {
                        modelUid: pending.model.uid,
                        modelName: pending.model.name,
                        sketchfabToken: exchange.data.accessToken,
                        thumbnailUrl: pending.model.thumbnailUrl,
                    },
                    { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
                );

                setAssetLibraryInitialTab('saved');
                setShowAssetLibraryModal(true);
                setAssetError('');
            } catch (error) {
                console.error('Sketchfab save after OAuth failed:', error);
                setAssetError(error.response?.data?.error || 'Failed to save Sketchfab model.');
            } finally {
                clearPendingSketchfabAction();
                searchParams.delete('code');
                searchParams.delete('state');
                setSearchParams(searchParams, { replace: true });
            }
        };

        completeOAuthSave();
    }, [searchParams, setSearchParams, layoutId]);

    const registerAssetInLibrary = async (assetUrl, name, source = 'url') => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(
                `${API_URL}/user-assets`,
                { assetUrl: normalizeAssetUrl(assetUrl), name, source },
                { headers: { Authorization: `Bearer ${token}` } }
            );
        } catch (error) {
            console.warn('Could not register asset in library:', error);
        }
    };

    const handleSaveClick = async () => {
        if (!layoutName.trim()) {
            setLayoutError('Layout name is required before saving.');
            return;
        }
        setLayoutError('');

        try {
            const token = localStorage.getItem('token');
            const serializedObjects = serializeObjectsForSave(objects);
            await axios.put(`${API_URL}/layouts/${layoutId}`, {
                objects: serializedObjects,
                name: layoutName.trim(),
            }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setShowSuccessMessage(true);
            setTimeout(() => setShowSuccessMessage(false), 3000);
            navigate(`/layout/${layoutId}`, {
                state: { objects: serializedObjects, name: layoutName.trim() },
            });
        } catch (error) {
            console.error('Error saving layout:', error);
            setLayoutError(error.response?.data?.error || 'Failed to save layout.');
        }
    };

    const handleEndEditing = () => {
        navigate(`/layout/${layoutId}`, {
            state: {
                objects: serializeObjectsForSave(objects),
                name: layoutName.trim(),
            },
        });
    };

    const uploadAssetFile = async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const token = localStorage.getItem('token');
        const response = await axios.post(`${API_URL}/assets/upload`, formData, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'multipart/form-data',
            },
        });
        if (response.data.userAsset) {
            // Saved to library via upload endpoint
        }
        return response.data;
    };

    const addAssetObject = (assetUrl, selectAfter = true, assetName = '', sketchfabCredit = null) => {
        const normalizedUrl = normalizeAssetUrl(assetUrl);
        const newShape = {
            id: Date.now(),
            type: 'asset',
            name: '',
            assetUrl: normalizedUrl,
            position: [0, 0.5, 0],
            rotation: [0, 0, 0],
            color: '#ffffff',
            opacity: 1,
            size: [1, 1, 1],
            notes: '',
            properties: [],
            log: [],
        };

        if (sketchfabCredit) {
            newShape.sketchfabCredit = sketchfabCredit;
        }

        setObjects((prev) => {
            newShape.name = assetName?.trim() || defaultObjectName('asset', prev);
            return [...prev, newShape];
        });
        if (selectAfter) setSelectedObject(newShape);
        setPendingAssetUrl('');
        setAssetError('');
        return newShape;
    };

    const handleAddFromLibrary = (asset) => {
        addAssetObject(asset.assetUrl, true, asset.name, asset.sketchfabCredit);
    };

    const addShape = () => {
        const newShape = {
            id: Date.now(),
            type: shapeType,
            name: defaultObjectName(shapeType, objects),
            position: [0, 0.5, 0],
            rotation: [0, 0, 0],
            color: '#708090',
            opacity: 1,
            size: shapeType === 'sphere' ? [1] : [1, 1, 1],
            notes: '',
            properties: [],
            log: [],
        };
        setObjects([...objects, newShape]);
    };

    const removeSelectedShape = (id) => {
        setObjects(objects.filter((obj) => String(obj.id) !== String(id)));
        setSelectedObject(null);
    };

    const duplicateSelectedShape = () => {
        if (!selectedObject) return;

        const duplicate = {
            id: Date.now(),
            type: selectedObject.type,
            name: selectedObject.name?.trim()
                ? `${selectedObject.name.trim()} (copy)`
                : defaultObjectName(selectedObject.type, objects),
            color: selectedObject.color,
            position: [
                selectedObject.position[0] + 1,
                selectedObject.position[1],
                selectedObject.position[2],
            ],
            rotation: [...(selectedObject.rotation || [0, 0, 0])],
            size: [...selectedObject.size],
            opacity: selectedObject.opacity ?? 1,
            assetUrl: selectedObject.assetUrl ?? '',
            sketchfabCredit: selectedObject.sketchfabCredit ?? null,
            notes: selectedObject.notes ?? '',
            properties: [...(selectedObject.properties || [])],
            log: [...(selectedObject.log || [])],
        };

        setObjects([...objects, duplicate]);
        setSelectedObject(duplicate);
    };

    const updateSelectedObject = (property, value) => {
        if (!selectedObject) return;

        setObjects((prev) =>
            prev.map((obj) =>
                String(obj.id) === String(selectedObject.id) ? { ...obj, [property]: value } : obj
            )
        );
    };

    const activeObject = selectedObject
        ? objects.find((obj) => String(obj.id) === String(selectedObject.id)) ?? null
        : null;

    const applyObjectPatch = (patch) => {
        if (!selectedObject) return;

        setObjects((prev) =>
            prev.map((obj) =>
                String(obj.id) === String(selectedObject.id) ? { ...obj, ...patch } : obj
            )
        );
    };

    const handleRotateQuarterTurn = () => {
        if (!activeObject) return;
        applyObjectPatch({ rotation: rotateObjectY(activeObject) });
    };

    const handleOrientToWall = (wall) => {
        if (!activeObject) return;
        applyObjectPatch(orientObjectToWall(activeObject, wall));
    };

    const formatUploadError = (error) => {
        const status = error.response?.status;
        const msg = error.response?.data?.error;
        if (status === 404) {
            return 'Upload route not found — restart the backend server (npm start).';
        }
        if (status === 401) {
            return 'Not logged in. Please log in and try again.';
        }
        return msg || error.message || 'Failed to upload asset.';
    };

    const handleNewAssetFile = async (file) => {
        if (!file) return;

        setUploadingAsset(true);
        setAssetError('');
        try {
            const data = await uploadAssetFile(file);
            const baseName = file.name.replace(/\.(glb|gltf)$/i, '');
            addAssetObject(data.url, true, baseName);
            setShowAssetLibraryModal(false);
        } catch (error) {
            setAssetError(formatUploadError(error));
        } finally {
            setUploadingAsset(false);
        }
    };

    const handleAddAssetFromUrl = async () => {
        if (!isValidAssetUrl(pendingAssetUrl)) {
            setAssetError('Paste a direct .glb/.gltf URL or a Google Drive share link.');
            return;
        }
        const normalized = normalizeAssetUrl(pendingAssetUrl);
        addAssetObject(normalized);
        await registerAssetInLibrary(normalized, 'Imported Asset', 'url');
        setShowAssetLibraryModal(false);
    };

    const handleReplaceAssetFile = async (event) => {
        const file = event.target.files?.[0];
        if (!file || !activeObject) return;

        setUploadingAsset(true);
        setAssetError('');
        try {
            const data = await uploadAssetFile(file);
            applyObjectPatch({ assetUrl: normalizeAssetUrl(data.url), type: 'asset' });
        } catch (error) {
            setAssetError(formatUploadError(error));
        } finally {
            setUploadingAsset(false);
            event.target.value = '';
        }
    };

    return (
        <div className="app-shell edit-layout-container">
            {showSuccessMessage && <div className="success-message">Layout saved successfully!</div>}
            <Menu />
            <div className="app-main">
                <header className="app-toolbar">
                    <div className="toolbar-title">
                        {layoutName.trim() || 'Layout'} <span>Edit</span>
                        {layoutRole && layoutRole !== 'owner' && (
                            <span className={`layout-role-badge ${layoutRole}`}>{layoutRole}</span>
                        )}
                    </div>
                    <div className="toolbar-actions">
                        {layoutRole === 'owner' && (
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => setShowShareModal(true)}
                            >
                                Share
                            </button>
                        )}
                        <button className="btn btn-secondary btn-sm" onClick={handleSaveClick}>Save Layout</button>
                        <button className="btn btn-directional btn-sm" onClick={handleEndEditing}>Exit</button>
                    </div>
                </header>
                <div className="edit-layout-body">
                    <aside className="side-panel">
                        <div className="side-panel-actions">
                            <button className="btn btn-secondary" onClick={handleSaveClick}>Save Layout</button>
                            <button className="btn btn-directional btn-sm" onClick={handleEndEditing}>Exit</button>
                        </div>
                        <div className="panel-section">
                            <h3 className="panel-heading">Layout</h3>
                            <div className="form-group">
                                <label htmlFor="layout-name">Name</label>
                                <input
                                    id="layout-name"
                                    type="text"
                                    value={layoutName}
                                    placeholder="My layout"
                                    onChange={(e) => {
                                        setLayoutName(e.target.value);
                                        setLayoutError('');
                                    }}
                                />
                                {layoutError && <p className="asset-error">{layoutError}</p>}
                            </div>
                        </div>
                        <div className="panel-section">
                            <h3 className="panel-heading">Add Basic Shape</h3>
                            <div className="form-group">
                                <label htmlFor="shape-select">Type</label>
                                <select
                                    id="shape-select"
                                    value={shapeType}
                                    onChange={(e) => setShapeType(e.target.value)}
                                >
                                    <option value="cube">Cube</option>
                                    <option value="sphere">Sphere</option>
                                    <option value="rectangle">Rectangle</option>
                                </select>
                            </div>
                            <button type="button" className="btn btn-secondary btn-sm" style={{ width: '100%' }} onClick={addShape}>
                                Add Basic Shape
                            </button>
                        </div>

                        <div className="panel-section">
                            <h3 className="panel-heading">Add Asset</h3>
                            <p className="panel-subhint">
                                Upload a file, paste a URL, or browse your library and Sketchfab.
                            </p>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ width: '100%' }}
                                onClick={() => {
                                    setAssetLibraryInitialTab('import');
                                    setShowAssetLibraryModal(true);
                                }}
                            >
                                Add Asset
                            </button>
                        </div>

                        <div className="panel-section">
                            <h3 className="panel-heading">In Scene ({objects.length})</h3>
                            {!activeObject && (
                                <p className="panel-hint">Click an object in the scene to edit it.</p>
                            )}
                            <ul className="shape-list">
                                {objects.map((object) => (
                                    <li
                                        key={object.id}
                                        className={activeObject && String(activeObject.id) === String(object.id) ? 'selected' : ''}
                                        onClick={() => setSelectedObject(object)}
                                    >
                                        <span className="shape-type-dot" style={{ background: object.color }} />
                                        <span className="shape-label-wrap">
                                            <span className="shape-label">{getObjectDisplayName(object)}</span>
                                            {object.name?.trim() && (
                                                <span className="shape-type-meta">{object.type}</span>
                                            )}
                                            {!object.name?.trim() && object.type === 'asset' && (
                                                <span className="shape-type-meta">asset</span>
                                            )}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </aside>
                    <div className="canvas-container">
                        {activeObject && (
                            <EditObjectPanel
                                object={activeObject}
                                objects={objects}
                                transformMode={transformMode}
                                onTransformModeChange={setTransformMode}
                                onUpdate={updateSelectedObject}
                                onRotateQuarterTurn={handleRotateQuarterTurn}
                                onOrientToWall={handleOrientToWall}
                                onDuplicate={duplicateSelectedShape}
                                onRemove={removeSelectedShape}
                                onDeselect={() => setSelectedObject(null)}
                                uploadingAsset={uploadingAsset}
                                assetError={assetError}
                                replaceAssetInputRef={replaceAssetInputRef}
                                convertAssetInputRef={convertAssetInputRef}
                                onReplaceAssetFile={handleReplaceAssetFile}
                            />
                        )}
                        <Canvas
                            key={`edit-${layoutId}`}
                            shadows
                            camera={{ position: [10, 10, 10], fov: 75 }}
                            gl={{ preserveDrawingBuffer: false, powerPreference: 'high-performance' }}
                        >
                            <Scene
                                objects={objects}
                                setObjects={setObjects}
                                selectedObject={selectedObject}
                                setSelectedObject={setSelectedObject}
                                orbitControlsRef={orbitControlsRef}
                                transformControlsRef={transformControlsRef}
                                transformMode={transformMode}
                            />
                        </Canvas>
                    </div>
                </div>
            </div>
            <AssetLibraryModal
                isOpen={showAssetLibraryModal}
                initialTab={assetLibraryInitialTab}
                onClose={() => {
                    setShowAssetLibraryModal(false);
                    setAssetLibraryInitialTab('import');
                    setAssetError('');
                }}
                layoutId={layoutId}
                onAddAsset={handleAddFromLibrary}
                onImportFile={handleNewAssetFile}
                onImportUrl={handleAddAssetFromUrl}
                uploading={uploadingAsset}
                importError={assetError}
                pendingUrl={pendingAssetUrl}
                onPendingUrlChange={(value) => {
                    setPendingAssetUrl(value);
                    setAssetError('');
                }}
            />
            <ShareLayoutModal
                isOpen={showShareModal}
                layoutId={layoutId}
                onClose={() => setShowShareModal(false)}
            />
        </div>
    );
}

function Scene({
    objects,
    setObjects,
    selectedObject,
    setSelectedObject,
    orbitControlsRef,
    transformControlsRef,
    transformMode,
}) {
    const meshRefs = useRef({});

    const registerMesh = useCallback((id, mesh) => {
        if (mesh) {
            meshRefs.current[id] = mesh;
        } else {
            delete meshRefs.current[id];
        }
    }, []);

    const handleObjectChange = useCallback(() => {
        if (!selectedObject) return;
        const mesh = meshRefs.current[selectedObject.id];
        if (!mesh) return;

        setObjects((prev) => {
            const updated = prev.map((obj) => {
                if (String(obj.id) !== String(selectedObject.id)) return obj;
                return {
                    ...obj,
                    position: [
                        parseFloat(mesh.position.x.toFixed(2)),
                        parseFloat(mesh.position.y.toFixed(2)),
                        parseFloat(mesh.position.z.toFixed(2)),
                    ],
                    rotation: [
                        parseFloat(mesh.rotation.x.toFixed(4)),
                        parseFloat(mesh.rotation.y.toFixed(4)),
                        parseFloat(mesh.rotation.z.toFixed(4)),
                    ],
                };
            });
            return updated;
        });
    }, [selectedObject, setObjects]);

    const selectedMesh = selectedObject ? meshRefs.current[selectedObject.id] ?? meshRefs.current[String(selectedObject.id)] : null;

    return (
        <>
            <LayoutSceneEnvironment />
            {objects.map((object) => (
                <Shape
                    key={object.id}
                    object={object}
                    onSelect={setSelectedObject}
                    registerMesh={registerMesh}
                />
            ))}
            <OrbitControls ref={orbitControlsRef} makeDefault enabled={!selectedObject} />
            {selectedMesh && (
                <TransformControls
                    ref={transformControlsRef}
                    object={selectedMesh}
                    mode={transformMode}
                    onMouseDown={() => {
                        if (orbitControlsRef.current) orbitControlsRef.current.enabled = false;
                    }}
                    onMouseUp={() => {
                        if (orbitControlsRef.current) orbitControlsRef.current.enabled = true;
                        handleObjectChange();
                    }}
                    onDragEnd={handleObjectChange}
                />
            )}
            <mesh
                onClick={(e) => {
                    e.stopPropagation();
                    setSelectedObject(null);
                }}
                position={[0, -1000, 0]}
            >
                <planeGeometry args={[10000, 10000]} />
                <meshBasicMaterial transparent opacity={0} />
            </mesh>
        </>
    );
}

function Shape({ object, onSelect, registerMesh }) {
    if (object.type === 'asset') {
        const rawOpacity = object.opacity ?? 1;
        const isOpaque = rawOpacity >= 0.995;
        const opacity = isOpaque ? 1 : rawOpacity;

        return (
            <>
                <AssetModel
                    url={object.assetUrl}
                    object={object}
                    objectId={object.id}
                    position={object.position}
                    rotation={object.rotation || [0, 0, 0]}
                    scale={object.size || [1, 1, 1]}
                    opacity={opacity}
                    isOpaque={isOpaque}
                    renderOrder={isOpaque ? 1 : 2}
                    onSelect={onSelect}
                    registerMesh={registerMesh}
                />
                {object.sketchfabCredit && (
                    <SketchfabAssetCredit
                        credit={object.sketchfabCredit}
                        position={object.position}
                        size={object.size || [1, 1, 1]}
                    />
                )}
            </>
        );
    }

    return (
        <PrimitiveShape object={object} onSelect={onSelect} registerMesh={registerMesh} />
    );
}

function PrimitiveShape({ object, onSelect, registerMesh }) {
    const meshRef = useRef();
    const { type, position, rotation = [0, 0, 0], color, size } = object;
    const rawOpacity = object.opacity ?? 1;
    const isOpaque = rawOpacity >= 0.995;
    const opacity = isOpaque ? 1 : rawOpacity;

    useEffect(() => {
        if (meshRef.current) {
            registerMesh(object.id, meshRef.current);
        }
        return () => registerMesh(object.id, null);
    }, [object.id, registerMesh]);

    useLayoutEffect(() => {
        const material = meshRef.current?.material;
        if (!material) return;
        material.color.set(color);
        material.opacity = opacity;
        material.transparent = !isOpaque;
        material.depthWrite = isOpaque;
        material.depthTest = true;
        material.needsUpdate = true;
    }, [color, opacity, isOpaque]);

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
            ref={meshRef}
            position={position}
            rotation={rotation}
            onClick={(e) => {
                e.stopPropagation();
                onSelect(object);
            }}
            castShadow
            receiveShadow
            renderOrder={isOpaque ? 1 : 2}
        >
            {geometryProps()}
            <meshStandardMaterial
                color={color}
                roughness={0.55}
                metalness={0.1}
                transparent={!isOpaque}
                opacity={opacity}
                depthWrite={isOpaque}
                depthTest
            />
        </mesh>
    );
}

export default EditLayout;
